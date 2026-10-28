import {
  DEFAULT_SETTINGS,
  MASTER_LICENSE_KEY,
  deepMerge,
  getPersonality,
  getPlan,
  sanitizeSettings,
} from '../../shared/settings.js';

/**
 * Bridge to the main process. In Electron, this is provided by the preload script (`window.aura`).
 * In browser preview mode, a mock bridge backed by localStorage + BroadcastChannel is used
 * so the UI and synchronization between Widget and Dashboard can be tested in isolation.
 */
const STORAGE_KEY = 'aura:settings';

function createMockBridge() {
  const channels = {
    chunk: new Set(),
    done: new Set(),
    error: new Set(),
    toggle: new Set(),
    settings: new Set(),
    pullProgress: new Set(),
    pullDone: new Set(),
    pullError: new Set(),
  };
  const subscribe = (set) => (cb) => {
    set.add(cb);
    return () => set.delete(cb);
  };
  const emit = (set, payload) => set.forEach((cb) => cb(payload));

  const readStored = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return sanitizeSettings(raw ? deepMerge(DEFAULT_SETTINGS, JSON.parse(raw)) : DEFAULT_SETTINGS);
    } catch {
      return sanitizeSettings(DEFAULT_SETTINGS);
    }
  };

  let currentSettings = readStored();
  let mockRoots = ['C:\\Users\\Demo\\Documents', 'C:\\Users\\Demo\\Desktop', 'C:\\Users\\Demo\\Downloads'];
  let mockModels = [
    {
      name: 'llama3.2:3b',
      sizeBytes: 2.0 * 1024 ** 3,
      modifiedAt: new Date().toISOString(),
      family: 'llama',
      parameterSize: '3.2B',
      quantization: 'Q4_K_M',
    },
    {
      name: 'qwen2.5-coder:7b',
      sizeBytes: 4.7 * 1024 ** 3,
      modifiedAt: new Date().toISOString(),
      family: 'qwen2',
      parameterSize: '7.6B',
      quantization: 'Q4_K_M',
    },
  ];
  let mockRunning = [
    {
      name: 'llama3.2:3b',
      sizeBytes: 2.3 * 1024 ** 3,
      sizeVramBytes: 2.3 * 1024 ** 3,
      expiresAt: new Date(Date.now() + 4 * 60_000).toISOString(),
      parameterSize: '3.2B',
      quantization: 'Q4_K_M',
    },
  ];
  let pullTimer = null;

  const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(STORAGE_KEY) : null;
  if (bc) {
    bc.onmessage = (e) => {
      currentSettings = sanitizeSettings(e.data);
      emit(channels.settings, currentSettings);
    };
  }

  const persistMock = (next) => {
    currentSettings = sanitizeSettings(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentSettings));
    } catch {}
    bc?.postMessage(currentSettings);
    emit(channels.settings, currentSettings);
    return currentSettings;
  };

  const getMockIndexStats = () => ({
    lastIndexedAt: Date.now(),
    indexing: false,
    totalFiles: 148,
    totalDirs: 24,
    textFilesIndexed: 62,
    totalBytes: 48 * 1024 * 1024,
    roots: currentSettings.privacy?.allowedRoots?.length
      ? currentSettings.privacy.allowedRoots
      : mockRoots,
    defaultRoots: mockRoots,
  });

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.code === 'Space') emit(channels.toggle);
  });

  return {
    platform: 'browser',
    widget: {
      setInteractive() {},
      focus() {},
      dragStart() {},
      dragEnd() {},
      computeAnchor: async () => ({
        anchor: currentSettings.widgetState?.anchor ?? { h: 'right', v: 'bottom' },
        x: 0,
        y: 0,
      }),
      applyBounds: async ({ anchor } = {}) => {
        if (anchor) {
          persistMock(deepMerge(currentSettings, { widgetState: { anchor } }));
        }
        return true;
      },
      contextMenu() {},
      onToggle: subscribe(channels.toggle),
    },
    settings: {
      get: async () => currentSettings,
      update: async (patch) => persistMock(deepMerge(currentSettings, patch)),
      reset: async () =>
        persistMock({ ...DEFAULT_SETTINGS, widgetState: currentSettings.widgetState }),
      onChange: subscribe(channels.settings),
    },
    billing: {
      info: async () => {
        const plan = getPlan(currentSettings.account.plan);
        return {
          hostname: 'DESKTOP-AURA',
          platform: 'Windows 11 (Browser Preview)',
          maxDevices: plan.maxDevices,
          activeDevices: [
            {
              id: 'current-pc',
              name: 'DESKTOP-AURA',
              os: 'Windows 11 (x64)',
              lastActive: 'Active now (this PC)',
              current: true,
            },
          ],
          invoices: Array.isArray(currentSettings.account?.invoices) ? currentSettings.account.invoices : [],
        };
      },
      activateLicense: async (rawKey) => {
        const key = String(rawKey ?? '').trim().toUpperCase();
        const consumed = Array.isArray(currentSettings.account?.consumedKeys)
          ? currentSettings.account.consumedKeys
          : [];

        if (key === MASTER_LICENSE_KEY) {
          const next = persistMock(
            deepMerge(currentSettings, {
              account: {
                plan: 'team',
                licenseKey: MASTER_LICENSE_KEY,
                isMasterKey: true,
                licenseStatus: 'active',
                renewsAt: 'Permanent (Master License)',
              },
            }),
          );
          return next.account;
        }

        const msMatch = key.match(
          /^(PRO20|MAX50|ULTRA)-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/,
        );
        const legacyMatch = key.match(/^AURA-(PRO|ULTRA|MAX|TEAM)-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
        if (!msMatch && !legacyMatch) {
          throw new Error(
            'Invalid product key format. Please use the 5x5 format: XXXXX-XXXXX-XXXXX-XXXXX-XXXXX (e.g. PRO20-XXXXX-XXXXX-XXXXX-XXXXX or MAX50-XXXXX-XXXXX-XXXXX-XXXXX).',
          );
        }
        if (consumed.includes(key)) {
          throw new Error(
            `License key ${key} has already been consumed! Standard customer keys are single-use.`,
          );
        }
        const rawTier = (msMatch ? msMatch[1] : legacyMatch[1]).toUpperCase();
        const tier = rawTier === 'PRO' || rawTier === 'PRO20' ? 'pro' : 'team';
        const next = persistMock(
          deepMerge(currentSettings, {
            account: {
              plan: tier,
              licenseKey: key,
              isMasterKey: false,
              licenseStatus: 'active',
              consumedKeys: [...consumed, key],
            },
          }),
        );
        return next.account;
      },
      checkout: async ({ planId, billingCycle = 'yearly', cardholderName = 'Aura Subscriber', cardNumber = '4242424242424242', cardExp = '12/28', promoCode = '', country = 'United States', postalCode = '' }) => {
        const plan = getPlan(planId);
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const block = () =>
          Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        const prefix = plan.id === 'team' ? 'MAX50' : 'PRO20';
        const key =
          plan.id === 'free' ? '' : `${prefix}-${block()}-${block()}-${block()}-${block()}`;
        const consumed = Array.isArray(currentSettings.account?.consumedKeys)
          ? currentSettings.account.consumedKeys
          : [];
        const cleanNumber = String(cardNumber || '4242424242424242').replace(/\D/g, '');
        const cardBrand = cleanNumber.startsWith('4') ? 'Visa' : cleanNumber.startsWith('5') ? 'Mastercard' : cleanNumber.startsWith('3') ? 'American Express' : 'Credit Card';
        const cardLast4 = cleanNumber.slice(-4) || '4242';
        const cycle = billingCycle || 'yearly';
        let amount = cycle === 'yearly' ? plan.yearlyTotal : plan.monthlyPrice;
        if (['AURA100', 'FREE100', 'DEV100'].includes(String(promoCode).toUpperCase())) amount = 0;
        else if (['WELCOME50', 'HALF50', 'AURA50'].includes(String(promoCode).toUpperCase())) amount = Math.round(amount * 0.5);

        const newInvoice = {
          id: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          plan: `${plan.name} (${cycle === 'yearly' ? 'Annual' : 'Monthly'})`,
          amount: `$${amount}.00 USD`,
          status: 'PAID',
          cardBrand,
          cardLast4,
          cardholderName,
          country,
          postalCode,
          promoCode: promoCode || undefined,
        };
        const existingInvoices = Array.isArray(currentSettings.account?.invoices) ? currentSettings.account.invoices : [];

        const next = persistMock(
          deepMerge(currentSettings, {
            account: {
              plan: plan.id,
              billingCycle: cycle,
              licenseKey: currentSettings.account?.isMasterKey ? MASTER_LICENSE_KEY : key,
              licenseStatus: 'active',
              consumedKeys: key ? [...consumed, key] : consumed,
              cardLast4,
              cardBrand,
              cardExp,
              cardholderName,
              invoices: [newInvoice, ...existingInvoices],
            },
          }),
        );
        return next.account;
      },
      cancel: async () => {
        const next = persistMock(
          deepMerge(currentSettings, {
            account: {
              plan: 'free',
              licenseKey: '',
              licenseStatus: 'canceled',
            },
          }),
        );
        return next.account;
      },
    },
    app: {
      openDashboard: () => window.open('./dashboard.html', '_blank'),
      quit() {},
    },
    ai: {
      status: async () => ({
        online: true,
        models: mockModels.map((m) => m.name),
        model: currentSettings.ai.model || mockModels[0]?.name || 'llama3.2:3b',
        provider: 'mock',
      }),
      overview: async () => ({
        online: true,
        provider: 'mock',
        host: 'http://127.0.0.1:11434 (mock)',
        activeModel: currentSettings.ai.model || mockModels[0]?.name || 'llama3.2:3b',
        configuredModel: currentSettings.ai.model,
        models: mockModels,
        running: mockRunning,
        system: {
          timestamp: Date.now(),
          cpu: { model: 'AMD Ryzen 7 (Mock Browser)', cores: 16, usagePercent: 18 },
          ram: { usedBytes: 11.4 * 1024 ** 3, totalBytes: 32 * 1024 ** 3, usagePercent: 36 },
          gpu: {
            available: true,
            vendor: 'nvidia',
            name: 'NVIDIA GeForce RTX 4070 (Mock)',
            vramUsed: 3.1 * 1024 ** 3,
            vramTotal: 12 * 1024 ** 3,
            vramPercent: 26,
            utilizationPercent: 14,
            temperatureC: 46,
          },
        },
      }),
      deleteModel: async (name) => {
        mockModels = mockModels.filter((m) => m.name !== name);
        mockRunning = mockRunning.filter((m) => m.name !== name);
        return true;
      },
      unloadModel: async (name) => {
        mockRunning = mockRunning.filter((m) => m.name !== name);
        return true;
      },
      pullModel(name) {
        clearInterval(pullTimer);
        const total = 2.1 * 1024 ** 3;
        let completed = 0;
        pullTimer = setInterval(() => {
          completed += total / 10;
          if (completed >= total) {
            clearInterval(pullTimer);
            if (!mockModels.some((m) => m.name === name)) {
              mockModels = [
                ...mockModels,
                {
                  name,
                  sizeBytes: total,
                  modifiedAt: new Date().toISOString(),
                  family: 'llama',
                  parameterSize: '4B',
                  quantization: 'Q4_K_M',
                },
              ];
            }
            emit(channels.pullDone, { name });
            return;
          }
          emit(channels.pullProgress, {
            name,
            status: 'downloading layers',
            completed,
            total,
          });
        }, 250);
      },
      abortPull() {
        clearInterval(pullTimer);
        emit(channels.pullDone, { aborted: true });
      },
      onPullProgress: subscribe(channels.pullProgress),
      onPullDone: subscribe(channels.pullDone),
      onPullError: subscribe(channels.pullError),
      testProvider: async (providerId) => ({
        ok: true,
        provider: providerId,
        model:
          providerId === 'openai'
            ? currentSettings.ai.openaiModel
            : providerId === 'anthropic'
              ? currentSettings.ai.anthropicModel
              : currentSettings.ai.geminiModel,
        reply: 'OK',
      }),
      chat({ requestId }) {
        const persona = getPersonality(currentSettings.assistant.personality);
        const text = `[Browser Preview · ${persona.label}] ${persona.sample}\n\n(Run with \`npm run dev\` for live connection to Ollama / Cloud models.)`;
        let i = 0;
        const timer = setInterval(() => {
          if (i >= text.length) {
            clearInterval(timer);
            emit(channels.done, { requestId });
            return;
          }
          emit(channels.chunk, { requestId, delta: text.slice(i, (i += 3)) });
        }, 18);
      },
      abort() {},
      onChunk: subscribe(channels.chunk),
      onDone: subscribe(channels.done),
      onError: subscribe(channels.error),
    },
    connectors: {
      connect: async ({ service, mode = 'demo', email }) => {
        const next = persistMock(
          deepMerge(currentSettings, {
            connectors: {
              [service]: {
                connected: true,
                mode,
                email: email || currentSettings.account?.email || 'founder@aura.ai',
                lastSync: new Date().toISOString(),
              },
            },
          }),
        );
        return next.connectors;
      },
      disconnect: async (service) => {
        const next = persistMock(
          deepMerge(currentSettings, {
            connectors: {
              [service]: {
                connected: false,
                accessToken: '',
                lastSync: '',
              },
            },
          }),
        );
        return next.connectors;
      },
      gmailList: async () => ({
        mode: 'demo',
        account: currentSettings.connectors?.gmail?.email || 'founder@aura.ai',
        messages: [
          {
            id: 'gmail-1',
            from: 'Elena Vance <elena@sequoia-seed.vc>',
            subject: 'Follow-up: Aura AI Seed Round & Term Sheet Q4',
            date: '25m ago',
            unread: true,
            snippet:
              'Hi! We reviewed the retention metrics for the Aura Desktop Companion and want to schedule the final partner call...',
            body: 'Hi!\n\nWe reviewed the retention metrics for the Aura Desktop Companion and the hybrid Local + Cloud architecture. We are very impressed with the desktop responsiveness.',
          },
          {
            id: 'gmail-2',
            from: 'Stripe Billing <notifications@stripe.com>',
            subject: 'Weekly report: Aura Pro subscriptions +38% MRR',
            date: 'Today, 09:15',
            unread: true,
            snippet: 'Monthly recurring revenue (MRR) grew by 38% this past week...',
            body: 'Stripe Summary for Aura AI:\n- 142 new Aura Pro subscribers\n- 9 new Aura Max subscriptions',
          },
        ],
      }),
      gdriveSearch: async () => ({
        mode: 'demo',
        account: currentSettings.connectors?.gdrive?.email || 'founder@aura.ai',
        files: [
          {
            id: 'gdrive-1',
            name: 'Aura AI — Pitch Deck & Financial Projections 2026.pptx',
            typeLabel: 'Google Slides',
            modifiedTime: 'Modified 2 hours ago',
            owner: 'founder@aura.ai',
            webViewLink: 'https://docs.google.com/presentation',
            summary:
              'Seed investor deck: problem, hybrid Ollama + Cloud APIs (OpenAI, Claude, Gemini), Google Workspace connectors.',
          },
          {
            id: 'gdrive-2',
            name: 'Roadmap Q4 — Gmail, Drive & Multi-LLM Connectors.docx',
            typeLabel: 'Google Docs',
            modifiedTime: 'Modified yesterday',
            owner: 'founder@aura.ai',
            webViewLink: 'https://docs.google.com/document',
            summary:
              'Technical specifications for OAuth2 integration with Gmail and Google Drive, plus native user API keys.',
          },
        ],
      }),
      calendarList: async () => ({
        mode: 'demo',
        account: currentSettings.connectors?.gcalendar?.email || 'founder@aura.ai',
        events: [
          {
            id: 'cal-1',
            title: 'Product Sync — Aura Ultra & Vision AI Launch',
            time: 'Today · 11:00 AM – 11:45 AM',
            attendees: 'Core Team (4 participants)',
            location: 'Google Meet',
            description: 'Reviewing Vision AI (/screen) and Smart Clipboard (/clipboard) features.',
          },
          {
            id: 'cal-2',
            title: 'Term Sheet Discussion — Venture Partners',
            time: 'Today · 3:00 PM – 4:00 PM',
            attendees: 'Alex Turner, Aura Founder',
            location: 'Zoom',
            description: 'Presenting conversion metrics from Free Trial to Aura Pro ($20) & Max ($50).',
          },
        ],
      }),
      notionSearch: async () => ({
        mode: 'demo',
        workspace: currentSettings.connectors?.notion?.workspace || 'Aura HQ Workspace',
        pages: [
          {
            id: 'notion-1',
            title: 'Aura 2.0 Product Roadmap — Q4 2026',
            workspace: 'Aura HQ Workspace',
            updatedAt: '40m ago',
            url: 'https://www.notion.so',
            content: 'Floating Top-Notch + Cloud AI + Vision (/screen) + Smart Clipboard (/clipboard).',
          },
        ],
      }),
      githubList: async () => ({
        mode: 'demo',
        username: currentSettings.connectors?.github?.username || 'aura-founder',
        items: [
          {
            id: 'gh-1',
            repo: 'aura-ai/aura-desktop-companion',
            type: 'Pull Request #42 (Open)',
            title: 'feat: Vision Screen Capture (/screen) + Multi-Provider Cloud AI',
            updatedAt: '15m ago',
            url: 'https://github.com',
            summary: 'Adds native desktop screen capture via Electron desktopCapturer and Vision AI.',
          },
        ],
      }),
      captureScreen: async () => ({
        name: 'Primary Screen (Preview)',
        width: 1280,
        height: 720,
        timestamp: 'Just now',
        dataUrl: '',
      }),
      readClipboard: async () => ({
        text: 'Sample clipboard text for rewriting or translation.',
        length: 46,
        isEmpty: false,
      }),
      writeClipboard: async () => true,
      openExternal: (url) => window.open(url, '_blank'),
    },
    chats: {
      list: async () => [],
      save: async () => [],
      delete: async () => [],
      clear: async () => [],
    },
    copilot: {
      status: async () => ({
        active: false,
        context: {
          activeWindowTitle: 'Windows Desktop',
          activeProcess: 'explorer',
          cursor: { x: 640, y: 400 },
          screenSize: { width: 1920, height: 1080 },
        },
        pendingPlans: [],
      }),
      toggle: async (enable) => ({
        active: Boolean(enable ?? true),
        context: {
          activeWindowTitle: 'Windows Desktop',
          activeProcess: 'explorer',
          cursor: { x: 640, y: 400 },
          screenSize: { width: 1920, height: 1080 },
        },
        pendingPlans: [],
      }),
      plan: async (instruction) => ({
        id: 'mock-plan-1',
        instruction,
        createdAt: 'Just now',
        activeWindow: 'Windows Desktop',
        activeProcess: 'explorer',
        cursorStart: { x: 640, y: 400 },
        screenSize: { width: 1920, height: 1080 },
        status: 'awaiting_approval',
        steps: [
          {
            id: 's1',
            type: 'move_cursor',
            x: 640,
            y: 400,
            label: `Guide cursor for: ${instruction}`,
          },
        ],
      }),
      approve: async (planId) => ({ id: planId, status: 'completed', steps: [] }),
      reject: async (planId) => ({ id: planId, status: 'rejected', steps: [] }),
      stop: async () => true,
      onStatus: () => () => {},
    },
    actions: {
      catalog: async () => [
        {
          id: 'system_health',
          title: 'Quick PC Diagnostic (RAM, CPU & SSD)',
          description: 'Analyzes top memory-consuming processes and available disk space.',
          category: 'System',
          requiresApproval: false,
        },
        {
          id: 'organize_downloads',
          title: 'Organize Downloads Folder',
          description: 'Automatically groups downloads into Documents, Images, Archives, and Installers.',
          category: 'Files',
          requiresApproval: true,
        },
        {
          id: 'clean_temp',
          title: 'Clean Temporary Files (%TEMP%)',
          description: 'Safely removes stale cache and temporary files to free up SSD space.',
          category: 'Maintenance',
          requiresApproval: true,
        },
      ],
      execute: async (actionId) => ({
        ok: true,
        title: `Action Executed (${actionId})`,
        summary: `✅ Local automation "${actionId}" executed successfully.`,
      }),
      natural: async (q) => ({
        ok: true,
        showCatalog: !q,
        catalog: [],
        summary: `⚡ Local automation: ${q || 'Actions Catalog'}`,
      }),
    },
    timeline: {
      search: async (query) => ({
        query,
        totalStored: 1,
        autoRecording: true,
        results: [
          {
            id: 'snap-mock-1',
            timeLabel: '12:45:10',
            dateLabel: 'Oct 17',
            relativeTime: '5 minutes ago',
            windowTitle: 'Visual Studio Code — aura-companion',
            processName: 'Code',
            category: 'Code & Development',
            clipboardSnippet: '',
            imageDataUrl: '',
          },
        ],
        explanation: '🕒 Local SSD Visual History:',
      }),
      capture: async () => ({
        id: `snap-${Date.now()}`,
        timeLabel: 'Just now',
        relativeTime: 'moments ago (<1 min)',
        windowTitle: 'Windows Desktop',
        processName: 'explorer',
        category: 'Desktop & Applications',
      }),
      delete: async () => ({ ok: true, totalStored: 0 }),
      clear: async () => ({ ok: true, totalStored: 0 }),
      setAuto: async (enabled) => ({ autoRecording: Boolean(enabled) }),
    },
    cloudWorkspace: {
      status: async () => ({ ok: true, data: { connected: false, sandbox: null, encryptedKeySaved: false } }),
      saveKey: async () => ({ ok: false, error: 'Cloud workspace is available in the desktop application.' }),
      removeKey: async () => ({ ok: true, data: { connected: false } }),
      create: async () => ({ ok: false, error: 'Create cloud VM from the desktop application.' }),
      openTerminal: async () => ({ ok: false, error: 'Open terminal from the desktop application.' }),
      stop: async () => ({ ok: false, error: 'Stopping VM is available in the desktop application.' }),
      delete: async () => ({ ok: false, error: 'Deleting VM is available in the desktop application.' }),
    },
    files: {
      roots: async () => getMockIndexStats().roots,
      indexStats: async () => getMockIndexStats(),
      reindex: async () => getMockIndexStats(),
      pickFolder: async () => {
        const added = `C:\\Users\\Demo\\Projects-AI-${Math.floor(Math.random() * 90 + 10)}`;
        const roots = [...getMockIndexStats().roots, added];
        persistMock(deepMerge(currentSettings, { privacy: { allowedRoots: roots } }));
        return getMockIndexStats();
      },
      removeRoot: async (folderPath) => {
        const roots = getMockIndexStats().roots.filter((r) => r !== folderPath);
        persistMock(deepMerge(currentSettings, { privacy: { allowedRoots: roots } }));
        return getMockIndexStats();
      },
      resetRoots: async () => {
        persistMock(deepMerge(currentSettings, { privacy: { allowedRoots: mockRoots } }));
        return getMockIndexStats();
      },
      search: async (q) => [
        {
          name: `notes-${q}.md`,
          path: `C:\\Users\\Demo\\Desktop\\notes-${q}.md`,
          isDir: false,
          size: 4200,
          canReadText: true,
          matchedBy: 'name',
          preview: ' Q4 Objectives: Aura widget release + local models integration...',
        },
        {
          name: `architecture-${q}.txt`,
          path: `C:\\Users\\Demo\\Documents\\architecture-${q}.txt`,
          isDir: false,
          size: 8120,
          canReadText: true,
          matchedBy: 'content',
          preview: `...matching occurrence found in document for "${q}"...`,
        },
      ],
      read: async (filePath) => ({
        name: filePath.split(/[\\/]/).pop(),
        path: filePath,
        size: 1240,
        content: '# Aura Project Notes\n- Floating Top Notch companion with hover\n- Local Ollama AI integration\n- Complete Control Center suite.',
      }),
      reveal() {},
    },
    jarvis: {
      tools: async () => [
        { id: 'win_minimize_all', name: 'Minimize All Windows', category: 'Windows & Workspace', description: 'Instantly minimizes all desktop windows.', risk: 'CAUTION' },
        { id: 'sys_health_overview', name: 'System Health Overview', category: 'System Health', description: 'Telemetry on CPU, RAM, and GPU.', risk: 'SAFE' },
        { id: 'file_clean_temp', name: 'Clean %TEMP% Cache', category: 'File Operations', description: 'Deletes unneeded temporary files.', risk: 'DANGEROUS' },
        { id: 'net_ping_test', name: 'Ping Test (Latency Check)', category: 'Network & Connectivity', description: 'Pings Cloudflare (1.1.1.1) to check latency.', risk: 'SAFE' },
        { id: 'audio_mute', name: 'Mute / Unmute Audio', category: 'Audio & Media', description: 'Toggles system master audio mute state.', risk: 'CAUTION' },
        { id: 'app_launch_notepad', name: 'Launch Notepad', category: 'Application Controls', description: 'Opens a new Windows Notepad document.', risk: 'SAFE' },
        { id: 'screen_take_snapshot', name: 'Capture Screen Snapshot', category: 'Screen & Vision', description: 'Instantly captures desktop display.', risk: 'SAFE' },
        { id: 'routine_morning_standup', name: 'Run Morning Standup Routine', category: 'Routines & Automation', description: 'Inspects health and summarizes active work.', risk: 'SAFE' },
      ],
      executeTool: async (toolId) => ({ success: true, message: `Tool ${toolId} executed successfully.` }),
      pendingApprovals: async () => [],
      resolveApproval: async () => true,
    },
    routines: {
      list: async () => [
        {
          id: 'routine-morning-standup',
          name: 'Morning Developer Briefing',
          description: 'Inspects CPU/RAM health, checks git status, and provides an active summary.',
          trigger: 'timeOfDay',
          timeOfDay: '09:00',
          intervalMinutes: 1440,
          enabled: true,
          tools: ['routine_morning_standup', 'dev_git_status', 'sys_health_overview'],
          lastRunAt: new Date(Date.now() - 3600000).toISOString(),
          lastResult: { successfulSteps: 3, stepCount: 3 },
        },
        {
          id: 'routine-workspace-cleanup',
          name: 'Daily Disk & Cache Cleanup',
          description: 'Flushes %TEMP% files, clears Recycle Bin, and frees SSD storage space.',
          trigger: 'interval',
          intervalMinutes: 720,
          enabled: true,
          tools: ['file_clean_temp', 'file_empty_recycle_bin'],
          lastRunAt: new Date(Date.now() - 7200000).toISOString(),
          lastResult: { successfulSteps: 2, stepCount: 2 },
        },
      ],
      toggle: async (id, enabled) => ({ id, enabled }),
      run: async (id) => ({ id, success: true, message: `Routine ${id} completed.` }),
      save: async (routine) => routine,
      delete: async () => true,
    },
    clipboardMemory: {
      list: async (query = '') => [
        {
          id: 'clip-1',
          title: 'const router = createRouter(...)',
          content: 'const router = createRouter({\n  history: createWebHistory(),\n  routes: [...]\n});',
          type: 'code',
          language: 'javascript',
          charCount: 78,
          lineCount: 4,
          source: 'system_clipboard',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'clip-2',
          title: 'https://github.com/atlas-labs/aura',
          content: 'https://github.com/atlas-labs/aura',
          type: 'url',
          language: null,
          charCount: 34,
          lineCount: 1,
          source: 'system_clipboard',
          createdAt: new Date(Date.now() - 180000).toISOString(),
        },
      ].filter((i) => !query || i.content.toLowerCase().includes(query.toLowerCase())),
      remove: async () => true,
      clear: async () => true,
      copy: async () => true,
    },
    launcher: {
      hide: () => {},
      onFocused: (cb) => () => {},
    },
    auth: {
      signup: async (email, password, subscription_status = 'free') => ({
        success: true,
        token: 'mock-jwt-token-123456',
        user: { id: 'mock-usr-1', email, subscription_status, created_at: new Date().toISOString() },
      }),
      login: async (email, password) => ({
        success: true,
        token: 'mock-jwt-token-123456',
        user: { id: 'mock-usr-1', email, subscription_status: 'pro', created_at: new Date().toISOString() },
      }),
      logout: async () => ({ success: true }),
      getSession: async () => ({
        isAuthenticated: true,
        user: { id: 'mock-usr-1', email: 'daniel@theo.site', subscription_status: 'pro' },
        token: 'mock-jwt-token-123456',
      }),
      getDashboard: async () => ({
        success: true,
        user: { id: 'mock-usr-1', email: 'daniel@theo.site', subscription_status: 'pro' },
        usage: {
          total_actions: 142,
          total_consumption: 18450,
          usage_by_platform: {
            desktop: { actions: 114, consumption: 14200 },
            web: { actions: 28, consumption: 4250 },
          },
          recent_logs: [
            { id: '1', action_performed: 'jarvis_tool:sys_health', tokens_used_or_duration: 1, platform: 'desktop', timestamp: new Date().toISOString() },
            { id: '2', action_performed: 'routine:morning_briefing', tokens_used_or_duration: 3, platform: 'desktop', timestamp: new Date(Date.now() - 3600000).toISOString() },
            { id: '3', action_performed: 'web_ai_prompt', tokens_used_or_duration: 520, platform: 'web', timestamp: new Date(Date.now() - 7200000).toISOString() },
          ],
        },
      }),
      trackUsage: async () => ({ queued: true }),
      getTier: async () => ({
        success: true,
        tier: currentSettings.account?.plan || 'free',
        dailyLimit: currentSettings.account?.plan === 'free' ? 50 : -1,
        dailyUsed: 12,
        remainingActions: currentSettings.account?.plan === 'free' ? 38 : -1,
        features: {
          screenVision: currentSettings.account?.plan !== 'free',
          cloudLlms: currentSettings.account?.plan !== 'free',
        },
      }),
      checkTier: async (feature) => {
        const isFree = (currentSettings.account?.plan || 'free') === 'free';
        const allowed = !isFree || (feature !== 'screenVision' && feature !== 'cloudLlms');
        return {
          allowed,
          tier: currentSettings.account?.plan || 'free',
          upgradeRequired: !allowed,
        };
      },
      onUpgradeAlert: (cb) => {
        const handler = (e) => cb(e.detail);
        window.addEventListener('aura:upgrade-alert', handler);
        return () => window.removeEventListener('aura:upgrade-alert', handler);
      },
    },
  };
}

export const aura = window.aura ?? createMockBridge();
export const isElectron = Boolean(window.aura);

/**
 * Dispatches an upgrade alert event across the application.
 * Non-intrusively displays UpgradeAlert banner.
 */
export function emitUpgradeAlert(detail) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('aura:upgrade-alert', { detail }));
  }
}

/**
 * Subscribes to upgrade alerts from IPC or local DOM dispatch.
 */
export function onUpgradeAlert(callback) {
  if (typeof window === 'undefined') return () => {};
  const domListener = (e) => callback(e.detail);
  window.addEventListener('aura:upgrade-alert', domListener);
  const offIpc = aura.auth?.onUpgradeAlert?.(callback);
  return () => {
    window.removeEventListener('aura:upgrade-alert', domListener);
    offIpc?.();
  };
}
