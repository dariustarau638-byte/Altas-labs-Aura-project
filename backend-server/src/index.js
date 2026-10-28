import path from 'node:path';
import fs from 'node:fs';
import { AtlasDatabase } from './db.js';
import { createApp } from './app.js';

const PORT = parseInt(process.env.PORT || '5000', 10);
const FALLBACK_PORT = 4000;
const HOST = process.env.HOST || '0.0.0.0';
const DB_PATH = process.env.DB_PATH || path.resolve(import.meta.dirname, '../data/atlas.sqlite');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new AtlasDatabase(DB_PATH);
const { server } = createApp(db, process.env.JWT_SECRET);

server.listen(PORT, HOST, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Atlas Auth & Usage Backend Server running`);
  console.log(`📍 Primary Port:   http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`💾 Database:       ${DB_PATH}`);
  console.log(`🔐 Auth:           Stateless HMAC-SHA256 JWT`);
  console.log(`📊 Usage Tracking: /api/usage/track`);
  console.log(`=======================================================`);
});

// Secondary compatibility listener on port 4000
if (PORT !== FALLBACK_PORT) {
  const fallbackServer = createApp(db, process.env.JWT_SECRET).server;
  fallbackServer.on('error', (err) => {
    // Port 4000 already in use, skip silently
  });
  fallbackServer.listen(FALLBACK_PORT, HOST, () => {
    console.log(`📍 Secondary Port: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${FALLBACK_PORT}`);
  });
}

process.on('SIGINT', () => {
  console.log('\nGracefully shutting down...');
  server.close(() => {
    db.close();
    process.exit(0);
  });
});
