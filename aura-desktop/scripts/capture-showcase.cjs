const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow } = require('electron');

const DIST = path.resolve(__dirname, '../dist');
const OUT = path.resolve('C:/Users/dtara/.gemini/antigravity/brain/d117a455-93b2-498f-90b2-7acb4bc99a0d/screenshots');

fs.mkdirSync(OUT, { recursive: true });

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
};

function createStaticServer(port = 5173) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let reqPath = decodeURI(req.url.split('?')[0]);
      if (reqPath === '/' || reqPath === '') reqPath = '/dashboard.html';
      const cleanPath = reqPath.replace(/^\/+/, '');
      const filePath = path.join(DIST, cleanPath);
      console.log(`[HTTP] ${req.method} ${req.url} -> ${filePath} exists=${fs.existsSync(filePath)}`);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        fs.createReadStream(filePath).pipe(res);
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    server.listen(port, '127.0.0.1', () => {
      resolve(server);
    });
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SEED = {
  account: {
    authenticated: true,
    onboardingCompleted: true,
    name: 'Daniel',
    userNickname: 'Dani',
    email: 'daniel@atlaslabs.dev',
    authProvider: 'google',
    plan: 'PRO',
  },
};

app.disableHardwareAcceleration();
app.commandLine.appendSwitch('force-device-scale-factor', '1.25');
app.on('window-all-closed', (e) => {
  // Prevent Electron from automatically quitting between window transitions
});

async function shot(win, filename, width, height) {
  if (width && height) {
    win.setContentSize(width, height);
    await sleep(250);
  }
  const img = await win.webContents.capturePage();
  const dest = path.join(OUT, filename);
  fs.writeFileSync(dest, img.toPNG());
  console.log(`Saved screenshot: ${filename} (${img.getSize().width}x${img.getSize().height})`);
  return dest;
}

