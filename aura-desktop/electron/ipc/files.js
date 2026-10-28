import { BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { getSettings, updateSettings } from '../services/settingsStore.js';
import {
  buildFileIndex,
  getDefaultRoots,
  getEffectiveRoots,
  getIndexStats,
  isPathAllowed,
  readTextFile,
  searchFiles,
} from '../services/fileService.js';

export function registerFilesIpc() {
  ipcMain.handle('files:roots', () => getEffectiveRoots());
  ipcMain.handle('files:index-stats', () => getIndexStats());
  ipcMain.handle('files:reindex', () => buildFileIndex());
  ipcMain.handle('files:search', (_e, query) => searchFiles(query));
  ipcMain.handle('files:read', (_e, filePath) => readTextFile(filePath));

  ipcMain.handle('files:pick-folder', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const res = await dialog.showOpenDialog(win, {
      title: 'Select an authorized folder for Aura',
      properties: ['openDirectory'],
    });
    if (res.canceled || !res.filePaths?.length) return null;

    const chosen = res.filePaths[0];
    const current = getEffectiveRoots();
    const nextRoots = current.includes(chosen) ? current : [...current, chosen];
    updateSettings({ privacy: { allowedRoots: nextRoots } });
    await buildFileIndex();
    return getIndexStats();
  });

  ipcMain.handle('files:remove-root', async (_e, folderPath) => {
    const current = getEffectiveRoots().filter((r) => r !== folderPath);
    updateSettings({ privacy: { allowedRoots: current } });
    await buildFileIndex();
    return getIndexStats();
  });

  ipcMain.handle('files:reset-roots', async () => {
    updateSettings({ privacy: { allowedRoots: getDefaultRoots() } });
    await buildFileIndex();
    return getIndexStats();
  });

  ipcMain.on('files:reveal', (_e, filePath) => {
    if (isPathAllowed(filePath)) shell.showItemInFolder(filePath);
  });
}
