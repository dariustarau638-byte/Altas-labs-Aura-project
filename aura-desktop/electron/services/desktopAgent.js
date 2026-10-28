import { execFile, spawn } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { BrowserWindow, screen, shell } from 'electron';
import { ROOT_DIR } from '../paths.js';
import { getSettings } from './settingsStore.js';
import { captureDesktopScreen } from './connectors.js';
import { config } from '../config.js';
import * as ollama from './ollama.js';
import { streamAnthropic, streamGemini, streamOpenAi } from './cloudProviders.js';
import { parsePlanJson as parseSafePlanJson, validatePlanSteps as validateSafePlanSteps } from '../../shared/desktopPlan.js';
import {
  getCursorCoPilotActive,
  setCursorCoPilotActive,
} from '../windows/cursorWindow.js';

const execFileAsync = promisify(execFile);
const AURA_CONTROL_BIN = path.join(ROOT_DIR, 'bin', 'aura-control.exe');

let monitorTimer = null;
let lastContext = {
  activeWindowTitle: 'Desktop Windows',
  activeProcess: 'explorer',
  cursor: { x: 0, y: 0 },
  screenSize: { width: 1920, height: 1080 },
  updatedAt: Date.now(),
};

const pendingPlans = new Map();
let abortCurrentExecution = false;

/**
 * Queries active foreground window title and process name on Windows.
 */