async function run() {
  console.log('Starting static server on port 5173...');
  const server = await createStaticServer(5173);
  console.log('Static server ready. Generating screenshots...');

  // 1. DASHBOARD WINDOW
  const dashWin = new BrowserWindow({
    width: 1360,
    height: 880,
    show: false,
    useContentSize: true,
    backgroundColor: '#09090b',
    webPreferences: { offscreen: true, contextIsolation: true },
  });

  dashWin.webContents.on('console-message', (ev, level, msg) => {
    console.log(`[DASH LOG level=${level}]: ${msg}`);
  });
  dashWin.webContents.on('render-process-gone', (ev, details) => {
    console.log(`[DASH CRASH]: ${JSON.stringify(details)}`);
  });

  const loadDash = async () => {
    await dashWin.loadURL('http://127.0.0.1:5173/dashboard.html');
    await dashWin.webContents.executeJavaScript(`
      localStorage.setItem('aura:settings', ${JSON.stringify(JSON.stringify(SEED))});
      true;
    `);
    await dashWin.loadURL('http://127.0.0.1:5173/dashboard.html');
    await sleep(800);
  };

  await loadDash();

  // Overview
  await shot(dashWin, '01-dashboard-overview.png');

  // Jarvis Routines
  await dashWin.webContents.executeJavaScript(`
    const btn = [...document.querySelectorAll('nav[aria-label] button')].find(b => b.textContent.includes('Routines'));
    if (btn) btn.click();
  `);
  await sleep(600);
  await shot(dashWin, '02-dashboard-routines.png');

  // System Tools (70+)
  try {
    await dashWin.webContents.executeJavaScript(`
      (() => {
        const btn = [...document.querySelectorAll('nav[aria-label] button')].find(b => b.textContent.includes('System Tools'));
        if (btn) btn.click();
        return true;
      })()
    `);
    await sleep(800);
    await shot(dashWin, '03-dashboard-system-tools.png');
  } catch (e) {
    console.error('Failed capturing System Tools:', e.message);
  }

  // Contextual Memory
  try {
    await dashWin.webContents.executeJavaScript(`
      (() => {
        const btn = [...document.querySelectorAll('nav[aria-label] button')].find(b => b.textContent.includes('Memory') || b.textContent.includes('Clipboard'));
        if (btn) btn.click();
        return true;
      })()
    `);
    await sleep(800);
    await shot(dashWin, '04-dashboard-clipboard-memory.png');
  } catch (e) {
    console.error('Failed capturing Clipboard Memory:', e.message);
  }

  // PC Control (Aura v2.0)
  try {
    await dashWin.webContents.executeJavaScript(`
      (() => {
        const btn = [...document.querySelectorAll('nav[aria-label] button')].find(b => b.textContent.includes('PC Control') || b.textContent.includes('v2.0'));
        if (btn) btn.click();
        return true;
      })()
    `);
    await sleep(800);
    await shot(dashWin, '05-dashboard-pc-control.png');
  } catch (e) {
    console.error('Failed capturing PC Control:', e.message);
  }

  // Local AI Models (Jan.ai / Ollama)
  try {
    await dashWin.webContents.executeJavaScript(`
      (() => {
        const btn = [...document.querySelectorAll('nav[aria-label] button')].find(b => b.textContent.includes('Models') || b.textContent.includes('Local'));
        if (btn) btn.click();
        return true;
      })()
    `);
    await sleep(800);
    await shot(dashWin, '06-dashboard-local-ai.png');
  } catch (e) {
    console.error('Failed capturing Local AI Models:', e.message);
  }

  // Billing & Plans
  try {
    await dashWin.webContents.executeJavaScript(`
      (() => {
        const btn = [...document.querySelectorAll('nav[aria-label] button')].find(b => b.textContent.includes('Billing') || b.textContent.includes('Plans'));
        if (btn) btn.click();
        return true;
      })()
    `);
    await sleep(800);
    await shot(dashWin, '07-dashboard-billing.png');
  } catch (e) {
    console.error('Failed capturing Billing:', e.message);
  }

  // Privacy & Security
  try {
    await dashWin.webContents.executeJavaScript(`
      (() => {
        const btn = [...document.querySelectorAll('nav[aria-label] button')].find(b => b.textContent.includes('Privacy') || b.textContent.includes('Security'));
        if (btn) btn.click();
        return true;
      })()
    `);
    await sleep(800);
    await shot(dashWin, '08-dashboard-privacy.png');
  } catch (e) {
    console.error('Failed capturing Privacy:', e.message);
  }

  dashWin.destroy();
  await sleep(300);

  // 2. LAUNCHER SPOTLIGHT WINDOW (Raycast / Jarvis)
  try {
    const launcherWin = new BrowserWindow({
      width: 680,
      height: 480,
      show: false,
      frame: false,
      transparent: true,
      useContentSize: true,
      backgroundColor: '#00000000',
      webPreferences: { offscreen: true, contextIsolation: true },
    });

    launcherWin.webContents.on('console-message', (ev, level, msg) => {
      console.log(`[LAUNCHER LOG]: ${msg}`);
    });

    await launcherWin.loadURL('http://127.0.0.1:5173/launcher.html');
    await sleep(800);
    await shot(launcherWin, '09-launcher-spotlight.png');

    // Simulate typing in Launcher
    await launcherWin.webContents.executeJavaScript(`
      const input = document.querySelector('input');
      if (input) {
        input.focus();
        input.value = '12 * 450 + 20';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    `);
    await sleep(500);
    await shot(launcherWin, '10-launcher-calculator.png');

    launcherWin.destroy();
  } catch (e) {
    console.error('Failed capturing Launcher:', e);
  }
  await sleep(300);

  // 3. WIDGET WINDOW (Top Notch Companion)
  try {
    const widgetWin = new BrowserWindow({
      width: 440,
      height: 620,
      show: false,
      frame: false,
      transparent: true,
      useContentSize: true,
      backgroundColor: '#00000000',
      webPreferences: { offscreen: true, contextIsolation: true },
    });

    widgetWin.webContents.on('console-message', (ev, level, msg) => {
      console.log(`[WIDGET LOG]: ${msg}`);
    });

    await widgetWin.loadURL('http://127.0.0.1:5173/widget.html');
    await widgetWin.webContents.executeJavaScript(`
      localStorage.setItem('aura:settings', ${JSON.stringify(JSON.stringify(SEED))});
      true;
    `);
    await widgetWin.loadURL('http://127.0.0.1:5173/widget.html');
    await sleep(800);

    // Notch collapsed
    await shot(widgetWin, '11-widget-notch-collapsed.png', 440, 100);

    // Notch expanded (hover)
    for (let x = 200; x <= 220; x += 5) {
      widgetWin.webContents.sendInputEvent({ type: 'mouseMove', x, y: 12 });
      await sleep(40);
    }
    await sleep(900);
    await shot(widgetWin, '12-widget-notch-expanded.png', 440, 620);

    // Send a message to show chat mode
    await widgetWin.webContents.executeJavaScript(`
      const ta = document.querySelector('textarea');
      if (ta) {
        ta.focus();
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(ta, 'Aura, check system status and disk health.');
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
      }
    `);
    await sleep(2400);
    widgetWin.webContents.sendInputEvent({ type: 'mouseMove', x: 220, y: 300 });
    await sleep(300);
    await shot(widgetWin, '13-widget-chat-conversation.png', 440, 620);

    widgetWin.destroy();
  } catch (e) {
    console.error('Failed capturing Widget:', e);
  }
  server.close();
  console.log('All showcase screenshots captured successfully.');
  app.exit(0);
}

app.whenReady().then(() => run().catch((err) => {
  console.error('Screenshot capture failed:', err);
  app.exit(1);
}));
