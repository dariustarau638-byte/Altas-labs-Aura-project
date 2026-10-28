// Preload (CommonJS – required for sandboxed preloads).
// Exposes a minimal and secure API in renderer as `window.aura`.
const { contextBridge, ipcRenderer } = require('electron');

const subscribe = (channel) => (callback) => {
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};

contextBridge.exposeInMainWorld('aura', {
  platform: process.platform,

  widget: {
    setInteractive: (interactive) => ipcRenderer.send('widget:set-interactive', interactive),
    focus: () => ipcRenderer.send('widget:focus'),
    dragStart: (options) => ipcRenderer.send('widget:drag-start', options),
    dragEnd: () => ipcRenderer.send('widget:drag-end'),
    computeAnchor: (pillRect) => ipcRenderer.invoke('widget:compute-anchor', pillRect),
    applyBounds: (bounds) => ipcRenderer.invoke('widget:apply-bounds', bounds),
    contextMenu: () => ipcRenderer.send('widget:context-menu'),
    onToggle: subscribe('widget:toggle'),
  },

  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (patch) => ipcRenderer.invoke('settings:update', patch),
    reset: () => ipcRenderer.invoke('settings:reset'),
    onChange: subscribe('settings:changed'),
  },

  billing: {
    info: () => ipcRenderer.invoke('billing:info'),
    activateLicense: (key) => ipcRenderer.invoke('billing:activate-license', key),
    checkout: (payload) => ipcRenderer.invoke('billing:checkout', payload),
    cancel: () => ipcRenderer.invoke('billing:cancel'),
  },

  cloudWorkspace: {
    status: () => ipcRenderer.invoke('cloud-workspace:status'),
    saveKey: (key) => ipcRenderer.invoke('cloud-workspace:save-key', key),
    removeKey: () => ipcRenderer.invoke('cloud-workspace:remove-key'),
    create: () => ipcRenderer.invoke('cloud-workspace:create'),
    openTerminal: () => ipcRenderer.invoke('cloud-workspace:terminal'),
    stop: () => ipcRenderer.invoke('cloud-workspace:stop'),
    delete: () => ipcRenderer.invoke('cloud-workspace:delete'),
  },

  app: {
    openDashboard: () => ipcRenderer.send('app:open-dashboard'),
    quit: () => ipcRenderer.send('app:quit'),
  },

  ai: {
    status: () => ipcRenderer.invoke('ai:status'),
    overview: () => ipcRenderer.invoke('ai:overview'),
    testProvider: (providerId) => ipcRenderer.invoke('ai:test-provider', providerId),
    deleteModel: (name) => ipcRenderer.invoke('ai:delete-model', name),
    unloadModel: (name) => ipcRenderer.invoke('ai:unload-model', name),
    pullModel: (name) => ipcRenderer.send('ai:pull-model', { name }),
    abortPull: () => ipcRenderer.send('ai:pull-abort'),
    onPullProgress: subscribe('ai:pull-progress'),
    onPullDone: subscribe('ai:pull-done'),
    onPullError: subscribe('ai:pull-error'),
    chat: (payload) => ipcRenderer.send('ai:chat', payload),
    abort: (requestId) => ipcRenderer.send('ai:abort', requestId),
    onChunk: subscribe('ai:chunk'),
    onDone: subscribe('ai:done'),
    onError: subscribe('ai:error'),
  },

  connectors: {
    connect: (payload) => ipcRenderer.invoke('connectors:connect', payload),
    disconnect: (service) => ipcRenderer.invoke('connectors:disconnect', service),
    gmailList: (options) => ipcRenderer.invoke('connectors:gmail-list', options),
    gdriveSearch: (options) => ipcRenderer.invoke('connectors:gdrive-search', options),
    calendarList: (options) => ipcRenderer.invoke('connectors:calendar-list', options),
    notionSearch: (options) => ipcRenderer.invoke('connectors:notion-search', options),
    githubList: (options) => ipcRenderer.invoke('connectors:github-list', options),
    captureScreen: () => ipcRenderer.invoke('connectors:capture-screen'),
    readClipboard: () => ipcRenderer.invoke('connectors:read-clipboard'),
    writeClipboard: (text) => ipcRenderer.invoke('connectors:write-clipboard', text),
    openExternal: (url) => ipcRenderer.send('connectors:open-external', url),
  },

  chats: {
    list: () => ipcRenderer.invoke('chats:list'),
    save: (payload) => ipcRenderer.invoke('chats:save', payload),
    delete: (sessionId) => ipcRenderer.invoke('chats:delete', sessionId),
    clear: () => ipcRenderer.invoke('chats:clear'),
  },

  copilot: {
    status: () => ipcRenderer.invoke('copilot:status'),
    toggle: (enable) => ipcRenderer.invoke('copilot:toggle', enable),
    plan: (instruction) => ipcRenderer.invoke('copilot:plan', instruction),
    approve: (planId) => ipcRenderer.invoke('copilot:approve', planId),
    reject: (planId) => ipcRenderer.invoke('copilot:reject', planId),
    stop: () => ipcRenderer.invoke('copilot:stop'),
    onStatus: subscribe('copilot:status'),
  },

  actions: {
    catalog: () => ipcRenderer.invoke('actions:catalog'),
    execute: (actionId, params) => ipcRenderer.invoke('actions:execute', { actionId, params }),
    natural: (query) => ipcRenderer.invoke('actions:natural', query),
  },

  timeline: {
    search: (query) => ipcRenderer.invoke('timeline:search', query),
    capture: (options) => ipcRenderer.invoke('timeline:capture', options),
    delete: (snapshotId) => ipcRenderer.invoke('timeline:delete', snapshotId),
    clear: () => ipcRenderer.invoke('timeline:clear'),
    setAuto: (enabled) => ipcRenderer.invoke('timeline:set-auto', enabled),
  },

  files: {
    roots: () => ipcRenderer.invoke('files:roots'),
    indexStats: () => ipcRenderer.invoke('files:index-stats'),
    reindex: () => ipcRenderer.invoke('files:reindex'),
    pickFolder: () => ipcRenderer.invoke('files:pick-folder'),
    removeRoot: (folderPath) => ipcRenderer.invoke('files:remove-root', folderPath),
    resetRoots: () => ipcRenderer.invoke('files:reset-roots'),
    search: (query) => ipcRenderer.invoke('files:search', query),
    read: (filePath) => ipcRenderer.invoke('files:read', filePath),
    reveal: (filePath) => ipcRenderer.send('files:reveal', filePath),
  },

  jarvis: {
    tools: (category) => ipcRenderer.invoke('jarvis:tools', category),
    executeTool: (toolId, params) => ipcRenderer.invoke('jarvis:execute-tool', { toolId, params }),
    pendingApprovals: () => ipcRenderer.invoke('jarvis:pending-approvals'),
    resolveApproval: (approvalId, approved, allowSession) =>
      ipcRenderer.invoke('jarvis:resolve-approval', { approvalId, approved, allowSession }),
  },

  routines: {
    list: () => ipcRenderer.invoke('routines:list'),
    toggle: (id, enabled) => ipcRenderer.invoke('routines:toggle', { id, enabled }),
    run: (id) => ipcRenderer.invoke('routines:run', id),
    save: (routine) => ipcRenderer.invoke('routines:save', routine),
    delete: (id) => ipcRenderer.invoke('routines:delete', id),
  },

  clipboardMemory: {
    list: (query) => ipcRenderer.invoke('clipboard:list', query),
    remove: (id) => ipcRenderer.invoke('clipboard:remove', id),
    clear: () => ipcRenderer.invoke('clipboard:clear'),
    copy: (id) => ipcRenderer.invoke('clipboard:copy', id),
  },

  launcher: {
    hide: () => ipcRenderer.send('launcher:hide'),
    onFocused: subscribe('launcher:focused'),
  },

  auth: {
    signup: (email, password, subscription_status) =>
      ipcRenderer.invoke('auth:signup', { email, password, subscription_status }),
    login: (email, password) => ipcRenderer.invoke('auth:login', { email, password }),
    logout: () => ipcRenderer.invoke('auth:logout'),
    getSession: () => ipcRenderer.invoke('auth:get-session'),
    getDashboard: () => ipcRenderer.invoke('auth:get-dashboard'),
    getTier: () => ipcRenderer.invoke('auth:get-tier'),
    checkTier: (feature) => ipcRenderer.invoke('auth:check-tier', feature),
    trackUsage: (action, units, metadata) => ipcRenderer.invoke('usage:track', { action, units, metadata }),
    onUpgradeAlert: subscribe('aura:upgrade-alert'),
  },
});
