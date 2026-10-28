import { app, globalShortcut, session } from 'electron';
import { config } from './config.js';
import { createWidgetWindow } from './windows/widgetWindow.js';
import { openDashboardWindow } from './windows/dashboardWindow.js';
import { createLauncherWindow, toggleLauncherWindow } from './windows/launcherWindow.js';
import { destroyCursorWindow, syncCursorThemeAndState } from './windows/cursorWindow.js';
import { startOrStopCursorCoPilot } from './services/desktopAgent.js';
import { startVisualTimelineRecorder } from './services/visualTimeline.js';
import { startRemoteServer, stopRemoteServer } from './services/remoteServer.js';
import { startClipboardMonitor, stopClipboardMonitor } from './services/clipboardMemory.js';
import { startRoutineScheduler, stopRoutineScheduler } from './services/routineEngine.js';
import {
  flushSettings,
  getSettings,
  initSettings,
  onSettingsChangeMain,
} from './services/settingsStore.js';
import { createSystemTray, destroySystemTray, refreshTray } from './tray.js';
import { registerWidgetIpc } from './ipc/widget.js';
import { registerAiIpc } from './ipc/ai.js';
import { registerFilesIpc } from './ipc/files.js';
import { registerSettingsIpc } from './ipc/settings.js';
import { registerBillingIpc } from './ipc/billing.js';
import { registerCloudWorkspaceIpc } from './ipc/cloudWorkspace.js';
import { registerJarvisIpc } from './ipc/jarvis.js';
import { registerAuthIpc } from './ipc/auth.js';

let widgetWin = null;

const ensureWidgetWindow = () => {
  if (!widgetWin || widgetWin.isDestroyed()) {
    widgetWin = createWidgetWindow();
    widgetWin.on('show', () => refreshTray(() => widgetWin));
    widgetWin.on('hide', () => refreshTray(() => widgetWin));
  }
  return widgetWin;
};

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => openDashboardWindow());

  app.whenReady().then(() => {
    if (process.platform === 'win32') app.setAppUserModelId('ai.aura.companion');

    // Allow microphone access for voice dictation in companion widget
    session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
      callback(permission === 'media' || permission === 'audioCapture');
    });

    const initialSettings = initSettings();

    registerSettingsIpc();
    registerBillingIpc();
    registerCloudWorkspaceIpc();
    registerWidgetIpc();
    registerAiIpc();
    registerFilesIpc();
    registerJarvisIpc();
    registerAuthIpc();

    ensureWidgetWindow();
    createLauncherWindow(); // Pre-warm Raycast/Jarvis launcher window
    createSystemTray(ensureWidgetWindow);
    startVisualTimelineRecorder();
    startRemoteServer();
    startClipboardMonitor();
    startRoutineScheduler();

    // If the user is not authenticated or hasn't finished onboarding, open Login & Onboarding
    if (
      !initialSettings.account?.authenticated ||
      !initialSettings.account?.onboardingCompleted
    ) {
      openDashboardWindow();
    }

    onSettingsChangeMain(() => {
      refreshTray(ensureWidgetWindow);
      syncCursorThemeAndState();
    });

    // Global shortcut: toggle companion widget from anywhere (Ctrl+Shift+Space)
    globalShortcut.register(config.widget.toggleShortcut, () => {
      const win = ensureWidgetWindow();
      if (!win.isVisible()) win.showInactive();
      win.webContents.send('widget:toggle');
    });

    // Global shortcut: open Dashboard Control Center (Ctrl+Shift+D)
    globalShortcut.register(config.widget.dashboardShortcut, () => openDashboardWindow());

    // Global shortcut: toggle Aura Cursor Co-Pilot (Ctrl+Shift+A)
    globalShortcut.register(config.widget.cursorCoPilotShortcut, () => {
      startOrStopCursorCoPilot();
    });

    // Global shortcut: Raycast/Jarvis floating command launcher (Ctrl+/)
    if (config.widget.launcherShortcut) {
      globalShortcut.register(config.widget.launcherShortcut, () => {
        toggleLauncherWindow();
      });
    }
  });

  app.on('before-quit', () => {
    flushSettings();
    destroyCursorWindow();
    stopRemoteServer();
    stopClipboardMonitor();
    stopRoutineScheduler();
    destroySystemTray();
  });
  app.on('will-quit', () => globalShortcut.unregisterAll());

  // With System Tray active, closing the Dashboard does not quit the application.
  app.on('window-all-closed', () => {});
}
