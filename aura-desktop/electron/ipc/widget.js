import { BrowserWindow, Menu, app, ipcMain, screen } from 'electron';
import { config } from '../config.js';
import { clampPillToWorkArea, clampWindowToWorkArea } from '../windows/widgetWindow.js';
import { openDashboardWindow } from '../windows/dashboardWindow.js';
import { getCursorCoPilotActive } from '../windows/cursorWindow.js';
import { startOrStopCursorCoPilot } from '../services/desktopAgent.js';
import { updateSettings } from '../services/settingsStore.js';

let dragTimer = null;

function stopDrag() {
  clearInterval(dragTimer);
  dragTimer = null;
}

const isValidRect = (r) => r && ['x', 'y', 'width', 'height'].every((k) => Number.isFinite(r[k]));

export function registerWidgetIpc() {
  // Renderer signals when the cursor enters or leaves the visible widget bounds.
  ipcMain.on('widget:set-interactive', (event, interactive) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    if (interactive) win.setIgnoreMouseEvents(false);
    else win.setIgnoreMouseEvents(true, { forward: true });
  });

  ipcMain.on('widget:focus', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.show();
    win?.focus();
  });

  /**
   * Manual dragging to support frameless transparent windows across display scales.
   */
  ipcMain.on('widget:drag-start', (event, { mode = 'window', pill } = {}) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    const start = screen.getCursorScreenPoint();
    const [wx, wy] = win.getPosition();
    const offset = { x: start.x - wx, y: start.y - wy };
    const { width, height } = config.widget;
    const pillMode = mode === 'pill' && isValidRect(pill);

    stopDrag();
    dragTimer = setInterval(() => {
      if (win.isDestroyed()) return stopDrag();
      const cursor = screen.getCursorScreenPoint();
      const { workArea } = screen.getDisplayNearestPoint(cursor);
      const nx = cursor.x - offset.x;
      const ny = cursor.y - offset.y;
      const { x, y } = pillMode
        ? clampPillToWorkArea(nx, ny, pill, workArea)
        : clampWindowToWorkArea(nx, ny, workArea);
      win.setBounds({ x, y, width, height });
    }, 16);
  });

  ipcMain.on('widget:drag-end', (event) => {
    stopDrag();
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    const [x, y] = win.getPosition();
    updateSettings({ widgetState: { x, y } });
  });

  ipcMain.handle('widget:compute-anchor', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return null;
    const { width, height } = config.widget;
    const primary = screen.getPrimaryDisplay();
    const x = Math.round(primary.bounds.x + (primary.bounds.width - width) / 2);
    const y = primary.bounds.y;
    const anchor = { h: 'center', v: 'top' };
    return { anchor, x, y };
  });

  ipcMain.handle('widget:apply-bounds', (event, { x, y } = {}) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return false;
    const { width, height } = config.widget;
    const primary = screen.getPrimaryDisplay();
    const nx = Math.round(x ?? primary.bounds.x + (primary.bounds.width - width) / 2);
    const ny = Math.round(y ?? primary.bounds.y);
    win.setBounds({ x: nx, y: ny, width, height });
    updateSettings({ widgetState: { x: nx, y: ny, anchor: { h: 'center', v: 'top' } } });
    return true;
  });

  ipcMain.on('widget:context-menu', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const copilotActive = getCursorCoPilotActive();
    Menu.buildFromTemplate([
      {
        label: copilotActive
          ? '🟢 Stop Mouse Control (Ctrl+Shift+A)'
          : '🖱️ Enable Mouse Control (Ctrl+Shift+A)',
        click: () => startOrStopCursorCoPilot(),
      },
      { type: 'separator' },
      { label: 'Open Dashboard (Ctrl+Shift+D)', click: () => openDashboardWindow() },
      {
        label: 'Reset to Top Notch',
        click: () => {
          if (!win || win.isDestroyed()) return;
          const { width, height } = config.widget;
          const primary = screen.getPrimaryDisplay();
          const x = Math.round(primary.bounds.x + (primary.bounds.width - width) / 2);
          const y = primary.bounds.y;
          const anchor = { h: 'center', v: 'top' };
          win.setBounds({ x, y, width, height });
          updateSettings({ widgetState: { x, y, anchor } });
        },
      },
      { label: 'Hide in System Tray', click: () => win?.hide() },
      { type: 'separator' },
      { label: 'Quit Aura', click: () => app.quit() },
    ]).popup({ window: win });
  });

  ipcMain.on('app:open-dashboard', () => openDashboardWindow());
  ipcMain.on('app:quit', () => app.quit());
}
