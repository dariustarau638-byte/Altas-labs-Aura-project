import { Menu, Tray, app, nativeImage, screen } from 'electron';
import {
  PERSONALITIES,
  THEMES,
  displayName,
  getPersonality,
  getTheme,
} from '../shared/settings.js';
import { config } from './config.js';
import { getSettings, updateSettings } from './services/settingsStore.js';
import { startOrStopCursorCoPilot } from './services/desktopAgent.js';
import { getCursorCoPilotActive } from './windows/cursorWindow.js';
import { openDashboardWindow } from './windows/dashboardWindow.js';

let tray = null;

function hexToRgb(hex) {
  const clean = String(hex).replace('#', '');
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Programmatically generates a round tray icon (32x32 BGRA) in the Aura Orb style,
 * tinted with the active theme colors.
 */
function createOrbTrayIcon(themeId) {
  const size = 32;
  const buf = Buffer.alloc(size * size * 4);
  const theme = getTheme(themeId);
  const c1 = hexToRgb(theme.orb[0]);
  const c2 = hexToRgb(theme.orb[1]);
  const c3 = hexToRgb(theme.orb[2]);

  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const radius = 13.5;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);
      const offset = (y * size + x) * 4;

      if (dist > radius + 1) {
        buf[offset + 3] = 0;
        continue;
      }

      // Smooth antialiased edge
      const edgeAlpha = dist > radius ? Math.max(0, 1 - (dist - radius)) : 1;

      // Diagonal gradient + top-left highlight reflection
      const t = Math.min(1, Math.max(0, (x + y) / (size * 1.8)));
      const u = Math.min(1, Math.max(0, (size - x + y) / (size * 2)));
      const highlight = Math.max(0, 1 - Math.hypot(x - 10, y - 9) / 11) * 0.55;

      let r = c1.r * (1 - t) + c2.r * t;
      let g = c1.g * (1 - t) + c2.g * t;
      let b = c1.b * (1 - t) + c2.b * t;

      r = r * (1 - u * 0.35) + c3.r * (u * 0.35);
      g = g * (1 - u * 0.35) + c3.g * (u * 0.35);
      b = b * (1 - u * 0.35) + c3.b * (u * 0.35);

      r = Math.min(255, Math.round(r + (255 - r) * highlight));
      g = Math.min(255, Math.round(g + (255 - g) * highlight));
      b = Math.min(255, Math.round(b + (255 - b) * highlight));

      // BGRA format for Windows / Electron createFromBitmap
      buf[offset] = b;
      buf[offset + 1] = g;
      buf[offset + 2] = r;
      buf[offset + 3] = Math.round(edgeAlpha * 255);
    }
  }

  return nativeImage.createFromBitmap(buf, { width: size, height: size });
}

/** Resets the companion widget position to the top-center notch. */
function resetWidgetPosition(getWidgetWindow) {
  const win = getWidgetWindow?.();
  if (!win || win.isDestroyed()) return;
  const { width, height } = config.widget;
  const primary = screen.getPrimaryDisplay();
  const x = Math.round(primary.bounds.x + (primary.bounds.width - width) / 2);
  const y = primary.bounds.y;
  const anchor = { h: 'center', v: 'top' };
  win.setBounds({ x, y, width, height });
  if (!win.isVisible()) win.showInactive();
  updateSettings({ widgetState: { x, y, anchor } });
}

export function refreshTray(getWidgetWindow) {
  if (!tray || tray.isDestroyed()) return;
  const settings = getSettings();
  const name = displayName(settings);
  const persona = getPersonality(settings.assistant.personality);
  const theme = getTheme(settings.appearance.theme);
  const win = getWidgetWindow?.();
  const isVisible = Boolean(win && !win.isDestroyed() && win.isVisible());
  const copilotActive = getCursorCoPilotActive();

  tray.setImage(createOrbTrayIcon(settings.appearance.theme));
  tray.setToolTip(`${name} – AI Companion (${persona.label})`);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `${name} · ${persona.emoji} ${persona.label}`,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: copilotActive
        ? '🟢 Stop Cursor Co-Pilot (Ctrl+Shift+A)'
        : '👁️ Enable Live Co-Pilot (Ctrl+Shift+A)',
      click: () => {
        startOrStopCursorCoPilot();
        refreshTray(getWidgetWindow);
      },
    },
    {
      label: 'Toggle Chat Panel (Ctrl+Shift+Space)',
      click: () => {
        const w = getWidgetWindow?.();
        if (!w || w.isDestroyed()) return;
        if (!w.isVisible()) w.showInactive();
        w.webContents.send('widget:toggle');
        refreshTray(getWidgetWindow);
      },
    },
    {
      label: isVisible ? 'Hide Desktop Companion' : 'Show Desktop Companion',
      click: () => {
        const w = getWidgetWindow?.();
        if (!w || w.isDestroyed()) return;
        if (w.isVisible()) w.hide();
        else w.showInactive();
        refreshTray(getWidgetWindow);
      },
    },
    {
      label: 'Reset Widget to Top Notch',
      click: () => resetWidgetPosition(getWidgetWindow),
    },
    { type: 'separator' },
    {
      label: 'Quick Personality',
      submenu: PERSONALITIES.map((p) => ({
        label: `${p.emoji} ${p.label}`,
        type: 'radio',
        checked: settings.assistant.personality === p.id,
        click: () => updateSettings({ assistant: { personality: p.id } }),
      })),
    },
    {
      label: `Theme (${theme.label})`,
      submenu: THEMES.map((t) => ({
        label: t.label,
        type: 'radio',
        checked: settings.appearance.theme === t.id,
        click: () => updateSettings({ appearance: { theme: t.id } }),
      })),
    },
    { type: 'separator' },
    {
      label: 'Open Dashboard (Ctrl+Shift+D)',
      click: () => openDashboardWindow(),
    },
    { type: 'separator' },
    {
      label: `Quit ${name}`,
      click: () => app.quit(),
    },
  ]);

  tray.setContextMenu(contextMenu);
}

export function createSystemTray(getWidgetWindow) {
  if (tray && !tray.isDestroyed()) return tray;
  const settings = getSettings();
  tray = new Tray(createOrbTrayIcon(settings.appearance.theme));

  // Left click on tray icon: show and toggle companion widget
  tray.on('click', () => {
    const win = getWidgetWindow?.();
    if (!win || win.isDestroyed()) return;
    if (!win.isVisible()) {
      win.showInactive();
    }
    win.webContents.send('widget:toggle');
    refreshTray(getWidgetWindow);
  });

  // Double click on tray icon: open Dashboard Control Center
  tray.on('double-click', () => {
    openDashboardWindow();
  });

  refreshTray(getWidgetWindow);
  return tray;
}

export function destroySystemTray() {
  if (tray && !tray.isDestroyed()) {
    tray.destroy();
  }
  tray = null;
}