export async function getActiveWindowInfo() {
  if (process.platform !== 'win32') {
    return { title: 'Desktop', processName: 'system' };
  }

  const psScript = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class AuraWin32 {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
}
"@
$hwnd = [AuraWin32]::GetForegroundWindow()
$sb = New-Object System.Text.StringBuilder 256
[void][AuraWin32]::GetWindowText($hwnd, $sb, 256)
$pidOut = 0
[void][AuraWin32]::GetWindowThreadProcessId($hwnd, [ref]$pidOut)
$procName = ""
if ($pidOut -gt 0) {
  $p = Get-Process -Id $pidOut -ErrorAction SilentlyContinue
  if ($p) { $procName = $p.ProcessName }
}
@{ title = $sb.ToString(); processName = $procName } | ConvertTo-Json -Compress
`;

  try {
    const { stdout } = await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', psScript],
      { timeout: 2200, windowsHide: true },
    );
    const parsed = JSON.parse(stdout.trim());
    return {
      title: parsed.title || 'Desktop Windows',
      processName: parsed.processName || 'explorer',
    };
  } catch {
    return {
      title: lastContext.activeWindowTitle || 'Desktop Windows',
      processName: lastContext.activeProcess || 'explorer',
    };
  }
}

/**
 * Updates live desktop context (active window + cursor coordinates).
 */
export async function refreshLiveDesktopContext() {
  const pt = screen.getCursorScreenPoint();
  const primary = screen.getPrimaryDisplay();
  const winInfo = await getActiveWindowInfo();

  const isAuraWindow =
    /aura/i.test(winInfo.title) || /electron/i.test(winInfo.processName);

  lastContext = {
    activeWindowTitle: isAuraWindow
      ? lastContext.activeWindowTitle || 'Desktop Windows'
      : winInfo.title || 'Desktop Windows',
    activeProcess: isAuraWindow
      ? lastContext.activeProcess || 'explorer'
      : winInfo.processName || 'explorer',
    cursor: { x: pt.x, y: pt.y },
    screenSize: { width: primary.size.width, height: primary.size.height },
    updatedAt: Date.now(),
  };

  broadcastCoPilotStatus();
  return lastContext;
}

export function broadcastCoPilotStatus() {
  const payload = getCoPilotStatus();
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('copilot:status', payload);
    }
  }
}

export function getCoPilotStatus() {
  return {
    active: getCursorCoPilotActive(),
    activeWindowTitle: lastContext.activeWindowTitle || 'Desktop Windows',
    activeProcess: lastContext.activeProcess || 'explorer',
    cursorX: lastContext.cursor?.x || 0,
    cursorY: lastContext.cursor?.y || 0,
    context: lastContext,
    pendingPlans: Array.from(pendingPlans.values()),
  };
}

export function startOrStopCursorCoPilot(enable) {
  const nextActive =
    typeof enable === 'boolean' ? setCursorCoPilotActive(enable) : setCursorCoPilotActive(!getCursorCoPilotActive());

  clearInterval(monitorTimer);
  monitorTimer = null;

  if (nextActive) {
    refreshLiveDesktopContext();
    monitorTimer = setInterval(() => {
      refreshLiveDesktopContext().catch(() => {});
    }, 2500);
  }

  broadcastCoPilotStatus();
  return getCoPilotStatus();
}

/**
 * Intelligent parser for natural language task execution.
 */
export function buildSmartActionSteps(instruction, ctx) {
  const lower = instruction.toLowerCase().trim();
  const steps = [];
  const width = ctx.screenSize?.width || 1920;
  const height = ctx.screenSize?.height || 1080;
  const centerX = Math.round(width / 2);
  const centerY = Math.round(height / 2);

  // 1. NOTEPAD / TEXT NOTES
  if (/notepad|notes?|text file|txt/.test(lower)) {
    steps.push({
      id: 'step-open-notepad',
      type: 'open_app',
      target: 'notepad.exe',
      label: 'Open Notepad',
    });
    steps.push({
      id: 'step-wait-notepad',
      type: 'wait',
      ms: 700,
      label: 'Wait for Notepad window',
    });

    const writeMatch = instruction.match(/(?:type|write|draft|put)\s+(.+)$/i);
    const textToType = writeMatch
      ? writeMatch[1].replace(/^["„']|["”']$/g, '').trim()
      : `Aura Automated Note (${new Date().toLocaleTimeString('en-US')}):\n- Request: ${instruction}\n- Executed successfully on desktop!`;

    steps.push({
      id: 'step-move-notepad',
      type: 'move_cursor',
      x: centerX,
      y: centerY,
      label: `Move cursor to Notepad at (${centerX}, ${centerY})`,
    });
    steps.push({
      id: 'step-click-notepad',
      type: 'click',
      x: centerX,
      y: centerY,
      button: 'left',
      label: 'Click to focus document',
    });
    steps.push({
      id: 'step-type-notepad',
      type: 'type_text',
      text: textToType,
      label: `Type text: "${textToType.slice(0, 48)}${textToType.length > 48 ? '…' : ''}"`,
    });
    return steps;
  }

  // 2. YOUTUBE
  if (/youtube|yt/.test(lower)) {
    let q = instruction.replace(/.*(?:on\s+youtube|youtube\s+(?:and\s+search\s+for|search)?|pe\s+youtube)\s*/i, '').trim();
    if (!q || q.length < 2) q = 'lofi music';
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
    steps.push({
      id: 'step-yt-url',
      type: 'open_url',
      target: url,
      label: `Open YouTube and search: "${q}"`,
    });
    steps.push({
      id: 'step-yt-wait',
      type: 'wait',
      ms: 1000,
      label: 'Wait for YouTube to load',
    });
    steps.push({
      id: 'step-yt-move',
      type: 'move_cursor',
      x: centerX,
      y: Math.round(height * 0.45),
      label: 'Guide cursor to first video result',
    });
    return steps;
  }

  // 3. GOOGLE / WEB SEARCH
  if (/search|google|lookup/.test(lower) && !lower.includes('calc')) {
    let q = instruction.replace(/.*(?:search\s+(?:google\s+for\s+)?|google\s+)\s*/i, '').trim();
    if (!q) q = instruction;
    const url = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
    steps.push({
      id: 'step-search-url',
      type: 'open_url',
      target: url,
      label: `Search Google: "${q}"`,
    });
    steps.push({
      id: 'step-search-wait',
      type: 'wait',
      ms: 900,
      label: 'Wait for search results',
    });
    steps.push({
      id: 'step-search-move',
      type: 'move_cursor',
      x: Math.round(width * 0.35),
      y: Math.round(height * 0.4),
      label: 'Guide cursor to results',
    });
    return steps;
  }

  // 4. DIRECT URL
  const urlMatch = instruction.match(/https?:\/\/[^\s]+/i);
  if (urlMatch) {
    steps.push({
      id: 'step-open-url',
      type: 'open_url',
      target: urlMatch[0],
      label: `Open in browser: ${urlMatch[0]}`,
    });
    return steps;
  }

  // 5. CALCULATOR
  if (/calc|calculator/.test(lower)) {
    steps.push({
      id: 'step-open-calc',
      type: 'open_app',
      target: 'calc.exe',
      label: 'Open Calculator application',
    });
    return steps;
  }

  // 6. PAINT / DRAW
  if (/paint|mspaint|draw/.test(lower)) {
    steps.push({
      id: 'step-open-paint',
      type: 'open_app',
      target: 'mspaint.exe',
      label: 'Open Microsoft Paint',
    });
    return steps;
  }

  // 7. FILE EXPLORER / FOLDERS
  if (/explorer|files?|folders?|my computer/.test(lower)) {
    steps.push({
      id: 'step-open-explorer',
      type: 'open_app',
      target: 'explorer.exe',
      label: 'Open Windows File Explorer',
    });
    return steps;
  }

  // 8. CHROME / BROWSER
  if (/chrome|browser/.test(lower)) {
    steps.push({
      id: 'step-open-chrome',
      type: 'open_url',
      target: 'https://www.google.com',
      label: 'Open Google Chrome browser',
    });
    return steps;
  }

  // 9. SPOTIFY / MUSIC
  if (/spotify|music/.test(lower)) {
    steps.push({
      id: 'step-open-spotify',
      type: 'open_url',
      target: 'spotify:',
      label: 'Open Spotify application',
    });
    return steps;
  }

  // 10. WINDOWS SETTINGS
  if (/settings|control panel/.test(lower)) {
    steps.push({
      id: 'step-open-settings',
      type: 'open_url',
      target: 'ms-settings:',
      label: 'Open Windows Settings',
    });
    return steps;
  }

  // 11. TERMINAL / CMD
  if (/terminal|cmd|powershell|console/.test(lower)) {
    steps.push({
      id: 'step-open-cmd',
      type: 'open_app',
      target: 'cmd.exe',
      label: 'Open Command Prompt (CMD)',
    });
    return steps;
  }

  // 12. TASK MANAGER
  if (/task manager|taskmgr/.test(lower)) {
    steps.push({
      id: 'step-open-taskmgr',
      type: 'open_app',
      target: 'taskmgr.exe',
      label: 'Open Task Manager',
    });
    return steps;
  }

  // 13. MINIMIZE ALL / SHOW DESKTOP
  if (/desktop|minimize|show desktop/.test(lower)) {
    steps.push({
      id: 'step-show-desktop',
      type: 'press_keys',
      keys: 'WIN+D',
      label: 'Minimize all windows and show Desktop (Win+D)',
    });
    return steps;
  }

  // 14. SCROLL
  if (/scroll/.test(lower)) {
    const isUp = /up/.test(lower);
    steps.push({
      id: 'step-scroll',
      type: 'scroll',
      amount: isUp ? 600 : -600,
      label: isUp ? 'Scroll page up' : 'Scroll page down',
    });
    return steps;
  }

  // 15. CURSOR MOVEMENT
  if (/middle|center/.test(lower)) {
    steps.push({
      id: 'step-move-center',
      type: 'move_cursor',
      x: centerX,
      y: centerY,
      label: `Smoothly move cursor to screen center (${centerX}, ${centerY})`,
    });
    return steps;
  }

  if (/top left/.test(lower)) {
    steps.push({
      id: 'step-move-tl',
      type: 'move_cursor',
      x: 100,
      y: 100,
      label: 'Smoothly move cursor to top left (100, 100)',
    });
    return steps;
  }

  if (/top right/.test(lower)) {
    steps.push({
      id: 'step-move-tr',
      type: 'move_cursor',
      x: width - 100,
      y: 100,
      label: `Smoothly move cursor to top right (${width - 100}, 100)`,
    });
    return steps;
  }

  // Explicit coordinates e.g. "click at 500, 300"
  const coordMatch = instruction.match(/(\d{2,4})\s*[,x\s]\s*(\d{2,4})/);
  const targetX = coordMatch ? Number(coordMatch[1]) : ctx.cursor?.x || centerX;
  const targetY = coordMatch ? Number(coordMatch[2]) : ctx.cursor?.y || centerY;

  if (/double click/.test(lower)) {
    steps.push({
      id: 'step-dblclick',
      type: 'click',
      x: targetX,
      y: targetY,
      double: true,
      button: 'left',
      label: `Smoothly move and double click left at (${targetX}, ${targetY})`,
    });
    return steps;
  }

  if (/right click/.test(lower)) {
    steps.push({
      id: 'step-rclick',
      type: 'click',
      x: targetX,
      y: targetY,
      double: false,
      button: 'right',
      label: `Smoothly move and click right at (${targetX}, ${targetY})`,
    });
    return steps;
  }

  if (/click/.test(lower)) {
    steps.push({
      id: 'step-click',
      type: 'click',
      x: targetX,
      y: targetY,
      double: false,
      button: 'left',
      label: `Smoothly move and click left at (${targetX}, ${targetY})`,
    });
    return steps;
  }

  // 16. TYPE TEXT
  const typeMatch = instruction.match(/(?:type|write|input)\s+(.+)$/i);
  if (typeMatch) {
    const cleanText = typeMatch[1].replace(/^["„']|["”']$/g, '').trim();
    steps.push({
      id: 'step-type',
      type: 'type_text',
      text: cleanText,
      label: `Type text: "${cleanText.slice(0, 48)}${cleanText.length > 48 ? '…' : ''}"`,
    });
    return steps;
  }

  // 17. FALLBACK: Move cursor and click
  steps.push({
    id: 'step-guide-move',
    type: 'move_cursor',
    x: targetX,
    y: targetY,
    label: `Smoothly move cursor to (${targetX}, ${targetY})`,
  });
  steps.push({
    id: 'step-guide-click',
    type: 'click',
    x: targetX,
    y: targetY,
    double: false,
    button: 'left',
    label: `Activation click at (${targetX}, ${targetY})`,
  });

  return steps;
}

/**
 * Visual AI first if configured, otherwise local smart action builder.
 */
async function buildActionSteps(instruction, ctx, screenshotDataUrl) {
  const settings = getSettings();
  const ai = settings.ai || {};
  const hasCloud = Boolean(ai.openaiKey?.trim() || ai.anthropicKey?.trim() || ai.geminiKey?.trim());

  if (screenshotDataUrl && (hasCloud || ai.provider === 'ollama')) {
    try {
      const steps = await buildVisualActionSteps(instruction, ctx, screenshotDataUrl);
      if (Array.isArray(steps) && steps.length > 0) {
        return steps;
      }
    } catch {
      // fallback
    }
  }

  return buildSmartActionSteps(instruction, ctx);
}

async function buildVisualActionSteps(instruction, ctx, screenshotDataUrl) {
  if (!screenshotDataUrl) throw new Error('No screen capture available.');
  const settings = getSettings();
  const ai = settings.ai || {};
  const provider = settings.privacy?.localOnlyMode ? 'ollama' : (ai.provider || 'ollama');
  const system = [
    'You create a short, safe desktop action plan from the user request and screenshot.',
    'Only output JSON: {"summary":"...","steps":[...]}. Allowed steps:',
    '- open_app: target one of notepad, paint, calculator, explorer, cmd, chrome, edge, spotify',
    '- open_url: target http/https URL',
    '- click: x, y (pixels), button left/right, double true/false',
    '- move_cursor: x, y (pixels)',
    '- type_text: text',
    '- press_keys: keys one of ENTER,TAB,ESC,CTRL+A,CTRL+C,CTRL+V,WIN+D',
    '- scroll: amount (-500 to 500)',
    '- wait: ms (200-1500)',
    `Screen resolution: ${ctx.screenSize.width}x${ctx.screenSize.height}. Active window: ${ctx.activeWindowTitle}.`,
  ].join('\n');
  const userMessage = { role: 'user', content: `User request: ${instruction}`, imageDataUrl: screenshotDataUrl };
  const signal = AbortSignal.timeout(18000);
  let stream;
  if (provider === 'openai' && ai.openaiKey?.trim()) {
    stream = streamOpenAi({ apiKey: ai.openaiKey, model: ai.openaiModel || 'gpt-4o-mini', messages: [{ role: 'system', content: system }, userMessage], temperature: 0.1, signal });
  } else if (provider === 'anthropic' && ai.anthropicKey?.trim()) {
    stream = streamAnthropic({ apiKey: ai.anthropicKey, model: ai.anthropicModel || 'claude-sonnet-4-20250514', messages: [{ role: 'system', content: system }, userMessage], temperature: 0.1, signal });
  } else if (provider === 'gemini' && ai.geminiKey?.trim()) {
    stream = streamGemini({ apiKey: ai.geminiKey, model: ai.geminiModel || 'gemini-2.5-flash', messages: [{ role: 'system', content: system }, userMessage], temperature: 0.1, signal });
  } else {
    const status = await ollama.getStatus().catch(() => ({ online: false }));
    if (!status.online) throw new Error('Ollama offline');
    const image = screenshotDataUrl.match(/^data:[^;]+;base64,(.+)$/)?.[1];
    if (!image) throw new Error('Invalid image');
    stream = ollama.streamChat({
      model: ai.model || config.ai.defaultModel,
      messages: [{ role: 'system', content: system }, { role: 'user', content: userMessage.content, images: [image] }],
      options: { temperature: 0.1 },
      signal,
    });
  }
  let output = '';
  for await (const chunk of stream) output += chunk;
  const parsed = parseSafePlanJson(output);
  return validateSafePlanSteps(parsed.steps, ctx);
}

/**
 * Creates desktop action control plan.
 */
export async function createDesktopControlPlan(instruction = '') {
  const cleanInstruction = String(instruction || '').trim();
  if (!cleanInstruction) {
    throw new Error('Please specify what desktop task Aura should perform.');
  }

  const ctx = await refreshLiveDesktopContext();
  let screenshot = null;
  try {
    screenshot = await captureDesktopScreen();
  } catch {
    // ignore
  }

  const steps = await buildActionSteps(cleanInstruction, ctx, screenshot?.dataUrl || '');
  const planId = `plan-${crypto.randomUUID().slice(0, 8)}`;

  const plan = {
    id: planId,
    instruction: cleanInstruction,
    createdAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    activeWindow: ctx.activeWindowTitle,
    activeProcess: ctx.activeProcess,
    cursorStart: ctx.cursor,
    screenSize: ctx.screenSize,
    screenshotDataUrl: screenshot?.dataUrl || '',
    status: 'awaiting_approval',
    steps,
  };

  pendingPlans.set(planId, plan);
  broadcastCoPilotStatus();
  return plan;
}

/**
 * Runs individual step using native aura-control.exe
 */
async function runWin32Step(step) {
  if (step.type === 'wait') {
    await new Promise((r) => setTimeout(r, step.ms || 600));
    return;
  }

  if (step.type === 'open_url') {
    await shell.openExternal(step.target);
    await new Promise((r) => setTimeout(r, 800));
    return;
  }

  if (step.type === 'open_app') {
    const child = spawn(step.target, [], { detached: true, shell: true, stdio: 'ignore' });
    child.unref();
    await new Promise((r) => setTimeout(r, 900));
    return;
  }

  if (process.platform !== 'win32') return;

  if (step.type === 'move_cursor') {
    const x = Math.round(step.x);
    const y = Math.round(step.y);
    try {
      await execFileAsync(AURA_CONTROL_BIN, ['move', String(x), String(y), '380'], { timeout: 3500 });
    } catch {
      // fallback PowerShell
      const ps = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})`;
      await execFileAsync('powershell.exe', ['-NoProfile', '-Command', ps], { timeout: 2000, windowsHide: true });
    }
    return;
  }

  if (step.type === 'click') {
    const x = Math.round(step.x ?? lastContext.cursor.x);
    const y = Math.round(step.y ?? lastContext.cursor.y);
    const button = step.button === 'right' ? 'right' : 'left';
    const count = step.double ? '2' : '1';

    try {
      await execFileAsync(AURA_CONTROL_BIN, ['move_click', String(x), String(y), button, count, '380'], { timeout: 4000 });
    } catch {
      const ps = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class M { [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint dx, uint dy, uint d, int e); }
"@
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})
Start-Sleep -Milliseconds 50
[M]::mouse_event(${button === 'right' ? '0x0008' : '0x0002'}, 0, 0, 0, 0)
Start-Sleep -Milliseconds 40
[M]::mouse_event(${button === 'right' ? '0x0010' : '0x0004'}, 0, 0, 0, 0)
`;
      await execFileAsync('powershell.exe', ['-NoProfile', '-Command', ps], { timeout: 3000, windowsHide: true });
    }
    return;
  }

  if (step.type === 'type_text') {
    const text = String(step.text || '');
    try {
      await execFileAsync(AURA_CONTROL_BIN, ['type', text], { timeout: 3500 });
    } catch {
      // fallback
    }
    return;
  }

  if (step.type === 'press_keys') {
    const keys = String(step.keys || '{ENTER}');
    if (keys === '#d' || keys === 'WIN+D') {
      try {
        await execFileAsync(AURA_CONTROL_BIN, ['show_desktop'], { timeout: 2000 });
      } catch {}
      return;
    }
    try {
      await execFileAsync(AURA_CONTROL_BIN, ['key', keys], { timeout: 3000 });
    } catch {}
    return;
  }

  if (step.type === 'scroll') {
    const amt = String(step.amount || -500);
    try {
      await execFileAsync(AURA_CONTROL_BIN, ['scroll', amt], { timeout: 2000 });
    } catch {}
  }
}

/**
 * Approves and executes plan with real cursor motion on screen.
 */
export async function approveAndExecuteDesktopPlan(planId) {
  const plan = pendingPlans.get(planId);
  if (!plan) {
    throw new Error('Action plan was not found or has expired.');
  }

  abortCurrentExecution = false;
  plan.status = 'executing';
  broadcastCoPilotStatus();

  try {
    for (let i = 0; i < plan.steps.length; i++) {
      if (abortCurrentExecution) {
        plan.status = 'rejected';
        plan.error = 'Aborted by user (Esc).';
        break;
      }
      const step = plan.steps[i];
      step.status = 'running';
      broadcastCoPilotStatus();

      await runWin32Step(step);
      step.status = 'done';
      broadcastCoPilotStatus();
    }

    if (plan.status === 'executing') {
      plan.status = 'completed';
    }
  } catch (err) {
    plan.status = 'error';
    plan.error = err.message || 'Execution error.';
  }

  broadcastCoPilotStatus();
  return plan;
}

export function rejectDesktopPlan(planId) {
  abortCurrentExecution = true;
  const plan = pendingPlans.get(planId);
  if (plan) {
    plan.status = 'rejected';
  }
  broadcastCoPilotStatus();
  return plan;
}

export function stopCurrentDesktopExecution() {
  abortCurrentExecution = true;
  broadcastCoPilotStatus();
  return true;
}
