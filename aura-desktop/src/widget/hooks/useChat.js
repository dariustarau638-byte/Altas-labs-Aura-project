import { useCallback, useEffect, useRef, useState } from 'react';
import { aura, emitUpgradeAlert } from '../../lib/bridge.js';

const uid = () => crypto.randomUUID();
const SEARCH_COMMAND = /^\/(search|find)\s+(.+)$/i;
const SUMMARIZE_COMMAND = /^\/(summarize|read)\s+(.+)$/i;
const GMAIL_COMMAND = /^\/(gmail|email|mail)(?:\s+(.*))?$/i;
const GDRIVE_COMMAND = /^\/(drive|gdrive)(?:\s+(.*))?$/i;
const CALENDAR_COMMAND = /^\/(calendar|cal|agenda)(?:\s+(.*))?$/i;
const NOTION_COMMAND = /^\/(notion|notes)(?:\s+(.*))?$/i;
const GITHUB_COMMAND = /^\/(github|gh|git)(?:\s+(.*))?$/i;
const SCREEN_COMMAND = /^\/(screen|vision|capture)(?:\s+(.*))?$/i;
const CLIPBOARD_COMMAND = /^\/(clipboard|clip|paste)(?:\s+(.*))?$/i;
const MEMORY_COMMAND = /^\/(memory|remember)(?:\s+(.*))?$/i;
const CONTROL_COMMAND = /^\/(control|copilot|agent|desktop|mouse)(?:\s+(.*))?$/i;
const ACTIONS_COMMAND = /^\/(action|actions|pc|automation)(?:\s+(.*))?$/i;
const ROUTINE_COMMAND = /^\/(routine|routines)(?:\s+(.*))?$/i;
const TOOL_COMMAND = /^\/(tool|tools)(?:\s+(.*))?$/i;
const TIMELINE_COMMAND = /^\/(timeline|recall|where|history)(?:\s+(.*))?$/i;
const NATURAL_TIMELINE_QUERY =
  /(?:where did i see|show me.*(?:earlier|a minute ago|\d+\s*min|had open)|what was open)/i;

/**
 * Conversation state + streaming via IPC + external connectors, Vision (/screen),
 * Smart Clipboard (/clipboard), Long-term memory (/memory),
 * Desktop Control (/control), Local Automations (/action)
 * and Local SSD Visual Timeline (/timeline, /where).
 */
