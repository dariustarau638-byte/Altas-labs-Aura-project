import { ipcMain, shell } from 'electron';
import { config } from '../config.js';
import { buildSystemPrompt } from '../../shared/prompt.js';
import { getAiProvider } from '../../shared/settings.js';
import { getSettings } from '../services/settingsStore.js';
import { getSystemStats } from '../services/systemMonitor.js';
import * as ollama from '../services/ollama.js';
import {
  streamAnthropic,
  streamGemini,
  streamOpenAi,
  testCloudProvider,
} from '../services/cloudProviders.js';
import {
  captureDesktopScreen,
  connectGoogleService,
  disconnectGoogleService,
  fetchCalendarEvents,
  fetchGithubItems,
  fetchGmailMessages,
  readSystemClipboard,
  searchGoogleDrive,
  searchNotionPages,
  writeSystemClipboard,
} from '../services/connectors.js';
import {
  clearAllChatSessions,
  deleteChatSession,
  listSavedChats,
  saveChatSession,
} from '../services/chatHistoryStore.js';
import {
  approveAndExecuteDesktopPlan,
  createDesktopControlPlan,
  getCoPilotStatus,
  rejectDesktopPlan,
  startOrStopCursorCoPilot,
  stopCurrentDesktopExecution,
} from '../services/desktopAgent.js';
import {
  LOCAL_ACTIONS_CATALOG,
  executeLocalAction,
  runNaturalLanguageLocalAction,
} from '../services/localActions.js';
import {
  captureTimelineSnapshot,
  clearVisualTimeline,
  deleteTimelineSnapshot,
  searchVisualTimeline,
  setTimelineAutoRecord,
} from '../services/visualTimeline.js';

const chatControllers = new Map();
let pullController = null;

function getCloudKeyAndModel(providerId, aiSettings) {
  if (providerId === 'openai') {
    return {
      key: aiSettings.openaiKey?.trim(),
      model: aiSettings.openaiModel || 'gpt-4o-mini',
    };
  }
  if (providerId === 'anthropic') {
    return {
      key: aiSettings.anthropicKey?.trim(),
      model: aiSettings.anthropicModel || 'claude-sonnet-4-20250514',
    };
  }
  if (providerId === 'gemini') {
    return {
      key: aiSettings.geminiKey?.trim(),
      model: aiSettings.geminiModel || 'gemini-4-argon',
    };
  }
  return { key: '', model: '' };
}

function findFirstConfiguredCloudProvider(aiSettings) {
  for (const id of ['gemini', 'openai', 'anthropic']) {
    const { key, model } = getCloudKeyAndModel(id, aiSettings);
    if (key) return { provider: id, model };
  }
  return null;
}

function friendlyError(err, providerId = 'ollama') {
  const code = err?.cause?.code;
  if (providerId === 'ollama' && (code === 'ECONNREFUSED' || err?.message === 'fetch failed')) {
    return (
      `Cannot connect to Ollama (${config.ai.host}).\n` +
      'Start it using `ollama serve` or connect a Cloud provider (ChatGPT, Claude, or Gemini) in Dashboard → Connectors & Cloud to run without PC hardware load.'
    );
  }
  return err?.message ?? String(err);
}

