import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

/**
 * Persistent disk storage for Aura conversation history
 * (`<userData>/aura-chats.json`).
 */
const MAX_SESSIONS = 40;
let sessions = null;

function getChatsFilePath() {
  return path.join(app.getPath('userData'), 'aura-chats.json');
}

function ensureLoaded() {
  if (sessions !== null) return sessions;
  try {
    const file = getChatsFilePath();
    if (fs.existsSync(file)) {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (Array.isArray(raw)) {
        sessions = raw;
        return sessions;
      }
    }
  } catch {
    // ignore corrupt history file
  }
  sessions = [];
  return sessions;
}

function flushChats() {
  if (sessions === null) return;
  try {
    fs.writeFileSync(getChatsFilePath(), JSON.stringify(sessions, null, 2), 'utf8');
  } catch {
    // ignore write errors
  }
}

export function listSavedChats() {
  return ensureLoaded();
}

export function saveChatSession({ id, title, messages }) {
  const list = ensureLoaded();
  if (!Array.isArray(messages) || messages.length === 0) return list;

  const cleanMessages = messages
    .filter((m) => m && (m.content || m.imageDataUrl))
    .slice(-40)
    .map((m) => ({
      id: m.id || crypto.randomUUID(),
      role: m.role === 'user' ? 'user' : 'assistant',
      content: String(m.content || '').slice(0, 8000),
      ...(m.error ? { error: true } : {}),
    }));

  if (cleanMessages.length === 0) return list;

  const firstUserMsg = cleanMessages.find((m) => m.role === 'user')?.content || 'Aura Conversation';
  const resolvedTitle =
    (title || firstUserMsg).replace(/\s+/g, ' ').trim().slice(0, 68) || 'Aura Conversation';

  const sessionId = id || crypto.randomUUID();
  const updatedAt = new Date().toISOString();
  const entry = {
    id: sessionId,
    title: resolvedTitle,
    updatedAt,
    messageCount: cleanMessages.length,
    preview:
      cleanMessages[cleanMessages.length - 1]?.content?.replace(/\s+/g, ' ').slice(0, 110) || '',
    messages: cleanMessages,
  };

  const existingIdx = list.findIndex((s) => s.id === sessionId);
  if (existingIdx >= 0) {
    list.splice(existingIdx, 1);
  }
  list.unshift(entry);
  if (list.length > MAX_SESSIONS) list.length = MAX_SESSIONS;

  flushChats();
  return list;
}

export function deleteChatSession(sessionId) {
  const list = ensureLoaded();
  sessions = list.filter((s) => s.id !== sessionId);
  flushChats();
  return sessions;
}

export function clearAllChatSessions() {
  sessions = [];
  flushChats();
  return sessions;
}
