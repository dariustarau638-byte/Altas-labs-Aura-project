import fs from 'node:fs';
import path from 'node:path';
import { app, BrowserWindow } from 'electron';
import { DEFAULT_SETTINGS, deepMerge, sanitizeSettings } from '../../shared/settings.js';

/**
 * Persistent settings store: JSON at %APPDATA%/<app>/settings.json.
 * - Validation on write (sanitizeSettings)
 * - Atomic write (temporary file + rename), debounced
 * - Broadcasts 'settings:changed' to all windows and main process listeners (e.g. System Tray)
 */
let settings = sanitizeSettings(DEFAULT_SETTINGS);
let filePath = null;
let writeTimer = null;
const mainListeners = new Set();

export function onSettingsChangeMain(fn) {
  mainListeners.add(fn);
  return () => mainListeners.delete(fn);
}

export function initSettings() {
  filePath = path.join(app.getPath('userData'), 'settings.json');
  let stored = {};
  try {
    stored = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') console.warn('[settings] Invalid file, using defaults:', err.message);
  }
  settings = sanitizeSettings(deepMerge(DEFAULT_SETTINGS, stored));
  return settings;
}

export const getSettings = () => settings;

/** @param {object} patch  @param {{ exclude?: Electron.WebContents }} [opts] */
export function updateSettings(patch, { exclude } = {}) {
  settings = sanitizeSettings(deepMerge(settings, patch));
  scheduleWrite();
  broadcast(exclude);
  return settings;
}

export function resetSettings() {
  // Widget position is preserved across settings reset.
  settings = sanitizeSettings({ ...DEFAULT_SETTINGS, widgetState: settings.widgetState });
  scheduleWrite();
  broadcast();
  return settings;
}

export function flushSettings() {
  clearTimeout(writeTimer);
  writeTimer = null;
  if (!filePath) return;
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const tmp = `${filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(settings, null, 2), 'utf8');
    fs.renameSync(tmp, filePath);
  } catch (err) {
    console.error('[settings] Failed to save settings:', err);
  }
}

function scheduleWrite() {
  clearTimeout(writeTimer);
  writeTimer = setTimeout(flushSettings, 250);
}

function broadcast(exclude) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed() || win.webContents === exclude) continue;
    win.webContents.send('settings:changed', settings);
  }
  for (const fn of mainListeners) {
    try {
      fn(settings);
    } catch {}
  }
}
