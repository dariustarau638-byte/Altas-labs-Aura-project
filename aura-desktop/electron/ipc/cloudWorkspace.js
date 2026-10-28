import { ipcMain, shell } from 'electron';
import {
  createCloudWorkspace,
  deleteCloudWorkspace,
  getCloudWorkspaceStatus,
  hasCloudWorkspaceKey,
  openCloudWorkspaceTerminal,
  removeCloudWorkspaceKey,
  saveCloudWorkspaceKey,
  stopCloudWorkspace,
} from '../services/cloudWorkspace.js';

const run = (handler) => async (...args) => {
  try { return { ok: true, data: await handler(...args) }; }
  catch (error) { return { ok: false, error: error?.message || 'Cloud workspace action failed.' }; }
};

export function registerCloudWorkspaceIpc() {
  ipcMain.handle('cloud-workspace:status', run(async () => ({
    ...(await getCloudWorkspaceStatus()),
    encryptedKeySaved: hasCloudWorkspaceKey(),
  })));
  ipcMain.handle('cloud-workspace:save-key', run((_event, key) => saveCloudWorkspaceKey(key)));
  ipcMain.handle('cloud-workspace:remove-key', run(() => removeCloudWorkspaceKey()));
  ipcMain.handle('cloud-workspace:create', run(() => createCloudWorkspace()));
  ipcMain.handle('cloud-workspace:terminal', run(async () => {
    const result = await openCloudWorkspaceTerminal();
    await shell.openExternal(result.url);
    return { opened: true, expiresInSeconds: result.expiresInSeconds };
  }));
  ipcMain.handle('cloud-workspace:stop', run(() => stopCloudWorkspace()));
  ipcMain.handle('cloud-workspace:delete', run(() => deleteCloudWorkspace()));
}
