import { ipcMain } from 'electron';
import { getSettings, resetSettings, updateSettings } from '../services/settingsStore.js';

export function registerSettingsIpc() {
  ipcMain.handle('settings:get', () => getSettings());
  // Exclude sender from broadcast: it already has local state (prevents echo while typing)
  ipcMain.handle('settings:update', (event, patch) => updateSettings(patch, { exclude: event.sender }));
  ipcMain.handle('settings:reset', () => resetSettings());
}
