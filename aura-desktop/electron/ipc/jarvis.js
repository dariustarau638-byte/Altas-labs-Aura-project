import { ipcMain } from 'electron';
import { JARVIS_TOOLS, executeJarvisTool, listJarvisTools } from '../services/jarvisTools.js';
import { getPendingApprovals, resolveApproval } from '../services/approvalGate.js';
import {
  clearClipboardHistory,
  copyClipboardItem,
  listClipboardHistory,
  removeClipboardEntry,
} from '../services/clipboardMemory.js';
import {
  deleteRoutine,
  listRoutines,
  runRoutine,
  saveRoutine,
  toggleRoutine,
} from '../services/routineEngine.js';
import { hideLauncherWindow } from '../windows/launcherWindow.js';
import { captureDesktopScreen } from '../services/connectors.js';

export function registerJarvisIpc() {
  // 1. System Tools & Execution
  ipcMain.handle('jarvis:tools', (_event, category) => listJarvisTools(category));
  ipcMain.handle('jarvis:execute-tool', async (_event, { toolId, params }) =>
    executeJarvisTool(toolId, params),
  );

  // 2. Human-in-the-Loop Security Gate
  ipcMain.handle('jarvis:pending-approvals', () => getPendingApprovals());
  ipcMain.handle('jarvis:resolve-approval', (_event, { approvalId, approved, allowSession }) =>
    resolveApproval(approvalId, { approved, allowSession }),
  );

  // 3. Pieces-style Contextual Clipboard Memory
  ipcMain.handle('clipboard:list', (_event, query) => listClipboardHistory(query));
  ipcMain.handle('clipboard:remove', (_event, id) => removeClipboardEntry(id));
  ipcMain.handle('clipboard:clear', () => clearClipboardHistory());
  ipcMain.handle('clipboard:copy', (_event, id) => copyClipboardItem(id));

  // 4. Jarvis Routines & Automations
  ipcMain.handle('routines:list', () => listRoutines());
  ipcMain.handle('routines:toggle', (_event, { id, enabled }) => toggleRoutine(id, enabled));
  ipcMain.handle('routines:run', (_event, id) => runRoutine(id));
  ipcMain.handle('routines:save', (_event, routine) => saveRoutine(routine));
  ipcMain.handle('routines:delete', (_event, id) => deleteRoutine(id));

  // 5. Screen-Aware Context
  ipcMain.handle('screen:capture-context', async () => captureDesktopScreen());

  // 6. Launcher Controls
  ipcMain.on('launcher:hide', () => hideLauncherWindow());
}
