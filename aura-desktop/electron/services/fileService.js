import fs from 'node:fs/promises';
import path from 'node:path';
import { app } from 'electron';
import { config } from '../config.js';
import { getSettings } from './settingsStore.js';

/**
 * Sandboxed file scanning, indexing, and reading service.
 * - File access is permitted ONLY in directories returned by `getEffectiveRoots()`.
 * - Honors the global `privacy.allowFileAccess` setting and sensitive file patterns
 *   (`.env`, `.pem`, `.key`, `id_rsa`, etc.).
 * - Includes an in-memory index (file names + text snippets) for instant search.
 */
const DEFAULT_IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '$Recycle.Bin',
  'AppData',
  '__pycache__',
  '.venv',
  'dist',
  'build',
  '.next',
]);

const SENSITIVE_PATTERNS = [/^\.env(\..+)?$/i, /\.(pem|key|pfx|p12|kdbx)$/i, /^id_(rsa|ed25519)$/i];

const TEXT_EXTENSIONS = new Set([
  '.txt',
  '.md',
  '.markdown',
  '.json',
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.py',
  '.html',
  '.css',
  '.csv',
  '.yml',
  '.yaml',
  '.xml',
  '.log',
  '.ini',
  '.toml',
  '.sql',
  '.sh',
  '.ps1',
]);

let indexCache = {
  lastIndexedAt: null,
  indexing: false,
  totalFiles: 0,
  totalDirs: 0,
  textFilesIndexed: 0,
  totalBytes: 0,
  entries: [], // { name, path, isDir, size, mtimeMs, ext, snippet }
};

export function getDefaultRoots() {
  return ['documents', 'desktop', 'downloads'].map((name) => app.getPath(name));
}

export function getEffectiveRoots() {
  const { privacy } = getSettings();
  if (privacy?.allowedRoots?.length > 0) return privacy.allowedRoots;
  if (config.files.allowedRoots.length > 0) return config.files.allowedRoots;
  return getDefaultRoots();
}

