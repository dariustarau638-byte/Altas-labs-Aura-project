import { ipcMain } from 'electron';
import { apiClient } from '../services/apiClient.js';
import { loadSession, clearSession } from '../services/tokenStorage.js';
import { trackDesktopUsage } from '../services/telemetryTracker.js';

export function registerAuthIpc() {
  ipcMain.handle('auth:signup', async (_event, { email, password, subscription_status }) => {
    return apiClient.signup(email, password, subscription_status);
  });

  ipcMain.handle('auth:login', async (_event, { email, password }) => {
    return apiClient.login(email, password);
  });

  ipcMain.handle('auth:logout', async () => {
    clearSession();
    return { success: true };
  });

  ipcMain.handle('auth:get-session', async () => {
    const session = loadSession();
    return {
      isAuthenticated: Boolean(session.token),
      user: session.user,
      token: session.token,
      savedAt: session.savedAt,
    };
  });

  ipcMain.handle('auth:get-dashboard', async () => {
    return apiClient.getDashboard();
  });

  ipcMain.handle('auth:get-tier', async () => {
    return apiClient.getTier();
  });

  ipcMain.handle('auth:check-tier', async (_event, feature) => {
    return apiClient.checkTier(feature);
  });

  ipcMain.handle('usage:track', async (_event, { action, units, metadata }) => {
    trackDesktopUsage(action, units, metadata);
    return { queued: true };
  });
}
