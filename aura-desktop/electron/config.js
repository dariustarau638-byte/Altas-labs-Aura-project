import { app } from 'electron';

/**
 * Application technical configuration (non-editable by user).
 * User preferences (theme, personality, behavior) are stored in
 * services/settingsStore.js with the schema in shared/settings.js.
 */
export const config = {
  ai: {
    provider: 'ollama',
    host: process.env.OLLAMA_HOST || 'http://127.0.0.1:11434',
    defaultModel: process.env.AURA_MODEL || 'llama3.2',
  },
  widget: {
    width: 440,
    height: 620,
    notchWidth: 180,
    notchHeight: 32,
    margin: 0,
    padding: 0,
    toggleShortcut: 'CommandOrControl+Shift+Space',
    dashboardShortcut: 'CommandOrControl+Shift+D',
    cursorCoPilotShortcut: 'CommandOrControl+Shift+A',
    launcherShortcut: 'CommandOrControl+/',
  },
  files: {
    // If empty, user default directories are used (see getAllowedRoots).
    allowedRoots: [],
    maxReadBytes: 512 * 1024,
  },
};

export function getAllowedRoots() {
  if (config.files.allowedRoots.length) return config.files.allowedRoots;
  return ['documents', 'desktop', 'downloads'].map((name) => app.getPath(name));
}