function getCustomExcludedSet() {
  const raw = getSettings().privacy?.excludedPatterns ?? '';
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isSensitiveFile(fileName) {
  const { privacy } = getSettings();
  if (privacy?.blockSensitiveFiles === false) return false;
  return SENSITIVE_PATTERNS.some((rx) => rx.test(fileName));
}

function isExcludedName(name) {
  if (name.startsWith('.') || DEFAULT_IGNORED_DIRS.has(name)) return true;
  if (isSensitiveFile(name)) return true;
  const custom = getCustomExcludedSet();
  const lower = name.toLowerCase();
  if (custom.has(lower)) return true;
  for (const pat of custom) {
    if (pat.startsWith('*.') && lower.endsWith(pat.slice(1))) return true;
  }
  return false;
}

export function isPathAllowed(target) {
  const { privacy } = getSettings();
  if (!privacy?.allowFileAccess) return false;
  const resolved = path.resolve(target);
  if (isSensitiveFile(path.basename(resolved))) return false;
  return getEffectiveRoots().some((root) => {
    const rel = path.relative(path.resolve(root), resolved);
    return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
  });
}

/** Builds or rebuilds the local file index within allowed roots. */
export async function buildFileIndex({ maxFiles = 2500, maxDepth = 5 } = {}) {
  const { privacy } = getSettings();
  if (!privacy?.allowFileAccess) {
    indexCache = {
      lastIndexedAt: Date.now(),
      indexing: false,
      totalFiles: 0,
      totalDirs: 0,
      textFilesIndexed: 0,
      totalBytes: 0,
      entries: [],
    };
    return getIndexStats();
  }

  indexCache.indexing = true;
  const entries = [];
  let totalFiles = 0;
  let totalDirs = 0;
  let textFilesIndexed = 0;
  let totalBytes = 0;

  const queue = getEffectiveRoots().map((dir) => ({ dir, depth: 0 }));
  const deadline = Date.now() + 6000;

  while (queue.length > 0 && entries.length < maxFiles && Date.now() < deadline) {
    const { dir, depth } = queue.shift();
    let list;
    try {
      list = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const item of list) {
      if (isExcludedName(item.name)) continue;
      const fullPath = path.join(dir, item.name);
      const isDir = item.isDirectory();

      if (isDir) {
        totalDirs++;
        entries.push({ name: item.name, path: fullPath, isDir: true, size: 0 });
        if (depth < maxDepth) queue.push({ dir: fullPath, depth: depth + 1 });
      } else {
        totalFiles++;
        const ext = path.extname(item.name).toLowerCase();
        let size = 0;
        let snippet = '';

        try {
          const st = await fs.stat(fullPath);
          size = st.size;
          totalBytes += size;
          // Index preview snippet if content indexing is enabled for text files <= 128 KB
          if (privacy.indexContent && TEXT_EXTENSIONS.has(ext) && size > 0 && size <= 128 * 1024) {
            const raw = await fs.readFile(fullPath, 'utf8');
            snippet = raw.slice(0, 1500);
            textFilesIndexed++;
          }
        } catch {}

        entries.push({
          name: item.name,
          path: fullPath,
          isDir: false,
          size,
          ext,
          canReadText: TEXT_EXTENSIONS.has(ext),
          snippet,
        });
      }

      if (entries.length >= maxFiles) break;
    }
  }

  indexCache = {
    lastIndexedAt: Date.now(),
    indexing: false,
    totalFiles,
    totalDirs,
    textFilesIndexed,
    totalBytes,
    entries,
  };
  return getIndexStats();
}

export function getIndexStats() {
  return {
    lastIndexedAt: indexCache.lastIndexedAt,
    indexing: indexCache.indexing,
    totalFiles: indexCache.totalFiles,
    totalDirs: indexCache.totalDirs,
    textFilesIndexed: indexCache.textFilesIndexed,
    totalBytes: indexCache.totalBytes,
    roots: getEffectiveRoots(),
    defaultRoots: getDefaultRoots(),
  };
}

/** Searches indexed files by name and text content. */
export async function searchFiles(query, { limit = 25 } = {}) {
  const { privacy } = getSettings();
  if (!privacy?.allowFileAccess) {
    throw new Error('Local file access is disabled in Settings → Privacy.');
  }

  const needle = String(query ?? '').trim().toLowerCase();
  if (!needle) return [];

  if (!indexCache.lastIndexedAt || indexCache.entries.length === 0) {
    await buildFileIndex();
  }

  const matches = [];
  for (const item of indexCache.entries) {
    const nameMatch = item.name.toLowerCase().includes(needle);
    const contentMatch =
      !nameMatch && item.snippet && item.snippet.toLowerCase().includes(needle);

    if (nameMatch || contentMatch) {
      let preview = null;
      if (contentMatch && item.snippet) {
        const idx = item.snippet.toLowerCase().indexOf(needle);
        const start = Math.max(0, idx - 40);
        preview = item.snippet.slice(start, idx + 90).replace(/\s+/g, ' ').trim();
      }
      matches.push({
        name: item.name,
        path: item.path,
        isDir: item.isDir,
        size: item.size,
        canReadText: Boolean(item.canReadText),
        matchedBy: nameMatch ? 'name' : 'content',
        preview,
      });
      if (matches.length >= limit) break;
    }
  }
  return matches;
}

/** Reads a text file safely with permission and size boundary checks. */
export async function readTextFile(target) {
  if (!isPathAllowed(target)) {
    throw new Error('Access denied: file is outside authorized folders or is protected.');
  }
  const stat = await fs.stat(target);
  if (stat.size > config.files.maxReadBytes) {
    throw new Error(`File too large (${Math.round(stat.size / 1024)} KB). The limit is 512 KB.`);
  }
  const content = await fs.readFile(target, 'utf8');
  return {
    name: path.basename(target),
    path: target,
    size: stat.size,
    content: content.slice(0, 12000),
  };
}
