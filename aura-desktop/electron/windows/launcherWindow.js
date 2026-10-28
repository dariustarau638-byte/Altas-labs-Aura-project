import { BrowserWindow, screen } from 'electron';
import { PRELOAD_PATH, loadPage } from '../paths.js';

let launcherWin = null;

export function createLauncherWindow() {
  if (launcherWin && !launcherWin.isDestroyed()) return launcherWin;

  const primary = screen.getPrimaryDisplay();
  const width = 640;
  const height = 440;
  const x = Math.round(primary.bounds.x + (primary.bounds.width - width) / 2);
  const y = Math.round(primary.bounds.y + primary.bounds.height * 0.22); // slightly above vertical center

  launcherWin = new BrowserWindow({
    width,
    height,
    x,
    y,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: true,
    show: false,
    title: 'Aura Spotlight Launcher',
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  launcherWin.on('blur', () => {
    // Hide when clicking outside
    if (launcherWin && !launcherWin.isDestroyed() && launcherWin.isVisible()) {
      launcherWin.hide();
    }
  });

  loadPage(launcherWin, 'launcher');
  return launcherWin;
}

export function toggleLauncherWindow() {
  const win = launcherWin && !launcherWin.isDestroyed() ? launcherWin : createLauncherWindow();
  if (win.isVisible()) {
    win.hide();
  } else {
    // Reposition centered above screen midpoint
    const primary = screen.getPrimaryDisplay();
    const width = 640;
    const height = 440;
    const x = Math.round(primary.bounds.x + (primary.bounds.width - width) / 2);
    const y = Math.round(primary.bounds.y + primary.bounds.height * 0.22);
    win.setBounds({ x, y, width, height });
    win.show();
    win.focus();
    win.webContents.send('launcher:focused');
  }
}

export function hideLauncherWindow() {
  if (launcherWin && !launcherWin.isDestroyed() && launcherWin.isVisible()) {
    launcherWin.hide();
  }
}

export function getLauncherWindow() {
  return launcherWin;
}
