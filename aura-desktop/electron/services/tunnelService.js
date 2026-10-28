import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT_DIR } from '../paths.js';

let tunnelProcess = null;
let publicUrl = '';
let tunnelStatus = 'stopped'; // 'stopped' | 'starting' | 'active' | 'error'
let restartTimer = null;
let remotePin = '742918'; // 6-digit security PIN

const BIN_PATH = path.join(ROOT_DIR, 'bin', 'cloudflared.exe');

function loadOrGeneratePin() {
  const pinPath = path.join(ROOT_DIR, 'bin', 'remote-pin.txt');
  try {
    if (fs.existsSync(pinPath)) {
      const saved = fs.readFileSync(pinPath, 'utf8').trim();
      if (/^\d{6}$/.test(saved)) {
        remotePin = saved;
        return remotePin;
      }
    }
    // Generate secure 6-digit PIN
    remotePin = String(Math.floor(100000 + Math.random() * 900000));
    fs.writeFileSync(pinPath, remotePin, 'utf8');
  } catch {
    remotePin = '742918';
  }
  return remotePin;
}

loadOrGeneratePin();

/**
 * Returns current status of global Cloudflare tunnel.
 */
export function getTunnelInfo() {
  const directLink = publicUrl ? `${publicUrl}/#pin=${remotePin}` : '';
  const qrCodeUrl = directLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=8&data=${encodeURIComponent(directLink)}`
    : '';

  return {
    status: tunnelStatus,
    publicUrl,
    directLink,
    pin: remotePin,
    qrCodeUrl,
  };
}

/**
 * Validates mobile client security PIN.
 */
export function verifyRemotePin(pinToTest) {
  if (!pinToTest) return false;
  return String(pinToTest).trim() === String(remotePin).trim();
}

/**
 * Starts global secure Cloudflare tunnel to local port 5190.
 */
export function startGlobalTunnel(localPort = 5190) {
  if (tunnelProcess) return;

  if (!fs.existsSync(BIN_PATH)) {
    console.warn('[Aura Tunnel] cloudflared.exe not found in bin directory.');
    tunnelStatus = 'error';
    return;
  }

  tunnelStatus = 'starting';
  console.log(`[Aura Tunnel] Initializing secure global tunnel to http://127.0.0.1:${localPort}...`);

  try {
    tunnelProcess = spawn(
      BIN_PATH,
      ['tunnel', '--url', `http://127.0.0.1:${localPort}`, '--no-autoupdate'],
      {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    const onOutput = (data) => {
      const text = data.toString();
      const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/i);
      if (match && match[0]) {
        publicUrl = match[0];
        tunnelStatus = 'active';
        const directLink = `${publicUrl}/#pin=${remotePin}`;

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🌐 AURA GLOBAL REMOTE ACTIVE (Accessible via 4G/5G/Any Wi-Fi)');
        console.log(`🔗 Public URL:  ${publicUrl}`);
        console.log(`🔑 Access PIN:  ${remotePin}`);
        console.log(`📱 Direct Link: ${directLink}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      }
    };

    tunnelProcess.stdout.on('data', onOutput);
    tunnelProcess.stderr.on('data', onOutput);

    tunnelProcess.on('error', (err) => {
      console.error('[Aura Tunnel] Process error:', err.message);
      tunnelStatus = 'error';
      scheduleRestart(localPort);
    });

    tunnelProcess.on('close', (code) => {
      console.warn(`[Aura Tunnel] Tunnel stopped (code: ${code}).`);
      tunnelProcess = null;
      tunnelStatus = 'stopped';
      publicUrl = '';
      scheduleRestart(localPort);
    });
  } catch (err) {
    console.error('[Aura Tunnel] Could not launch cloudflared:', err);
    tunnelStatus = 'error';
  }
}

function scheduleRestart(localPort) {
  clearTimeout(restartTimer);
  restartTimer = setTimeout(() => {
    console.log('[Aura Tunnel] Retrying global tunnel connection...');
    startGlobalTunnel(localPort);
  }, 8000);
}

/**
 * Stops Cloudflare tunnel on application quit.
 */
export function stopGlobalTunnel() {
  clearTimeout(restartTimer);
  if (tunnelProcess) {
    try {
      tunnelProcess.kill();
    } catch {}
    tunnelProcess = null;
  }
  tunnelStatus = 'stopped';
  publicUrl = '';
}
