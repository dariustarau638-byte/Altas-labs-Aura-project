import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { exec, spawn } from 'node:child_process';
import { desktopCapturer, screen } from 'electron';
import { buildSystemPrompt } from '../../shared/prompt.js';
import { getSettings } from './settingsStore.js';
import { getSystemStats } from './systemMonitor.js';
import * as ollama from './ollama.js';
import { streamAnthropic, streamGemini, streamOpenAi } from './cloudProviders.js';
import {
  approveAndExecuteDesktopPlan,
  createDesktopControlPlan,
  getCoPilotStatus,
  refreshLiveDesktopContext,
  rejectDesktopPlan,
  startOrStopCursorCoPilot,
} from './desktopAgent.js';
import {
  LOCAL_ACTIONS_CATALOG,
  executeLocalAction,
  runNaturalLanguageLocalAction,
} from './localActions.js';
import { captureDesktopScreen } from './connectors.js';
import {
  getTunnelInfo,
  startGlobalTunnel,
  stopGlobalTunnel,
  verifyRemotePin,
} from './tunnelService.js';
import { ROOT_DIR } from '../paths.js';

let server = null;
let currentPort = 5190;
const sseClients = new Set();
const activeProcesses = new Map(); // id -> childProcess

function getCloudConfig(provider, ai) {
  if (provider === 'openai') return { apiKey: ai.openaiKey, model: ai.openaiModel || 'gpt-4o-mini' };
  if (provider === 'anthropic') return { apiKey: ai.anthropicKey, model: ai.anthropicModel || 'claude-sonnet-4-20250514' };
  if (provider === 'gemini') return { apiKey: ai.geminiKey, model: ai.geminiModel || 'gemini-4-argon' };
  return null;
}

async function generateRemoteChatReply(prompt, conversation = []) {
  const settings = getSettings();
  const ai = settings.ai || {};
  let provider = ai.provider || 'ollama';
  if (provider === 'ollama' && ai.autoFallbackToCloud && !(await ollama.getStatus()).online) {
    provider = ['gemini', 'openai', 'anthropic'].find((id) => getCloudConfig(id, ai)?.apiKey?.trim()) || provider;
  }

  const messages = [
    { role: 'system', content: buildSystemPrompt(settings) },
    ...conversation
      .filter((message) => ['user', 'assistant'].includes(message?.role))
      .slice(-18)
      .map((message) => ({
        role: message.role,
        content: String(message.content || '').slice(0, 12000),
      })),
  ];
  const lastMessage = messages[messages.length - 1];
  if (lastMessage?.role !== 'user' || lastMessage.content !== prompt) {
    messages.push({ role: 'user', content: prompt });
  }
  const temperature = settings.assistant?.creativity ?? 0.7;
  let stream;
  if (provider === 'ollama') {
    stream = ollama.streamChat({
      model: ai.model,
      messages,
      options: { temperature },
      signal: AbortSignal.timeout(120000),
    });
  } else {
    const config = getCloudConfig(provider, ai);
    if (!config?.apiKey?.trim()) {
      throw new Error(`Configure an AI provider in Control Center → Connectors & Cloud before using mobile chat.`);
    }
    const options = { ...config, messages, temperature, signal: AbortSignal.timeout(120000) };
    stream = provider === 'openai'
      ? streamOpenAi(options)
      : provider === 'anthropic'
        ? streamAnthropic(options)
        : streamGemini(options);
  }

  let response = '';
  for await (const chunk of stream) response += chunk;
  return response.trim();
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
};

/**
 * Returns IPv4 network addresses on local interfaces (Wi-Fi, Ethernet).
 */
export function getLocalNetworkIps() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push({
          interface: name,
          ip: net.address,
          url: `http://${net.address}:${currentPort}`,
        });
      }
    }
  }
  return addresses;
}

/**
 * Broadcasts a real-time event to all connected SSE clients.
 */
export function broadcastRemoteEvent(eventType, payload) {
  const msg = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(msg);
    } catch {
      sseClients.delete(res);
    }
  }
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Aura-Pin');
}

async function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

/**
 * Captures PC screen buffer optimized for remote mobile streaming (JPEG 1080p / 720p).
 */
