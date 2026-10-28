import fs from 'node:fs';
import path from 'node:path';
import { BrowserWindow } from 'electron';
import { PRELOAD_PATH, ROOT_DIR, loadPage } from '../paths.js';

let dashboardWin = null;

/** Opens (or brings to front) the Dashboard window. */
export function openDashboardWindow() {
  if (dashboardWin && !dashboardWin.isDestroyed()) {
    if (dashboardWin.isMinimized()) dashboardWin.restore();
    dashboardWin.show();
    dashboardWin.focus();
    return dashboardWin;
  }

  const iconPath = path.join(ROOT_DIR, 'build', 'icon.ico');

  dashboardWin = new BrowserWindow({
    width: 1120,
    height: 740,
    minWidth: 860,
    minHeight: 560,
    show: false,
    title: 'Aura – Control Center',
    backgroundColor: '#09090b',
    autoHideMenuBar: true,
    ...(fs.existsSync(iconPath) ? { icon: iconPath } : {}),
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  dashboardWin.once('ready-to-show', () => dashboardWin.show());
  dashboardWin.on('closed', () => (dashboardWin = null));
  loadPage(dashboardWin, 'dashboard');
  return dashboardWin;
}
