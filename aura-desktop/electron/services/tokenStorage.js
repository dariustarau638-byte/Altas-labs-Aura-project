import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

let electronApp, electronSafeStorage;
try {
  const electron = await import('electron');
  electronApp = electron.app;
  electronSafeStorage = electron.safeStorage;
} catch {}

const FALLBACK_SECRET = 'atlas-desktop-storage-key-2026';

function getStoragePath() {
  const baseDir = electronApp?.getPath ? electronApp.getPath('userData') : path.join(os.tmpdir(), 'Aura');
  return path.join(baseDir, 'aura-auth.json');
}

/**
 * Encrypt a string using hardware/OS safeStorage (Windows DPAPI, macOS Keychain),
 * or AES-256-GCM fallback if running outside Electron main.
 */
function encryptSecret(plainText) {
  if (electronSafeStorage?.isEncryptionAvailable?.()) {
    try {
      const encrypted = electronSafeStorage.encryptString(plainText);
      return { type: 'safeStorage', data: encrypted.toString('base64') };
    } catch {}
  }
  // Fallback AES-256-GCM
  const iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(FALLBACK_SECRET, 'atlas-salt', 32);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    type: 'aes-gcm',
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    data: enc.toString('hex'),
  };
}

/**
 * Decrypt a stored secret.
 */
function decryptSecret(record) {
  if (!record || !record.data) return null;
  if (record.type === 'safeStorage' && electronSafeStorage?.decryptString) {
    try {
      const buf = Buffer.from(record.data, 'base64');
      return electronSafeStorage.decryptString(buf);
    } catch {}
  }
  if (record.type === 'aes-gcm') {
    try {
      const key = crypto.scryptSync(FALLBACK_SECRET, 'atlas-salt', 32);
      const iv = Buffer.from(record.iv, 'hex');
      const tag = Buffer.from(record.tag, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      const dec = Buffer.concat([
        decipher.update(Buffer.from(record.data, 'hex')),
        decipher.final(),
      ]);
      return dec.toString('utf8');
    } catch {}
  }
  return null;
}

let cachedSession = null;

export function loadSession() {
  if (cachedSession !== null) return cachedSession;
  try {
    const file = getStoragePath();
    if (fs.existsSync(file)) {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
      const token = decryptSecret(raw.tokenEncrypted);
      if (token) {
        cachedSession = {
          token,
          user: raw.user || null,
          savedAt: raw.savedAt || null,
        };
        return cachedSession;
      }
    }
  } catch (err) {
    console.warn('[tokenStorage] Error loading auth session:', err.message);
  }
  cachedSession = { token: null, user: null, savedAt: null };
  return cachedSession;
}

export function saveSession(token, user = null) {
  if (!token) {
    return clearSession();
  }
  const tokenEncrypted = encryptSecret(token);
  const session = {
    token,
    user: user || {},
    savedAt: new Date().toISOString(),
  };
  cachedSession = session;

  try {
    const file = getStoragePath();
    const dir = path.dirname(file);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ tokenEncrypted, user, savedAt: session.savedAt }, null, 2), 'utf8');
  } catch (err) {
    console.error('[tokenStorage] Failed to persist auth session:', err);
  }

  return cachedSession;
}

export function clearSession() {
  cachedSession = { token: null, user: null, savedAt: null };
  try {
    const file = getStoragePath();
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  } catch {}
  return cachedSession;
}

export function getAuthToken() {
  return loadSession().token;
}

export function getAuthUser() {
  return loadSession().user;
}

export function isAuthenticated() {
  return Boolean(loadSession().token);
}
