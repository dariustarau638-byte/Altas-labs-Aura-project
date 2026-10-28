import fs from 'node:fs';
import path from 'node:path';
import { app, safeStorage } from 'electron';
import { Daytona } from '@daytona/sdk';

const CREDENTIAL_FILE = 'cloud-workspace-credentials.bin';
const STATE_FILE = 'cloud-workspace.json';

function readCredential() {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Key protection is unavailable on this system.');
  }
  const file = path.join(app.getPath('userData'), CREDENTIAL_FILE);
  if (!fs.existsSync(file)) return '';
  return safeStorage.decryptString(fs.readFileSync(file));
}

function readState() {
  try {
    return JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), STATE_FILE), 'utf8'));
  } catch {
    return {};
  }
}

function writeState(state) {
  const file = path.join(app.getPath('userData'), STATE_FILE);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(state, null, 2), 'utf8');
}

function client() {
  const apiKey = readCredential();
  if (!apiKey) throw new Error('Add your Daytona API key first.');
  return new Daytona({ apiKey });
}

export function hasCloudWorkspaceKey() {
  try {
    return Boolean(readCredential());
  } catch {
    return false;
  }
}

export function saveCloudWorkspaceKey(value) {
  const apiKey = String(value || '').trim();
  if (apiKey.length < 12 || apiKey.length > 2048) throw new Error('The API key does not appear to be valid.');
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Aura cannot securely store keys on this system.');
  }
  const file = path.join(app.getPath('userData'), CREDENTIAL_FILE);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, safeStorage.encryptString(apiKey));
  return { connected: true };
}

export function removeCloudWorkspaceKey() {
  const file = path.join(app.getPath('userData'), CREDENTIAL_FILE);
  try { fs.unlinkSync(file); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  return { connected: false };
}

export async function getCloudWorkspaceStatus() {
  const state = readState();
  if (!hasCloudWorkspaceKey()) return { connected: false, sandbox: null };
  if (!state.sandboxId) return { connected: true, sandbox: null };
  try {
    const sandbox = await client().get(state.sandboxId);
    return {
      connected: true,
      sandbox: { id: sandbox.id, name: sandbox.name, state: sandbox.state || 'available' },
    };
  } catch (error) {
    return { connected: true, sandbox: null, notice: error.message };
  }
}

export async function createCloudWorkspace() {
  const state = readState();
  if (state.sandboxId) {
    try { await client().get(state.sandboxId); throw new Error('Aura already has an associated VM.'); }
    catch (error) { if (error.message === 'Aura already has an associated VM.') throw error; }
  }
  const sandbox = await client().create({
    snapshot: 'windows-small',
    name: `aura-cloud-${Date.now()}`,
    autoStopInterval: 60,
    autoDeleteInterval: -1,
  }, { timeout: 180 });
  writeState({ sandboxId: sandbox.id, name: sandbox.name, createdAt: new Date().toISOString() });
  return { id: sandbox.id, name: sandbox.name, state: sandbox.state || 'creating' };
}

export async function openCloudWorkspaceTerminal() {
  const state = readState();
  if (!state.sandboxId) throw new Error('Create the cloud VM first.');
  const sandbox = await client().get(state.sandboxId);
  if (sandbox.state !== 'started') await sandbox.start();
  const link = await sandbox.getSignedPreviewUrl(22222, 3600);
  return { url: link.url, expiresInSeconds: 3600 };
}

export async function stopCloudWorkspace() {
  const state = readState();
  if (!state.sandboxId) throw new Error('No active VM exists.');
  await client().get(state.sandboxId).then((sandbox) => sandbox.stop());
  return { stopped: true };
}

export async function deleteCloudWorkspace() {
  const state = readState();
  if (!state.sandboxId) return { deleted: false };
  await client().get(state.sandboxId).then((sandbox) => sandbox.delete(60, true));
  writeState({});
  return { deleted: true };
}