async function captureOptimizedScreenBuffer(quality = 70, scale = 0.8) {
  const primary = screen.getPrimaryDisplay();
  const width = Math.round((primary.size.width || 1920) * scale);
  const height = Math.round((primary.size.height || 1080) * scale);

  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width, height },
  });

  const source = sources[0];
  if (!source || source.thumbnail.isEmpty()) {
    throw new Error('Screenshot could not be captured.');
  }

  return {
    buffer: source.thumbnail.toJPEG(quality),
    width,
    height,
  };
}

/**
 * Handles incoming HTTP requests for Aura Mobile Remote.
 */
async function handleRemoteRequest(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname;

  const isRemoteAccess = Boolean(
    req.headers['cf-connecting-ip'] ||
    req.headers['x-forwarded-proto'] ||
    req.headers['x-forwarded-for'],
  );
  const clientPin = req.headers['x-aura-pin'] || urlObj.searchParams.get('pin');

  // 0. POST /api/auth/verify - Verify remote PIN
  if (pathname === '/api/auth/verify' && req.method === 'POST') {
    const body = await parseBody(req);
    const valid = verifyRemotePin(body.pin);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, valid }));
    return;
  }

  // Security check: require PIN for external tunnel connections
  if (isRemoteAccess && pathname.startsWith('/api/') && pathname !== '/api/auth/verify') {
    if (!verifyRemotePin(clientPin)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Security PIN required for remote internet access.' }));
      return;
    }
  }

  // 1. GET /api/status - Complete status of PC, Co-Pilot, hardware, and network
  if (pathname === '/api/status' && req.method === 'GET') {
    try {
      const stats = await getSystemStats();
      const copilot = getCoPilotStatus();
      const ips = getLocalNetworkIps();
      const projects = getKnownProjects();
      const tunnel = getTunnelInfo();

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          ok: true,
          hostname: os.hostname(),
          platform: process.platform,
          osRelease: os.release(),
          uptime: os.uptime(),
          currentPort,
          networkIps: ips,
          tunnel,
          copilot,
          systemStats: stats,
          projects,
          activeProcessesCount: activeProcesses.size,
          timestamp: Date.now(),
        }),
      );
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return;
  }

  // 2. GET /api/screen - Direct JPEG or JSON screenshot of PC display
  if (pathname === '/api/screen' && req.method === 'GET') {
    try {
      const quality = parseInt(urlObj.searchParams.get('q') || '68', 10);
      const scale = parseFloat(urlObj.searchParams.get('scale') || '0.75');
      const { buffer, width, height } = await captureOptimizedScreenBuffer(quality, scale);

      if (urlObj.searchParams.get('format') === 'json') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            ok: true,
            dataUrl: `data:image/jpeg;base64,${buffer.toString('base64')}`,
            width,
            height,
            timestamp: Date.now(),
          }),
        );
      } else {
        res.writeHead(200, {
          'Content-Type': 'image/jpeg',
          'Content-Length': buffer.length,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        });
        res.end(buffer);
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return;
  }

  // 3. GET /api/events - Server-Sent Events stream for mobile alerts
  if (pathname === '/api/events' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write('retry: 3000\n\n');
    sseClients.add(res);

    res.write(`event: connected\ndata: ${JSON.stringify({ ok: true, hostname: os.hostname() })}\n\n`);

    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  // 4. POST /api/command - Natural language commands from phone
  if (pathname === '/api/command' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const prompt = String(body.prompt || '').trim();
      if (!prompt) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Command cannot be empty.' }));
        return;
      }

      // Check for local automation commands
      const localResult = await runNaturalLanguageLocalAction(prompt);
      if (localResult?.matched) {
        broadcastRemoteEvent('log', {
          source: 'local_action',
          message: `Executed: ${prompt} -> ${localResult.result?.message || 'Success'}`,
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, type: 'action', result: localResult.result }));
        return;
      }

      // Check if user requests desktop screen control / plan
      if (/^(click|type|open|select|move|control|press)/i.test(prompt)) {
        const plan = await createDesktopControlPlan(prompt);
        broadcastRemoteEvent('plan_created', plan);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, type: 'plan', plan }));
        return;
      }

      // Default: AI conversational reply
      const reply = await generateRemoteChatReply(prompt, body.conversation || []);
      broadcastRemoteEvent('chat_reply', { prompt, reply });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, type: 'chat', reply }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return;
  }

  // 5. POST /api/coding - Remote development commands (VS Code, dev server, terminal)
  if (pathname === '/api/coding' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { action, projectKey, customPath, command } = body;
      const projectPath = resolveProjectPath(projectKey, customPath);

      if (!fs.existsSync(projectPath)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: `Project folder not found: ${projectPath}` }));
        return;
      }

      if (action === 'open_vscode') {
        const cmd = `code "${projectPath}"`;
        exec(cmd, (err) => {
          if (err) console.error('[RemoteServer] VS Code launch error:', err);
        });

        broadcastRemoteEvent('log', {
          source: 'coding',
          message: `Opened VS Code in folder: ${projectPath}`,
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            ok: true,
            message: `VS Code launched on PC for: ${path.basename(projectPath)}`,
            projectPath,
          }),
        );
        return;
      }

      if (action === 'start_dev') {
        const sessionId = `dev-${Date.now()}`;
        const devProcess = spawn('npm.cmd', ['run', 'dev'], {
          cwd: projectPath,
          shell: true,
          windowsHide: true,
        });

        activeProcesses.set(sessionId, devProcess);

        devProcess.stdout.on('data', (data) => {
          broadcastRemoteEvent('terminal', {
            sessionId,
            text: data.toString(),
            type: 'stdout',
          });
        });

        devProcess.stderr.on('data', (data) => {
          broadcastRemoteEvent('terminal', {
            sessionId,
            text: data.toString(),
            type: 'stderr',
          });
        });

        devProcess.on('close', (code) => {
          activeProcesses.delete(sessionId);
          broadcastRemoteEvent('terminal', {
            sessionId,
            text: `[Process exited with code ${code}]`,
            type: 'exit',
          });
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            ok: true,
            sessionId,
            message: `Dev server started in ${path.basename(projectPath)}!`,
          }),
        );
        return;
      }

      if (action === 'run_terminal') {
        const runCmd = command || 'git status';
        exec(
          runCmd,
          { cwd: projectPath, timeout: 30000, windowsHide: true },
          (err, stdout, stderr) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                ok: !err,
                output: stdout || stderr || (err ? err.message : 'Executed with no output.'),
                error: err ? err.message : null,
              }),
            );
          },
        );
        return;
      }

      if (action === 'stop_process') {
        const { sessionId } = body;
        const proc = activeProcesses.get(sessionId);
        if (proc) {
          try {
            process.kill(proc.pid);
          } catch {}
          activeProcesses.delete(sessionId);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, message: 'Process stopped.' }));
        return;
      }

      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Invalid coding action.' }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return;
  }

  // 6. POST /api/copilot/toggle - Toggle neon cursor and vision
  if (pathname === '/api/copilot/toggle' && req.method === 'POST') {
    try {
      const status = startOrStopCursorCoPilot();
      broadcastRemoteEvent('copilot_status', status);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, status }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return;
  }

  // 7. POST /api/plan/approve & /api/plan/reject - Remote plan approval
  if (pathname === '/api/plan/approve' && req.method === 'POST') {
    try {
      const { planId } = await parseBody(req);
      const result = await approveAndExecuteDesktopPlan(planId);
      broadcastRemoteEvent('plan_updated', { planId, status: 'approved' });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, result }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return;
  }

  if (pathname === '/api/plan/reject' && req.method === 'POST') {
    try {
      const { planId } = await parseBody(req);
      const result = rejectDesktopPlan(planId);
      broadcastRemoteEvent('plan_updated', { planId, status: 'rejected' });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, result }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return;
  }

  // 8. POST /api/action - Fast system actions
  if (pathname === '/api/action' && req.method === 'POST') {
    try {
      const { actionId } = await parseBody(req);

      if (actionId === 'lock_pc') {
        exec('rundll32.exe user32.dll,LockWorkStation');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, message: 'PC has been locked.' }));
        return;
      }

      if (actionId === 'minimize_all') {
        exec('powershell -NoProfile -Command "(New-Object -ComObject Shell.Application).MinimizeAll()"');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, message: 'All windows have been minimized.' }));
        return;
      }

      const localRes = await executeLocalAction(actionId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, result: localRes }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return;
  }

  // 9. Static file serving for Aura Mobile web interface
  const mobileDistDir = path.resolve(ROOT_DIR, '../aura-mobile/dist');
  let cleanRelPath = pathname.replace(/^\/+/, '');
  let filePath = path.join(mobileDistDir, cleanRelPath || 'index.html');

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // Fallback SPA routing to index.html
  const fallbackIndex = path.join(mobileDistDir, 'index.html');
  if (fs.existsSync(fallbackIndex)) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(fallbackIndex).pipe(res);
    return;
  }

  // If mobile web dist is not built, serve interactive welcome page
  serveMobileSetupWelcome(res);
}

