import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const RELEASE_DIR = path.resolve(
  import.meta.dirname,
  '../aura-companion/release',
);

/**
 * Plugin Vite care servește direct fișierele reale ale produsului final
 * (`Aura Setup 2.0.0.exe` și `Aura-Portable-2.0.0.exe`) din folderul de release Aura,
 * astfel încât butonul de Download de pe site-ul Atlas Labs să descarce installerul real.
 */
function auraInstallerDownloadPlugin() {
  return {
    name: 'atlas-labs-installer-downloads',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url) return next();
        const cleanUrl = req.url.split('?')[0];

        let targetFile = null;
        let downloadName = null;

        if (cleanUrl === '/downloads/Aura-Setup-2.0.0.exe') {
          targetFile = path.join(RELEASE_DIR, 'Aura Setup 2.0.0.exe');
          downloadName = 'Aura Setup 2.0.0.exe';
        } else if (cleanUrl === '/downloads/Aura-Portable-2.0.0.exe') {
          targetFile = path.join(RELEASE_DIR, 'Aura-Portable-2.0.0.exe');
          downloadName = 'Aura-Portable-2.0.0.exe';
        }

        if (targetFile && fs.existsSync(targetFile)) {
          const stat = fs.statSync(targetFile);
          res.setHeader('Content-Type', 'application/octet-stream');
          res.setHeader(
            'Content-Disposition',
            `attachment; filename="${downloadName}"`,
          );
          res.setHeader('Content-Length', String(stat.size));
          const stream = fs.createReadStream(targetFile);
          stream.pipe(res);
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), auraInstallerDownloadPlugin()],
  server: {
    host: true,
    port: 5173,
    strictPort: false,
  },
});
