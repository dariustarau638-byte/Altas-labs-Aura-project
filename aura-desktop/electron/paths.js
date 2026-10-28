import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ELECTRON_DIR = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.join(ELECTRON_DIR, '..');
export const PRELOAD_PATH = path.join(ELECTRON_DIR, 'preload.cjs');

export const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
export const isDev = Boolean(DEV_SERVER_URL);

/** Loads a Vite page (dev server in development, dist/ HTML file in production). */
export function loadPage(win, page) {
  if (isDev) return win.loadURL(`${DEV_SERVER_URL}/${page}.html`);
  return win.loadFile(path.join(ROOT_DIR, 'dist', `${page}.html`));
}
