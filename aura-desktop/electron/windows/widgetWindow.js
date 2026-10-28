import { BrowserWindow, screen } from 'electron';
import { config } from '../config.js';
import { PRELOAD_PATH, loadPage } from '../paths.js';
import { getSettings, updateSettings } from '../services/settingsStore.js';

/**
 * Widget Window: Top Notch (MacBook Notch style).
 * When not hovered, it is a discreet black notch (180x32px).
 * When the cursor hovers over it, it expands downward to reveal the full Aura companion.
 */
export function createWidgetWindow() {
  const { width, height } = config.widget;
  const { x, y } = resolveTopNotchPosition();

  const win = new BrowserWindow({
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
    hasShadow: false,
    show: false,
    title: 'Aura Notch',
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });

  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setIgnoreMouseEvents(true, { forward: true });

  win.once('ready-to-show', () => win.showInactive());

  loadPage(win, 'widget');
  return win;
}

/** Positions the window horizontally centered at the top edge of the primary display. */
export function resolveTopNotchPosition() {
  const { width } = config.widget;
  const primary = screen.getPrimaryDisplay();
  const bounds = primary.bounds;

  const position = {
    x: Math.round(bounds.x + (bounds.width - width) / 2),
    y: bounds.y, // Flush against the top edge
  };

  updateSettings({
    widgetState: {
      x: position.x,
      y: position.y,
      anchor: { h: 'center', v: 'top' },
      companionStyle: 'notch',
    },
  });

  return position;
}

const clamp = (value, min, max) => Math.round(Math.min(Math.max(value, min), max));

export function clampWindowToWorkArea(x, y, wa) {
  const { width, height } = config.widget;
  return {
    x: clamp(x, wa.x, wa.x + wa.width - width),
    y: wa.y,
  };
}

export function clampPillToWorkArea(x, y, pill, wa) {
  const { width } = config.widget;
  return {
    x: clamp(x, wa.x, wa.x + wa.width - width),
    y: wa.y,
  };
}
