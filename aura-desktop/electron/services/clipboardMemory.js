import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

let electronApp, electronClipboard;
try {
  const electron = await import('electron');
  electronApp = electron.app;
  electronClipboard = electron.clipboard;
} catch {}

/**
 * Pieces-style on-device Contextual Clipboard Memory.
 * Automatically captures, categorizes (Code, URL, Color, Text), and indexes
 * copied items with on-device persistence and privacy sanitization.
 */

const MAX_HISTORY = 100;
let items = null;
let lastCapturedText = '';
let monitorInterval = null;
const listeners = new Set();

function getStoragePath() {
  const userDir = electronApp?.getPath ? electronApp.getPath('userData') : path.join(os.tmpdir(), 'aura');
  return path.join(userDir, 'aura-clipboard.json');
}

function loadHistory() {
  if (items !== null) return items;
  try {
    const file = getStoragePath();
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (Array.isArray(data)) {
        items = data;
        return items;
      }
    }
  } catch {}
  items = [];
  return items;
}

function persistHistory() {
  if (!items) return;
  try {
    fs.writeFileSync(getStoragePath(), JSON.stringify(items, null, 2), 'utf8');
  } catch {}
}

export function detectSnippetType(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return { type: 'text', language: null };

  // URL
  if (/^https?:\/\/[^\s]+$/i.test(trimmed)) {
    return { type: 'url', language: null };
  }

  // Hex / RGB / HSL Color
  if (/^#(?:[0-9a-f]{3,4}){1,2}$/i.test(trimmed) || /^rgba?\(.+\)$/i.test(trimmed)) {
    return { type: 'color', language: null };
  }

  // JSON
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      JSON.parse(trimmed);
      return { type: 'code', language: 'json' };
    } catch {}
  }

  // HTML / XML
  if (/^<([a-z0-9-]+)[^>]*>.*<\/\1>$/is.test(trimmed) || /^<!DOCTYPE html/i.test(trimmed)) {
    return { type: 'code', language: 'html' };
  }

  // JavaScript / TypeScript
  if (
    /(?:import\s+.+from|export\s+(?:default\s+)?(?:const|function|class)|const\s+\w+\s*=|function\s+\w+\s*\(|=>\s*\{)/.test(
      trimmed,
    )
  ) {
    return { type: 'code', language: 'javascript' };
  }

  // Python
  if (/(?:def\s+\w+\(.*\):|class\s+\w+:|import\s+\w+|from\s+\w+\s+import|if\s+__name__\s*==\s*['"]__main__['"]:)/.test(trimmed)) {
    return { type: 'code', language: 'python' };
  }

  // SQL
  if (/^(?:SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM|CREATE\s+TABLE|ALTER\s+TABLE)\s+/i.test(trimmed)) {
    return { type: 'code', language: 'sql' };
  }

  // Shell / CLI
  if (/^(?:npm\s+|pnpm\s+|yarn\s+|git\s+|docker\s+|curl\s+|cd\s+|ls\s+|powershell\s+|sudo\s+)/i.test(trimmed)) {
    return { type: 'code', language: 'shell' };
  }

  return { type: 'text', language: null };
}

function isSensitive(text) {
  const t = String(text || '').trim();
  // Credit cards (13-19 digits with Luhn potential)
  if (/\b(?:\d[ -]*?){13,19}\b/.test(t) && !/\n/.test(t) && t.length < 24) return true;
  // Common private keys
  if (/BEGIN (?:RSA|OPENSSH|EC|PRIVATE) KEY/i.test(t)) return true;
  // Passwords in basic key-value patterns
  if (/(?:password|passwd|secret_key)\s*[:=]\s*[^\s]+/i.test(t)) return true;
  return false;
}

export function addClipboardEntry(text, source = 'manual') {
  const clean = String(text || '').trim();
  if (!clean || clean.length > 50000) return null;
  if (isSensitive(clean)) return null;

  const history = loadHistory();
  if (history[0]?.content === clean) return history[0];

  const { type, language } = detectSnippetType(clean);
  const title = clean.split('\n')[0].slice(0, 64) || 'Clipboard Snippet';

  const entry = {
    id: `clip-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title,
    content: clean,
    type,
    language,
    charCount: clean.length,
    lineCount: clean.split('\n').length,
    source,
    createdAt: new Date().toISOString(),
  };

  history.unshift(entry);
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
  persistHistory();

  for (const fn of listeners) {
    try { fn('new_item', entry); } catch {}
  }

  return entry;
}

export function listClipboardHistory(query = '') {
  const history = loadHistory();
  const q = String(query || '').trim().toLowerCase();
  if (!q) return history;
  return history.filter(
    (item) =>
      item.content.toLowerCase().includes(q) ||
      item.title.toLowerCase().includes(q) ||
      (item.language && item.language.toLowerCase().includes(q)) ||
      item.type.toLowerCase().includes(q),
  );
}

export function removeClipboardEntry(id) {
  const history = loadHistory();
  const idx = history.findIndex((h) => h.id === id);
  if (idx >= 0) {
    history.splice(idx, 1);
    persistHistory();
    return true;
  }
  return false;
}

export function clearClipboardHistory() {
  items = [];
  persistHistory();
  return true;
}

export function copyClipboardItem(id) {
  const history = loadHistory();
  const item = history.find((h) => h.id === id);
  if (item) {
    lastCapturedText = item.content;
    if (electronClipboard?.writeText) electronClipboard.writeText(item.content);
    return true;
  }
  return false;
}

export function startClipboardMonitor() {
  if (monitorInterval || !electronClipboard?.readText) return;
  loadHistory();

  try {
    lastCapturedText = electronClipboard.readText().trim();
  } catch {}

  monitorInterval = setInterval(() => {
    try {
      const current = electronClipboard.readText().trim();
      if (current && current !== lastCapturedText && current.length >= 2) {
        lastCapturedText = current;
        addClipboardEntry(current, 'system_clipboard');
      }
    } catch {}
  }, 1000);
}

export function stopClipboardMonitor() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
}

export function onClipboardEvent(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