function serveMobileSetupWelcome(res) {
  const ips = getLocalNetworkIps();
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <title>Aura Mobile Remote</title>
  <style>
    body {
      margin: 0;
      background: #090d16;
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
      text-align: center;
      box-sizing: border-box;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 999px;
      background: rgba(0, 240, 255, 0.12);
      border: 1px solid rgba(0, 240, 255, 0.35);
      color: #00f0ff;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 26px;
      margin: 0 0 10px;
      background: linear-gradient(135deg, #ffffff, #38bdf8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p {
      color: #94a3b8;
      font-size: 14px;
      line-height: 1.5;
      max-width: 420px;
      margin: 0 0 24px;
    }
    .card {
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 18px;
      width: 100%;
      max-width: 360px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
    }
    .btn {
      display: inline-block;
      margin-top: 14px;
      padding: 10px 20px;
      border-radius: 12px;
      border: none;
      background: linear-gradient(135deg, #0284c7, #0369a1);
      color: #fff;
      font-weight: 600;
      font-size: 15px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="badge"><span class="status-dot"></span> PC Connected Online</div>
  <h1>Aura Mobile Remote</h1>
  <p>The connection between your phone and PC (${os.hostname()}) is active on port ${currentPort}.</p>
  <div class="card">
    <div style="font-size: 13px; color: #64748b; margin-bottom: 6px;">Phone Connection IP</div>
    <div style="font-family: monospace; font-size: 16px; color: #38bdf8;">${ips[0]?.url || `http://localhost:${currentPort}`}</div>
    <button class="btn" onclick="location.reload()">Reload App</button>
  </div>
</body>
</html>`;
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

function getKnownProjects() {
  const atlasRoot = path.resolve(ROOT_DIR, '..');
  return [
    {
      key: 'atlas-web',
      name: 'Atlas Labs Website',
      description: 'SaaS Web Platform (React + Vite + Tailwind)',
      path: path.join(atlasRoot, 'atlas-web'),
    },
    {
      key: 'aura-desktop',
      name: 'Aura Desktop Co-Pilot',
      description: 'Electron Desktop App with Neon Cursor',
      path: path.join(atlasRoot, 'aura-desktop'),
    },
    {
      key: 'aura-mobile',
      name: 'Aura Mobile Remote',
      description: 'Mobile Remote Control App for Phone',
      path: path.join(atlasRoot, 'aura-mobile'),
    },
  ];
}

function resolveProjectPath(key, customPath) {
  if (customPath && fs.existsSync(customPath)) {
    return customPath;
  }
  const atlasRoot = path.resolve(ROOT_DIR, '..');
  if (key === 'atlas-web') return path.join(atlasRoot, 'atlas-web');
  if (key === 'aura-mobile') return path.join(atlasRoot, 'aura-mobile');
  return path.join(atlasRoot, 'aura-desktop');
}

/**
 * Initializes and starts the remote server on port 5190 (or next open port).
 */
export function startRemoteServer(preferredPort = 5190) {
  if (server) return server;

  server = http.createServer((req, res) => {
    handleRemoteRequest(req, res).catch((err) => {
      console.error('[RemoteServer] Request error:', err);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[RemoteServer] Port ${preferredPort} in use, trying ${preferredPort + 1}`);
      startRemoteServer(preferredPort + 1);
    } else {
      console.error('[RemoteServer] Startup error:', err);
    }
  });

  server.listen(preferredPort, '0.0.0.0', () => {
    currentPort = preferredPort;
    const ips = getLocalNetworkIps();
    console.log(`[RemoteServer] Aura Mobile Remote active on port ${currentPort}:`);
    for (const item of ips) {
      console.log(`  📱 Local Wi-Fi: ${item.url}`);
    }

    // Automatically start Cloudflare tunnel for global internet access
    startGlobalTunnel(currentPort);
  });

  return server;
}

export function stopRemoteServer() {
  stopGlobalTunnel();
  if (server) {
    for (const res of sseClients) {
      try {
        res.end();
      } catch {}
    }
    sseClients.clear();

    for (const [, proc] of activeProcesses) {
      try {
        process.kill(proc.pid);
      } catch {}
    }
    activeProcesses.clear();

    server.close();
    server = null;
  }
}