export function registerAiIpc() {
  ipcMain.handle('ai:status', async () => {
    const settings = getSettings();
    const ai = settings.ai || {};
    const selectedProvider = ai.provider || 'ollama';

    if (selectedProvider !== 'ollama') {
      const { key, model } = getCloudKeyAndModel(selectedProvider, ai);
      const info = getAiProvider(selectedProvider);
      return {
        online: Boolean(key),
        provider: selectedProvider,
        providerLabel: info.shortLabel,
        isCloud: true,
        model,
        models: info.models.map((m) => (typeof m === 'string' ? m : m.id)),
      };
    }

    const status = await ollama.getStatus();
    if (!status.online && ai.autoFallbackToCloud) {
      const fallback = findFirstConfiguredCloudProvider(ai);
      if (fallback) {
        const info = getAiProvider(fallback.provider);
        return {
          online: true,
          provider: fallback.provider,
          providerLabel: `${info.shortLabel} (Auto)`,
          isCloud: true,
          fallbackActive: true,
          model: fallback.model,
          models: info.models.map((m) => (typeof m === 'string' ? m : m.id)),
        };
      }
    }

    return {
      ...status,
      provider: 'ollama',
      providerLabel: 'Local',
      isCloud: false,
      model: ollama.pickModel(status.models, ai.model),
    };
  });

  ipcMain.handle('ai:overview', async () => {
    const [detailed, system] = await Promise.all([
      ollama.getDetailedStatus(),
      getSystemStats(),
    ]);
    const ai = getSettings().ai || {};
    return {
      ...detailed,
      provider: ai.provider || config.ai.provider,
      activeModel: ollama.pickModel(detailed.models, ai.model),
      configuredModel: ai.model,
      system,
    };
  });

  ipcMain.handle('ai:test-provider', async (_event, providerId) => {
    const settings = getSettings();
    return testCloudProvider(providerId, settings.ai || {});
  });

  ipcMain.handle('ai:delete-model', async (_event, name) => {
    await ollama.deleteModel(name);
    return true;
  });

  ipcMain.handle('ai:unload-model', async (_event, name) => {
    await ollama.unloadModel(name);
    return true;
  });

  ipcMain.on('ai:pull-model', async (event, { name }) => {
    const wc = event.sender;
    const send = (channel, payload) => !wc.isDestroyed() && wc.send(channel, payload);

    pullController?.abort();
    const controller = new AbortController();
    pullController = controller;

    try {
      for await (const progress of ollama.pullModel(name, { signal: controller.signal })) {
        send('ai:pull-progress', { name, ...progress });
      }
      send('ai:pull-done', { name });
    } catch (err) {
      if (err?.name === 'AbortError') {
        send('ai:pull-done', { name, aborted: true });
      } else {
        send('ai:pull-error', { name, message: friendlyError(err, 'ollama') });
      }
    } finally {
      if (pullController === controller) pullController = null;
    }
  });

  ipcMain.on('ai:pull-abort', () => pullController?.abort());

  ipcMain.on('ai:chat', async (event, { requestId, model, messages }) => {
    const wc = event.sender;
    const send = (channel, payload) => !wc.isDestroyed() && wc.send(channel, payload);
    const controller = new AbortController();
    chatControllers.set(requestId, controller);

    const settings = getSettings();
    const ai = settings.ai || {};
    let activeProvider = ai.provider || 'ollama';

    try {
      const fullMessages = [{ role: 'system', content: buildSystemPrompt(settings) }, ...messages];
      const temperature = settings.assistant?.creativity ?? 0.7;

      // If Ollama is offline and autoFallbackToCloud is enabled, fall back to configured cloud
      if (activeProvider === 'ollama' && ai.autoFallbackToCloud) {
        const status = await ollama.getStatus();
        if (!status.online) {
          const fallback = findFirstConfiguredCloudProvider(ai);
          if (fallback) activeProvider = fallback.provider;
        }
      }

      let stream;
      if (activeProvider === 'openai') {
        stream = streamOpenAi({
          apiKey: ai.openaiKey?.trim(),
          model: ai.openaiModel || 'gpt-4o-mini',
          messages: fullMessages,
          temperature,
          signal: controller.signal,
        });
      } else if (activeProvider === 'anthropic') {
        stream = streamAnthropic({
          apiKey: ai.anthropicKey?.trim(),
          model: ai.anthropicModel || 'claude-sonnet-4-20250514',
          messages: fullMessages,
          temperature,
          signal: controller.signal,
        });
      } else if (activeProvider === 'gemini') {
        stream = streamGemini({
          apiKey: ai.geminiKey?.trim(),
          model: ai.geminiModel || 'gemini-4-argon',
          messages: fullMessages,
          temperature,
          signal: controller.signal,
        });
      } else {
        // For local Ollama, attach base64 image data if present
        const ollamaMessages = fullMessages.map((m) => {
          if (m.imageDataUrl) {
            const b64 = String(m.imageDataUrl).split(',')[1];
            return { role: m.role, content: m.content, ...(b64 ? { images: [b64] } : {}) };
          }
          return { role: m.role, content: m.content };
        });
        stream = ollama.streamChat({
          model: model || ai.model || config.ai.defaultModel,
          messages: ollamaMessages,
          options: { temperature },
          signal: controller.signal,
        });
      }

      for await (const delta of stream) {
        send('ai:chunk', { requestId, delta });
      }
      send('ai:done', { requestId });
    } catch (err) {
      if (err?.name === 'AbortError') send('ai:done', { requestId, aborted: true });
      else send('ai:error', { requestId, message: friendlyError(err, activeProvider) });
    } finally {
      chatControllers.delete(requestId);
    }
  });

  ipcMain.on('ai:abort', (_event, requestId) => chatControllers.get(requestId)?.abort());

  // --- Connectors: Google Workspace, Notion, GitHub, Vision & Clipboard ---
  ipcMain.handle('connectors:connect', async (_event, payload) => connectGoogleService(payload));
  ipcMain.handle('connectors:disconnect', async (_event, service) => disconnectGoogleService(service));
  ipcMain.handle('connectors:gmail-list', async (_event, options) => fetchGmailMessages(options));
  ipcMain.handle('connectors:gdrive-search', async (_event, options) => searchGoogleDrive(options));
  ipcMain.handle('connectors:calendar-list', async (_event, options) => fetchCalendarEvents(options));
  ipcMain.handle('connectors:notion-search', async (_event, options) => searchNotionPages(options));
  ipcMain.handle('connectors:github-list', async (_event, options) => fetchGithubItems(options));
  ipcMain.handle('connectors:capture-screen', async () => captureDesktopScreen());
  ipcMain.handle('connectors:read-clipboard', async () => readSystemClipboard());
  ipcMain.handle('connectors:write-clipboard', async (_event, text) => writeSystemClipboard(text));
  ipcMain.on('connectors:open-external', (_event, url) => {
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
      shell.openExternal(url);
    }
  });

  // --- Saved Chat History ---
  ipcMain.handle('chats:list', async () => listSavedChats());
  ipcMain.handle('chats:save', async (_event, payload) => saveChatSession(payload));
  ipcMain.handle('chats:delete', async (_event, sessionId) => deleteChatSession(sessionId));
  ipcMain.handle('chats:clear', async () => clearAllChatSessions());

  // --- Cursor Co-Pilot & Desktop Control ---
  ipcMain.handle('copilot:status', async () => getCoPilotStatus());
  ipcMain.handle('copilot:toggle', async (_event, enable) => startOrStopCursorCoPilot(enable));
  ipcMain.handle('copilot:plan', async (_event, instruction) => createDesktopControlPlan(instruction));
  ipcMain.handle('copilot:approve', async (_event, planId) => approveAndExecuteDesktopPlan(planId));
  ipcMain.handle('copilot:reject', async (_event, planId) => rejectDesktopPlan(planId));
  ipcMain.handle('copilot:stop', async () => stopCurrentDesktopExecution());

  // --- Local Automations (Local Actions) ---
  ipcMain.handle('actions:catalog', async () => LOCAL_ACTIONS_CATALOG);
  ipcMain.handle('actions:execute', async (_event, { actionId, params } = {}) =>
    executeLocalAction(actionId, params),
  );
  ipcMain.handle('actions:natural', async (_event, query) =>
    runNaturalLanguageLocalAction(query),
  );

  // --- Local SSD Visual Timeline ---
  ipcMain.handle('timeline:search', async (_event, query) => searchVisualTimeline(query));
  ipcMain.handle('timeline:capture', async (_event, options) => captureTimelineSnapshot(options));
  ipcMain.handle('timeline:delete', async (_event, snapshotId) => deleteTimelineSnapshot(snapshotId));
  ipcMain.handle('timeline:clear', async () => clearVisualTimeline());
  ipcMain.handle('timeline:set-auto', async (_event, enabled) => setTimelineAutoRecord(enabled));
}
