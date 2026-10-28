import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';

const PRIMARY_PORT = 5173;
const SECONDARY_PORT = 5180;
const DIST_DIR = path.resolve(import.meta.dirname, 'dist');
const RELEASE_DIR = path.resolve(import.meta.dirname, '../aura-companion/release');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
};

function handleRequest(req, res) {
  const cleanUrl = decodeURIComponent((req.url || '/').split('?')[0]);

  // 1. Descărcări directe ale produsului final Aura v2.0.0 (.exe)
  if (cleanUrl === '/downloads/Aura-Setup-2.0.0.exe') {
    const exePath = path.join(RELEASE_DIR, 'Aura Setup 2.0.0.exe');
    if (fs.existsSync(exePath)) {
      const stat = fs.statSync(exePath);
      res.writeHead(200, {
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
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="Aura-Portable-2.0.0.exe"',
        'Content-Length': String(stat.size),
      });
      fs.createReadStream(exePath).pipe(res);
      return;
    }
  }

  // 2. Fișiere statice pre-compilate din dist/ (încărcare instantă în <5ms)
  const relativePath = cleanUrl.replace(/^\/+/, '');
  let filePath = path.join(DIST_DIR, relativePath || 'index.html');
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  try {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const content = fs.readFileSync(filePath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    });
    res.end(content);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Server error: ${err.message}`);
  }
}

const primaryServer = http.createServer(handleRequest);
primaryServer.listen(PRIMARY_PORT, '0.0.0.0', () => {
  console.log(`\n  🚀 Atlas Labs Official Web Server pornit pe portul ${PRIMARY_PORT}!`);
  console.log(`  ➜  Local:   http://localhost:${PRIMARY_PORT}/`);
  console.log(`  ➜  IPv4:    http://127.0.0.1:${PRIMARY_PORT}/\n`);
  if (process.platform === 'win32') {
    exec(`start http://localhost:${PRIMARY_PORT}/`);
  }
});

const secondaryServer = http.createServer(handleRequest);
secondaryServer.on('error', () => {});
secondaryServer.listen(SECONDARY_PORT, '0.0.0.0', () => {
  console.log(`  ➜  Backup:  http://localhost:${SECONDARY_PORT}/\n`);
});
