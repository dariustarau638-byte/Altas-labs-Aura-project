import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PRIMARY_PORT = parseInt(process.env.PORT || process.env.WEB_PORT || '5173', 10);
const SECONDARY_PORT = 5180;

const rawBackend = process.env.BACKEND_URL || 'http://127.0.0.1:5000';
const BACKEND_URL = rawBackend.startsWith('http://') || rawBackend.startsWith('https://')
  ? rawBackend
  : `http://${rawBackend}`;
const BACKEND_TARGET = new URL(BACKEND_URL);

const DIST_DIR = path.resolve(import.meta.dirname, 'dist');
const RELEASE_DIR = path.resolve(import.meta.dirname, '../aura-desktop/release');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.apk': 'application/vnd.android.package-archive',
};

function handleRequest(req, res) {
  const cleanUrl = decodeURIComponent((req.url || '/').split('?')[0]);

  // Global CORS Headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
  };

  // Preflight OPTIONS handling
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      ...corsHeaders,
      'Access-Control-Max-Age': '86400',
    });
    return res.end();
  }

  // 1. Direct Downloads for Aura v2.0.0 artifacts (.exe, .apk)
  if (cleanUrl === '/downloads/Aura-Mobile.apk') {
    const candidatePaths = [
      path.join(DIST_DIR, 'downloads', 'Aura-Mobile.apk'),
      path.join(import.meta.dirname, 'public', 'downloads', 'Aura-Mobile.apk'),
      path.join(RELEASE_DIR, 'Aura-Mobile.apk'),
    ];
    for (const apkPath of candidatePaths) {
      if (fs.existsSync(apkPath)) {
        const stat = fs.statSync(apkPath);
        res.writeHead(200, {
          ...corsHeaders,
          'Content-Type': 'application/vnd.android.package-archive',
          'Content-Disposition': 'attachment; filename="Aura-Mobile.apk"',
          'Content-Length': String(stat.size),
        });
        fs.createReadStream(apkPath).pipe(res);
        return;
      }
    }
  }

  if (cleanUrl === '/downloads/Aura-Setup-2.0.0.exe') {
    const exePath = path.join(RELEASE_DIR, 'Aura Setup 2.0.0.exe');
    if (fs.existsSync(exePath)) {
      const stat = fs.statSync(exePath);
      res.writeHead(200, {
        ...corsHeaders,
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="Aura Setup 2.0.0.exe"',
        'Content-Length': String(stat.size),
      });
      fs.createReadStream(exePath).pipe(res);
      return;
    }
  }

  if (cleanUrl === '/downloads/Aura-Portable-2.0.0.exe') {
    const exePath = path.join(RELEASE_DIR, 'Aura-Portable-2.0.0.exe');
    if (fs.existsSync(exePath)) {
      const stat = fs.statSync(exePath);
      res.writeHead(200, {
        ...corsHeaders,
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="Aura-Portable-2.0.0.exe"',
        'Content-Length': String(stat.size),
      });
      fs.createReadStream(exePath).pipe(res);
      return;
    }
  }

  // 1b. Setup Jarvis AI Inno Setup Installer
  if (cleanUrl === '/downloads/Setup_JarvisAI.exe') {
    const installerPath = path.resolve(import.meta.dirname, '../aura-desktop/dist_installer/Setup_JarvisAI.exe');
    if (fs.existsSync(installerPath)) {
      const stat = fs.statSync(installerPath);
      res.writeHead(200, {
        ...corsHeaders,
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="Setup_JarvisAI.exe"',
        'Content-Length': String(stat.size),
      });
      fs.createReadStream(installerPath).pipe(res);
      return;
    }
  }

  // 1c. Forward /api/* requests to shared Auth & Usage Backend Server (default: http://127.0.0.1:5000)
  if (cleanUrl.startsWith('/api/')) {
    const proxyHeaders = {
      ...req.headers,
      host: `${BACKEND_TARGET.hostname}:${BACKEND_TARGET.port || 5000}`,
      'x-forwarded-host': req.headers.host || '',
      'x-forwarded-proto': 'https',
    };

    const backendReq = http.request(
      {
        hostname: BACKEND_TARGET.hostname,
        port: parseInt(BACKEND_TARGET.port || '5000', 10),
        path: req.url,
        method: req.method,
        headers: proxyHeaders,
      },
      (backendRes) => {
        const combinedHeaders = {
          ...backendRes.headers,
          ...corsHeaders,
        };
        res.writeHead(backendRes.statusCode, combinedHeaders);
        backendRes.pipe(res);
      }
    );

    backendReq.on('error', (err) => {
      res.writeHead(502, {
        ...corsHeaders,
        'Content-Type': 'application/json; charset=utf-8',
      });
      res.end(
        JSON.stringify({
          success: false,
          error: `Backend server unreachable at ${BACKEND_TARGET.origin}: ${err.message}`,
        })
      );
    });

    req.pipe(backendReq);
    return;
  }

  // 2. Pre-compiled static assets from dist/ (<5ms fast delivery)
  const relativePath = cleanUrl.replace(/^\/+/, '');
  let filePath = path.join(DIST_DIR, relativePath || 'index.html');
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    const dirIndex = path.join(filePath, 'index.html');
    if (fs.existsSync(dirIndex)) {
      filePath = dirIndex;
    } else {
      filePath = path.join(DIST_DIR, 'index.html');
    }
  } else if (!fs.existsSync(filePath)) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  try {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const content = fs.readFileSync(filePath);
    res.writeHead(200, {
      ...corsHeaders,
      'Content-Type': contentType,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    });
    res.end(content);
  } catch (err) {
    res.writeHead(500, {
      ...corsHeaders,
      'Content-Type': 'text/plain; charset=utf-8',
    });
    res.end(`Server error: ${err.message}`);
  }
}

const primaryServer = http.createServer(handleRequest);
primaryServer.listen(PRIMARY_PORT, '0.0.0.0', () => {
  console.log(`\n  🚀 Atlas Labs Web & API Proxy Server running`);
  console.log(`  ➜  Local:    http://localhost:${PRIMARY_PORT}/`);
  console.log(`  ➜  Network:  http://0.0.0.0:${PRIMARY_PORT}/`);
  console.log(`  ➜  Proxy:    /api/* -> ${BACKEND_URL}\n`);
});

if (!process.env.RENDER) {
  const secondaryServer = http.createServer(handleRequest);
  secondaryServer.on('error', () => {});
  secondaryServer.listen(SECONDARY_PORT, '0.0.0.0', () => {
    console.log(`  ➜  Backup:   http://localhost:${SECONDARY_PORT}/\n`);
  });
}