export function useChat(model, { onAssistantDone, autoSave = true, onAddMemoryFact, memoryFacts = [] } = {}) {
  const [sessionId, setSessionId] = useState(() => uid());
  const [messages, setMessages] = useState([]);
  const [streamingId, setStreamingId] = useState(null);
  const [savedChats, setSavedChats] = useState([]);

  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;
  const autoSaveRef = useRef(autoSave);
  autoSaveRef.current = autoSave;
  const doneCallbackRef = useRef(onAssistantDone);
  doneCallbackRef.current = onAssistantDone;

  const patch = (id, fn) =>
    setMessages((list) => list.map((m) => (m.id === id ? { ...m, ...fn(m) } : m)));

  const refreshSavedChats = useCallback(async () => {
    try {
      const list = await aura.chats.list();
      if (Array.isArray(list)) setSavedChats(list);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refreshSavedChats();
  }, [refreshSavedChats]);

  useEffect(() => {
    const offChunk = aura.ai.onChunk(({ requestId, delta }) =>
      patch(requestId, (m) => ({ content: m.content + delta })),
    );
    const offDone = aura.ai.onDone(({ requestId, aborted }) => {
      patch(requestId, () => ({ pending: false }));
      setStreamingId((id) => (id === requestId ? null : id));
      if (!aborted) {
        const finished = messagesRef.current.find((m) => m.id === requestId);
        if (finished?.content) {
          doneCallbackRef.current?.(finished);
        }
        if (autoSaveRef.current && messagesRef.current.length > 0) {
          aura.chats
            .save({
              id: sessionIdRef.current,
              messages: messagesRef.current,
            })
            .then((list) => {
              if (Array.isArray(list)) setSavedChats(list);
            })
            .catch(() => {});
        }
      }
    });
    const offError = aura.ai.onError(({ requestId, message }) => {
      patch(requestId, (m) => ({ content: m.content || message, error: true, pending: false }));
      setStreamingId((id) => (id === requestId ? null : id));
    });
    return () => {
      offChunk();
      offDone();
      offError();
    };
  }, []);

  /** Sends an external context block (Gmail, Drive, Calendar, Notion, GitHub, Clipboard) to AI. */
  const analyzeContext = useCallback(
    ({ userVisible, contextBlock, imageDataUrl, modelOverride }) => {
      if (streamingId) return;
      const promptForAi = contextBlock ? `${userVisible}\n\n${contextBlock}` : userVisible;
      const userMsg = {
        id: uid(),
        role: 'user',
        content: userVisible,
        ...(imageDataUrl ? { imageDataUrl } : {}),
      };
      const assistantId = uid();
      const history = [
        ...messagesRef.current
          .filter((m) => !m.error && !m.local && m.content)
          .map(({ role, content }) => ({ role, content })),
        {
          role: 'user',
          content: promptForAi,
          ...(imageDataUrl ? { imageDataUrl } : {}),
        },
      ];

      setMessages((list) => [
        ...list,
        userMsg,
        { id: assistantId, role: 'assistant', content: '', pending: true },
      ]);
      setStreamingId(assistantId);
      aura.ai.chat({ requestId: assistantId, model: modelOverride || model, messages: history });
    },
    [model, streamingId],
  );

  const runFileSearch = useCallback(async (userMsg, query) => {
    const id = uid();
    setMessages((list) => [
      ...list,
      userMsg,
      { id, role: 'assistant', content: '', pending: true, local: true },
    ]);
    try {
      const results = await aura.files.search(query);
      patch(id, () => ({
        pending: false,
        results,
        content: results.length
          ? `Found ${results.length} result${results.length === 1 ? '' : 's'} for "${query}":`
          : `No files found for "${query}" in authorized directories.`,
      }));
    } catch (err) {
      patch(id, () => ({ pending: false, error: true, content: err.message }));
    }
  }, []);

  const runGmailSearch = useCallback(async (userMsg, query = '') => {
    const id = uid();
    setMessages((list) => [
      ...list,
      userMsg,
      { id, role: 'assistant', content: '', pending: true, local: true },
    ]);
    try {
      const res = await aura.connectors.gmailList({ query, maxResults: 5 });
      const items = res.messages || [];
      patch(id, () => ({
        pending: false,
        gmailResults: items,
        content: items.length
          ? `📧 Gmail (${res.account}) — ${items.length} ${query ? `emails for "${query}"` : 'recent emails'}:`
          : `No emails found in Gmail ${query ? `for "${query}"` : ''}.`,
      }));
    } catch (err) {
      patch(id, () => ({ pending: false, error: true, content: err.message }));
    }
  }, []);

  const runGdriveSearch = useCallback(async (userMsg, query = '') => {
    const id = uid();
    setMessages((list) => [
      ...list,
      userMsg,
      { id, role: 'assistant', content: '', pending: true, local: true },
    ]);
    try {
      const res = await aura.connectors.gdriveSearch({ query, maxResults: 6 });
      const files = res.files || [];
      patch(id, () => ({
        pending: false,
        gdriveResults: files,
        content: files.length
          ? `☁️ Google Drive (${res.account}) — ${files.length} ${query ? `documents for "${query}"` : 'recent documents'}:`
          : `No documents found in Google Drive ${query ? `for "${query}"` : ''}.`,
      }));
    } catch (err) {
      patch(id, () => ({ pending: false, error: true, content: err.message }));
    }
  }, []);

  const runCalendarSearch = useCallback(async (userMsg, query = '') => {
    const id = uid();
    setMessages((list) => [
      ...list,
      userMsg,
      { id, role: 'assistant', content: '', pending: true, local: true },
    ]);
    try {
      const res = await aura.connectors.calendarList({ query });
      const events = res.events || [];
      patch(id, () => ({
        pending: false,
        calendarResults: events,
        content: events.length
          ? `📅 Google Calendar (${res.account}) — ${events.length} scheduled events:`
          : 'No upcoming events found in Google Calendar.',
      }));
    } catch (err) {
      patch(id, () => ({ pending: false, error: true, content: err.message }));
    }
  }, []);

  const runNotionSearch = useCallback(async (userMsg, query = '') => {
    const id = uid();
    setMessages((list) => [
      ...list,
      userMsg,
      { id, role: 'assistant', content: '', pending: true, local: true },
    ]);
    try {
      const res = await aura.connectors.notionSearch({ query });
      const pages = res.pages || [];
      patch(id, () => ({
        pending: false,
        notionResults: pages,
        content: pages.length
          ? `📓 Notion (${res.workspace}) — ${pages.length} pages found:`
          : 'No pages found in Notion.',
      }));
    } catch (err) {
      patch(id, () => ({ pending: false, error: true, content: err.message }));
    }
  }, []);

  const runGithubSearch = useCallback(async (userMsg, query = '') => {
    const id = uid();
    setMessages((list) => [
      ...list,
      userMsg,
      { id, role: 'assistant', content: '', pending: true, local: true },
    ]);
    try {
      const res = await aura.connectors.githubList({ query });
      const items = res.items || [];
      patch(id, () => ({
        pending: false,
        githubResults: items,
        content: items.length
          ? `🐙 GitHub (@${res.username}) — ${items.length} active items:`
          : 'No active items found in GitHub.',
      }));
    } catch (err) {
      patch(id, () => ({ pending: false, error: true, content: err.message }));
    }
  }, []);

  /** Screen Capture & Vision AI (`/screen [question]`) */
  const captureAndAnalyzeScreen = useCallback(
    async (customQuestion = '') => {
      if (streamingId) return;
      try {
        const tierRes = await aura.auth?.checkTier?.('screenVision').catch(() => null);
        if (tierRes && !tierRes.allowed) {
          emitUpgradeAlert({
            code: 'PRO_FEATURE_REQUIRED',
            feature: 'screenVision',
            error: 'Screen Vision requires an Aura Pro subscription. Upgrade to unlock visual screen intelligence.',
            tier: tierRes.tier || 'free',
            upgradeRequired: true,
          });
          return;
        }
        const shot = await aura.connectors.captureScreen();
        const question =
          customQuestion.trim() ||
          '📸 Analyze my screen capture: explain what is visible, summarize key elements, and report any errors or important details.';
        analyzeContext({
          userVisible: question,
          contextBlock: `Screen capture (${shot.name}, ${shot.width}x${shot.height}) captured at ${shot.timestamp}.`,
          imageDataUrl: shot.dataUrl || undefined,
        });
      } catch (err) {
        setMessages((list) => [
          ...list,
          { id: uid(), role: 'assistant', content: err.message, error: true, local: true },
        ]);
      }
    },
    [streamingId, analyzeContext],
  );

  /** Smart Clipboard Assistant (`/clipboard [action]`) */
  const inspectClipboard = useCallback(
    async (userMsg, customInstruction = '') => {
      if (streamingId) return;
      try {
        const clip = await aura.connectors.readClipboard();
        if (clip.isEmpty) {
          setMessages((list) => [
            ...list,
            userMsg,
            {
              id: uid(),
              role: 'assistant',
              content: '📋 Your clipboard is currently empty. Copy some text with Ctrl+C and try again!',
              local: true,
            },
          ]);
          return;
        }

        if (customInstruction.trim()) {
          analyzeContext({
            userVisible: `📋 ${customInstruction.trim()}`,
            contextBlock: `--- Clipboard Text ---\n${clip.text}`,
          });
          return;
        }

        setMessages((list) => [
          ...list,
          userMsg,
          {
            id: uid(),
            role: 'assistant',
            local: true,
            clipboardData: clip.text,
            content: `📋 Retrieved clipboard text (${clip.length} characters). What would you like me to do with it?`,
          },
        ]);
      } catch (err) {
        setMessages((list) => [
          ...list,
          userMsg,
          { id: uid(), role: 'assistant', content: err.message, error: true, local: true },
        ]);
      }
    },
    [streamingId, analyzeContext],
  );

  /** Reads a local file and sends its contents to the AI model. */
  const analyzeFile = useCallback(
    async (filePath, customInstruction) => {
      if (streamingId) return;
      try {
        const file = await aura.files.read(filePath);
        const userVisible =
          customInstruction || `📄 Summarize "${file.name}" and extract key highlights.`;
        analyzeContext({
          userVisible,
          contextBlock: `--- File: ${file.name} (${file.path}) ---\n${file.content}`,
        });
      } catch (err) {
        setMessages((list) => [
          ...list,
          { id: uid(), role: 'assistant', content: err.message, error: true, local: true },
        ]);
      }
    },
    [streamingId, analyzeContext],
  );

  /** Prepares and executes desktop actions in real time. */
  const planDesktopControl = useCallback(async (userMsg, rawInstruction = '', autoExecute = true) => {
    const id = uid();
    const instruction = rawInstruction.trim();
    if (!instruction) {
      setMessages((list) => [
        ...list,
        ...(userMsg ? [userMsg] : []),
        {
          id,
          role: 'assistant',
          local: true,
          content:
            '🖱️ Tell me what desktop task to perform. Examples:\n• "open Notepad and write a summary"\n• "search YouTube for lofi music"\n• "open Calculator"\n• "show desktop"\n• "click in the center of the screen"\n• "scroll down"',
        },
      ]);
      return;
    }
    setMessages((list) => [
      ...list,
      ...(userMsg ? [userMsg] : []),
      {
        id,
        role: 'assistant',
        content: `⚡ Aura is preparing the action for: "${instruction}"…`,
        pending: true,
        local: true,
      },
    ]);
    try {
      const plan = await aura.copilot.plan(instruction);
      if (autoExecute) {
        patch(id, () => ({
          pending: false,
          desktopPlan: { ...plan, status: 'executing' },
          content: `⚡ Aura is controlling your PC: executing "${plan.instruction}" (${plan.steps.length} steps)... (Press Esc to abort)`,
        }));
        const updatedPlan = await aura.copilot.approve(plan.id);
        const ok = updatedPlan.status === 'completed';
        const stopped = updatedPlan.status === 'rejected';
        patch(id, () => ({
          error: !ok && !stopped,
          desktopPlan: { ...updatedPlan, screenshotDataUrl: undefined },
          content: ok
            ? `✅ Done! Successfully executed "${updatedPlan.instruction}" (${updatedPlan.steps.length} steps).`
            : stopped
              ? '⏹️ Desktop control aborted. Cursor and keyboard released.'
              : `⚠️ Could not complete "${updatedPlan.instruction}": ${updatedPlan.error || 'unknown error'}`,
        }));
      } else {
        patch(id, () => ({
          pending: false,
          desktopPlan: plan,
          content: `🖱️ Plan prepared for: "${plan.instruction}". Click **Approve & Execute** to begin.`,
        }));
      }
    } catch (err) {
      patch(id, () => ({ pending: false, error: true, content: err.message }));
    }
  }, []);

  // Sync step state in real time
  useEffect(() => {
    const off = aura.copilot?.onStatus?.((status) => {
      const plans = status?.pendingPlans;
      if (!Array.isArray(plans) || !plans.length) return;
      const byId = new Map(plans.map((p) => [p.id, p]));
      setMessages((list) => {
        let changed = false;
        const next = list.map((m) => {
          const live = m.desktopPlan && byId.get(m.desktopPlan.id);
          if (!live) return m;
          const sameStatus = live.status === m.desktopPlan.status;
          const sameSteps = JSON.stringify(live.steps?.map((s) => s.status)) === JSON.stringify(m.desktopPlan.steps?.map((s) => s.status));
          if (sameStatus && sameSteps) return m;
          changed = true;
          return { ...m, desktopPlan: { ...m.desktopPlan, ...live, screenshotDataUrl: undefined } };
        });
        return changed ? next : list;
      });
    });
    return () => off?.();
  }, []);

  /** Approves and executes desktop control plan on Windows. */
  const approveDesktopPlan = useCallback(async (msgId, planId) => {
    patch(msgId, (m) => ({
      desktopPlan: m.desktopPlan ? { ...m.desktopPlan, status: 'executing' } : m.desktopPlan,
    }));
    try {
      const updatedPlan = await aura.copilot.approve(planId);
      const ok = updatedPlan.status === 'completed';
      const stopped = updatedPlan.status === 'rejected';
      patch(msgId, () => ({
        error: !ok && !stopped,
        desktopPlan: { ...updatedPlan, screenshotDataUrl: undefined },
        content: ok
          ? `✅ Done! Successfully executed "${updatedPlan.instruction}" (${updatedPlan.steps.length} steps).`
          : stopped
            ? '⏹️ Desktop control aborted. Cursor and keyboard released.'
            : `⚠️ Could not complete "${updatedPlan.instruction}": ${updatedPlan.error || 'unknown error'}`,
      }));
    } catch (err) {
      patch(msgId, (m) => ({
        error: true,
        content: `Error during desktop execution: ${err.message}`,
        desktopPlan: m.desktopPlan ? { ...m.desktopPlan, status: 'error', error: err.message } : m.desktopPlan,
      }));
    }
  }, []);

  /** Rejects desktop control plan. */
  const rejectDesktopPlan = useCallback(async (msgId, planId) => {
    try {
      const updatedPlan = await aura.copilot.reject(planId);
      patch(msgId, () => ({
        desktopPlan: updatedPlan ? { ...updatedPlan, screenshotDataUrl: undefined } : undefined,
        content: '❌ Plan rejected. Aura did not interact with your desktop.',
      }));
    } catch (err) {
      patch(msgId, () => ({ error: true, content: err.message }));
    }
  }, []);

  /** Immediately stops executing control (equivalent to Esc). */
  const stopDesktopControl = useCallback(() => {
    aura.copilot?.stop?.().catch?.(() => {});
  }, []);

  /** Local Automations (`/action [task]`) */
  const runLocalActionCommand = useCallback(async (userMsg, query = '') => {
    const id = uid();
    setMessages((list) => [
      ...list,
      ...(userMsg ? [userMsg] : []),
      { id, role: 'assistant', content: '', pending: true, local: true },
    ]);
    try {
      const res = await aura.actions.natural(query);
      patch(id, () => ({
        pending: false,
        content: res.summary || '✅ Local automation processed.',
        localActionsCatalog: res.showCatalog ? res.catalog : undefined,
      }));
    } catch (err) {
      patch(id, () => ({ pending: false, error: true, content: err.message }));
    }
  }, []);

  /** Runs local action directly from card button. */
  const executeQuickLocalAction = useCallback(async (actionId, title = '') => {
    const id = uid();
    setMessages((list) => [
      ...list,
      { id, role: 'assistant', content: `⚡ Executing "${title || actionId}"...`, pending: true, local: true },
    ]);
    try {
      const res = await aura.actions.execute(actionId);
      patch(id, () => ({
        pending: false,
        content: res.summary || `✅ Action "${title || actionId}" completed.`,
      }));
    } catch (err) {
      patch(id, () => ({ pending: false, error: true, content: err.message }));
    }
  }, []);

  /** Local SSD Visual Timeline (`/timeline` or natural language query) */
  const runTimelineSearch = useCallback(async (userMsg, query = '') => {
    const id = uid();
    setMessages((list) => [
      ...list,
      ...(userMsg ? [userMsg] : []),
      { id, role: 'assistant', content: '', pending: true, local: true },
    ]);
    try {
      const res = await aura.timeline.search(query);
      patch(id, () => ({
        pending: false,
        content: res.explanation,
        timelineResults: res.results || [],
      }));
    } catch (err) {
      patch(id, () => ({ pending: false, error: true, content: err.message }));
    }
  }, []);

  /** Instantly saves a snapshot into the local SSD Visual Timeline. */
  const captureMomentNow = useCallback(async () => {
    try {
      const snap = await aura.timeline.capture({ reason: 'manual' });
      const res = await aura.timeline.search('');
      setMessages((list) => [
        ...list,
        {
          id: uid(),
          role: 'assistant',
          local: true,
          content: `📸 Moment saved to SSD at ${snap.timeLabel} ("${snap.windowTitle}"). Here is your updated visual timeline:`,
          timelineResults: res.results || [snap],
        },
      ]);
    } catch (err) {
      setMessages((list) => [
        ...list,
        { id: uid(), role: 'assistant', content: err.message, error: true, local: true },
      ]);
    }
  }, []);

  const runRoutineCommand = useCallback(async (userMsg, query = '') => {
    const id = uid();
    setMessages((list) => [
      ...list,
      userMsg,
      { id, role: 'assistant', content: '⏳ Running Jarvis routine...', pending: true, local: true },
    ]);
    try {
      const routines = await aura.routines.list();
      const match = query
        ? routines.find((r) => r.id.toLowerCase().includes(query.toLowerCase()) || r.name.toLowerCase().includes(query.toLowerCase()))
        : routines[0];

      if (!match) {
        const available = routines.map((r) => `• /routine ${r.id} (${r.name})`).join('\n');
        patch(id, () => ({
          pending: false,
          content: `No routine matching "${query}". Available routines:\n${available}`,
        }));
        return;
      }

      const res = await aura.routines.run(match.id);
      patch(id, () => ({
        pending: false,
        content: `✅ Routine "${res.name}" completed successfully (${res.lastResult?.successfulSteps ?? 0} steps passed).`,
      }));
    } catch (err) {
      patch(id, () => ({ pending: false, error: true, content: err.message }));
    }
  }, []);

  const runToolCommand = useCallback(async (userMsg, toolId = '') => {
    const id = uid();
    setMessages((list) => [
      ...list,
      userMsg,
      { id, role: 'assistant', content: `⚡ Executing tool "${toolId}"...`, pending: true, local: true },
    ]);
    try {
      if (!toolId) {
        const tools = await aura.jarvis.tools();
        const top = tools.slice(0, 8).map((t) => `• /tool ${t.id} — ${t.name}`).join('\n');
        patch(id, () => ({
          pending: false,
          content: `Please specify a tool ID to run. Top system tools:\n${top}\n\nType \`/tool <id>\` or press Ctrl+/ to open the Spotlight Launcher.`,
        }));
        return;
      }
      const res = await aura.jarvis.executeTool(toolId);
      patch(id, () => ({
        pending: false,
        content: res.message || `✅ Executed "${res.toolName || toolId}".`,
      }));
    } catch (err) {
      patch(id, () => ({ pending: false, error: true, content: err.message }));
    }
  }, []);

  const send = useCallback(
    (text, { control = false, imageDataUrl = null } = {}) => {
      const trimmed = text.trim();
      if ((!trimmed && !imageDataUrl) || streamingId) return false;

      const userMsg = {
        id: uid(),
        role: 'user',
        content: trimmed,
        ...(imageDataUrl ? { imageDataUrl } : {}),
      };

      // 0a. Mouse Control active: any text without leading slash is a desktop instruction
      if (control && !trimmed.startsWith('/')) {
        userMsg.local = true;
        planDesktopControl(userMsg, trimmed);
        return true;
      }

      // 0b. /routine [name]
      const routineMatch = trimmed.match(ROUTINE_COMMAND);
      if (routineMatch) {
        userMsg.local = true;
        runRoutineCommand(userMsg, (routineMatch[2] || '').trim());
        return true;
      }

      // 0c. /tool [id]
      const toolMatch = trimmed.match(TOOL_COMMAND);
      if (toolMatch) {
        userMsg.local = true;
        runToolCommand(userMsg, (toolMatch[2] || '').trim());
        return true;
      }

      // 0d. /action [task] — Local Actions
      const actionMatch = trimmed.match(ACTIONS_COMMAND);
      if (actionMatch) {
        userMsg.local = true;
        runLocalActionCommand(userMsg, (actionMatch[2] || '').trim());
        return true;
      }

      // 0e. /timeline or /where [query] — SSD Visual Timeline
      const timelineMatch = trimmed.match(TIMELINE_COMMAND);
      if (timelineMatch) {
        userMsg.local = true;
        runTimelineSearch(userMsg, (timelineMatch[2] || '').trim());
        return true;
      }

      // 0d. Natural language detection for Visual Timeline
      if (!trimmed.startsWith('/') && NATURAL_TIMELINE_QUERY.test(trimmed)) {
        userMsg.local = true;
        runTimelineSearch(userMsg, trimmed);
        return true;
      }

      // 0e. /control <instruction> — Real-time Desktop Control
      const controlMatch = trimmed.match(CONTROL_COMMAND);
      if (controlMatch) {
        userMsg.local = true;
        planDesktopControl(userMsg, controlMatch[2] || '', true);
        return true;
      }

      // 1. /search <query>
      const search = trimmed.match(SEARCH_COMMAND);
      if (search) {
        userMsg.local = true;
        runFileSearch(userMsg, search[2]);
        return true;
      }

      // 2. /gmail [query]
      const gmailMatch = trimmed.match(GMAIL_COMMAND);
      if (gmailMatch) {
        userMsg.local = true;
        runGmailSearch(userMsg, (gmailMatch[2] || '').trim());
        return true;
      }

      // 3. /drive [query]
      const driveMatch = trimmed.match(GDRIVE_COMMAND);
      if (driveMatch) {
        userMsg.local = true;
        runGdriveSearch(userMsg, (driveMatch[2] || '').trim());
        return true;
      }

      // 4. /calendar [query]
      const calMatch = trimmed.match(CALENDAR_COMMAND);
      if (calMatch) {
        userMsg.local = true;
        runCalendarSearch(userMsg, (calMatch[2] || '').trim());
        return true;
      }

      // 5. /notion [query]
      const notionMatch = trimmed.match(NOTION_COMMAND);
      if (notionMatch) {
        userMsg.local = true;
        runNotionSearch(userMsg, (notionMatch[2] || '').trim());
        return true;
      }

      // 6. /github [query]
      const ghMatch = trimmed.match(GITHUB_COMMAND);
      if (ghMatch) {
        userMsg.local = true;
        runGithubSearch(userMsg, (ghMatch[2] || '').trim());
        return true;
      }

      // 7. /screen [question] — Vision AI
      const screenMatch = trimmed.match(SCREEN_COMMAND);
      if (screenMatch) {
        captureAndAnalyzeScreen(screenMatch[2] || '');
        return true;
      }

      // 8. /clipboard [action] — Smart Clipboard
      const clipMatch = trimmed.match(CLIPBOARD_COMMAND);
      if (clipMatch) {
        userMsg.local = true;
        inspectClipboard(userMsg, clipMatch[2] || '');
        return true;
      }

      // 9. /memory [fact] — Long-term memory
      const memMatch = trimmed.match(MEMORY_COMMAND);
      if (memMatch) {
        userMsg.local = true;
        const fact = (memMatch[2] || '').trim();
        if (fact) {
          onAddMemoryFact?.(fact);
          setMessages((list) => [
            ...list,
            userMsg,
            {
              id: uid(),
              role: 'assistant',
              local: true,
              content: `🧠 Stored in long-term memory: "${fact}". I will keep this in mind across future conversations.`,
            },
          ]);
        } else {
          const listStr = memoryFacts.length
            ? memoryFacts.map((f, i) => `${i + 1}. ${f}`).join('\n')
            : 'No facts saved in long-term memory yet.';
          setMessages((list) => [
            ...list,
            userMsg,
            {
              id: uid(),
              role: 'assistant',
              local: true,
              content: `🧠 Long-term memory active (${memoryFacts.length} items retained):\n${listStr}\n\nType \`/memory <fact>\` to add new context.`,
            },
          ]);
        }
        return true;
      }

      // 10. /summarize <filename>
      const summarize = trimmed.match(SUMMARIZE_COMMAND);
      if (summarize) {
        const query = summarize[2].trim();
        aura.files
          .search(query)
          .then((results) => {
            const firstTextFile = results.find((r) => !r.isDir);
            if (!firstTextFile) {
              setMessages((list) => [
                ...list,
                userMsg,
                {
                  id: uid(),
                  role: 'assistant',
                  content: `No files found matching "${query}".`,
                  error: true,
                  local: true,
                },
              ]);
              return;
            }
            analyzeFile(firstTextFile.path);
          })
          .catch((err) => {
            setMessages((list) => [
              ...list,
              userMsg,
              { id: uid(), role: 'assistant', content: err.message, error: true, local: true },
            ]);
          });
        return true;
      }

      // 11. Standard prompt
      const assistantId = uid();
      const history = [...messagesRef.current, userMsg]
        .filter((m) => !m.error && !m.local && m.content)
        .map(({ role, content, imageDataUrl }) => ({
          role,
          content,
          ...(imageDataUrl ? { imageDataUrl } : {}),
        }));

      setMessages((list) => [
        ...list,
        userMsg,
        { id: assistantId, role: 'assistant', content: '', pending: true },
      ]);
      setStreamingId(assistantId);
      aura.ai.chat({ requestId: assistantId, model, messages: history });
      return true;
    },
    [
      model,
      streamingId,
      runLocalActionCommand,
      runTimelineSearch,
      planDesktopControl,
      runFileSearch,
      runGmailSearch,
      runGdriveSearch,
      runCalendarSearch,
      runNotionSearch,
      runGithubSearch,
      captureAndAnalyzeScreen,
      inspectClipboard,
      analyzeFile,
      onAddMemoryFact,
      memoryFacts,
    ],
  );

  const stop = useCallback(() => streamingId && aura.ai.abort(streamingId), [streamingId]);

  const clear = useCallback(() => {
    if (streamingId) return;
    setSessionId(uid());
    setMessages([]);
  }, [streamingId]);

  const loadSession = useCallback(
    (session) => {
      if (streamingId || !session) return;
      setSessionId(session.id);
      setMessages(Array.isArray(session.messages) ? session.messages : []);
    },
    [streamingId],
  );

  const deleteSession = useCallback(async (idToDelete) => {
    try {
      const updated = await aura.chats.delete(idToDelete);
      if (Array.isArray(updated)) setSavedChats(updated);
    } catch {
      // ignore
    }
  }, []);

  return {
    sessionId,
    messages,
    savedChats,
    streaming: Boolean(streamingId),
    send,
    analyzeFile,
    analyzeContext,
    captureAndAnalyzeScreen,
    runLocalActionCommand,
    executeQuickLocalAction,
    runTimelineSearch,
    captureMomentNow,
    planDesktopControl,
    approveDesktopPlan,
    rejectDesktopPlan,
    stopDesktopControl,
    loadSession,
    deleteSession,
    stop,
    clear,
  };
}
