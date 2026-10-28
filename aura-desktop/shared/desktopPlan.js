const APP_TARGETS = {
  notepad: { command: 'notepad.exe', label: 'Notepad' },
  paint: { command: 'mspaint.exe', label: 'Paint' },
  calculator: { command: 'calc.exe', label: 'Calculator' },
  calc: { command: 'calc.exe', label: 'Calculator' },
  explorer: { command: 'explorer.exe', label: 'File Explorer' },
  cmd: { command: 'cmd.exe', label: 'Command Prompt' },
  terminal: { command: 'cmd.exe', label: 'Terminal' },
  taskmgr: { command: 'taskmgr.exe', label: 'Task Manager' },
  chrome: { command: 'chrome.exe', label: 'Google Chrome' },
  edge: { command: 'msedge.exe', label: 'Microsoft Edge' },
  msedge: { command: 'msedge.exe', label: 'Microsoft Edge' },
  spotify: { command: 'spotify.exe', label: 'Spotify' },
  code: { command: 'code.cmd', label: 'VS Code' },
  vscode: { command: 'code.cmd', label: 'VS Code' },
};

const SAFE_KEYS = new Set([
  'ENTER',
  'TAB',
  'ESC',
  'CTRL+A',
  'CTRL+C',
  'CTRL+V',
  'CTRL+Z',
  'CTRL+Y',
  'CTRL+L',
  'WIN+D',
]);

const SEND_KEYS = {
  ENTER: '{ENTER}',
  TAB: '{TAB}',
  ESC: '{ESC}',
  'CTRL+A': '^a',
  'CTRL+C': '^c',
  'CTRL+V': '^v',
  'CTRL+Z': '^z',
  'CTRL+Y': '^y',
  'CTRL+L': '^l',
  'WIN+D': '#d',
};

export function parsePlanJson(raw) {
  const source = String(raw || '').replace(/```(?:json)?/gi, '').replace(/```/g, '');
  const start = source.indexOf('{');
  const end = source.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('Aura was unable to generate a valid plan. Try a clearer instruction.');
  try { return JSON.parse(source.slice(start, end + 1)); }
  catch { throw new Error('AI plan was not valid JSON. Please try again with a simpler instruction.'); }
}

export function validatePlanSteps(rawSteps, ctx) {
  if (!Array.isArray(rawSteps)) throw new Error('The plan does not contain executable steps.');
  const width = Number(ctx?.screenSize?.width);
  const height = Number(ctx?.screenSize?.height);
  if (!(width > 0 && height > 0)) throw new Error('Screen dimensions are not available.');
  const steps = [];

  for (const raw of rawSteps) {
    if (steps.length >= 8) break;
    if (!raw || typeof raw !== 'object') continue;
    const type = String(raw.type || '');
    const step = { id: `step-${steps.length + 1}`, status: 'pending' };

    if (type === 'open_app') {
      const app = APP_TARGETS[String(raw.target || '').toLowerCase()];
      if (!app) continue;
      Object.assign(step, { type, target: app.command, label: `Open ${app.label}` });
    } else if (type === 'open_url') {
      let target;
      try { target = new URL(String(raw.target || '')); } catch { continue; }
      if (!['http:', 'https:'].includes(target.protocol)) continue;
      Object.assign(step, { type, target: target.href, label: `Open ${target.hostname}` });
    } else if (type === 'click' || type === 'move_cursor') {
      const x = Math.round(Number(raw.x));
      const y = Math.round(Number(raw.y));
      if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x >= width || y >= height) continue;
      const button = raw.button === 'right' ? 'right' : 'left';
      Object.assign(step, {
        type,
        x,
        y,
        button,
        double: type === 'click' && raw.double === true,
        label: type === 'click'
          ? `Click ${button} at (${x}, ${y})`
          : `Move cursor to (${x}, ${y})`,
      });
    } else if (type === 'type_text') {
      const text = String(raw.text || '').trim().slice(0, 1200);
      if (!text) continue;
      Object.assign(step, { type, text, label: `Type: "${text.slice(0, 72)}${text.length > 72 ? '…' : ''}"` });
    } else if (type === 'press_keys') {
      const keys = String(raw.keys || '').toUpperCase().replace(/\s/g, '');
      if (!SAFE_KEYS.has(keys)) continue;
      Object.assign(step, { type, keys: SEND_KEYS[keys] || keys, label: `Press ${keys}` });
    } else if (type === 'scroll') {
      const amount = Number(raw.amount) || -500;
      Object.assign(step, { type, amount, label: amount < 0 ? 'Scroll down' : 'Scroll up' });
    } else if (type === 'wait') {
      const ms = Math.max(200, Math.min(2000, Number(raw.ms) || 500));
      Object.assign(step, { type, ms, label: 'Wait' });
    } else continue;

    steps.push(step);
  }

  if (!steps.length) throw new Error('Could not convert request into a safe plan. Please describe the desired application and action, then try again.');
  return steps;
}
