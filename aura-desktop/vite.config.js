import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';

// Multi-page build: each Electron window has its own HTML entry point.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './', // required for loading via file:// in production
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        widget: resolve(import.meta.dirname, 'widget.html'),
        dashboard: resolve(import.meta.dirname, 'dashboard.html'),
        launcher: resolve(import.meta.dirname, 'launcher.html'),
      },
    },
  },
});
