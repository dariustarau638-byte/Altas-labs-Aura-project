#!/usr/bin/env node
/**
 * Feature-map extractor: inventories every event handler, bridge call (aura.*),
 * state hook and effect in the renderer source. Used to guarantee that a visual
 * refactor does not drop any functionality.
 *
 *   node scripts/feature-map.mjs [srcDir] > map.json
 *   node scripts/feature-map.mjs --diff before.json after.json
 */
import fs from 'node:fs';
import path from 'node:path';

const HANDLER_RE = /\b(on[A-Z][A-Za-z]+)=\{/g;
const BRIDGE_RE = /\baura\.[A-Za-z]+(?:\.[A-Za-z]+)*/g;
const STATE_RE = /const \[\s*([A-Za-z0-9_]+)\s*,\s*(set[A-Za-z0-9_]+)\s*\]\s*=\s*useState/g;
const HOOK_RE = /\b(use(?:Effect|Callback|Memo|Ref|LayoutEffect|Settings|Chat|Voice|AiStatus|WindowDrag))\(/g;
const FN_RE = /(?:const|function)\s+([a-z][A-Za-z0-9_]+)\s*(?:=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_]+)\s*=>|\()/g;
const UPDATE_RE = /\b(?:update|onUpdate|onUpdateSettings)\(\s*\{\s*([a-zA-Z]+)\s*:/g;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return walk(p);
    return /\.(jsx?|mjs)$/.test(d.name) ? [p] : [];
  });
}

function count(re, text, group = 0) {
  const out = {};
  for (const m of text.matchAll(re)) out[m[group]] = (out[m[group]] || 0) + 1;
  return out;
}

function extract(srcDir) {
  const map = {};
  for (const file of walk(srcDir)) {
    const text = fs.readFileSync(file, 'utf8');
    map[path.relative(srcDir, file).replaceAll('\\', '/')] = {
      handlers: count(HANDLER_RE, text, 1),
      bridge: count(BRIDGE_RE, text),
      state: count(STATE_RE, text, 1),
      hooks: count(HOOK_RE, text, 1),
      functions: count(FN_RE, text, 1),
      settingsPatches: count(UPDATE_RE, text, 1),
    };
  }
  return map;
}

function diff(before, after) {
  const problems = [];
  for (const [file, b] of Object.entries(before)) {
    const a = after[file];
    if (!a) { problems.push(`MISSING FILE ${file}`); continue; }
    for (const kind of Object.keys(b)) {
      for (const [key, n] of Object.entries(b[kind])) {
        const m = a[kind]?.[key] ?? 0;
        if (m < n) problems.push(`${file} :: ${kind}.${key} ${n} -> ${m}`);
      }
    }
  }
  return problems;
}

const args = process.argv.slice(2);
if (args[0] === '--diff') {
  const [b, a] = args.slice(1).map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
  const problems = diff(b, a);
  if (problems.length) {
    console.log(`REGRESSIONS (${problems.length}):\n` + problems.join('\n'));
    process.exitCode = 1;
  } else console.log('OK – no handler / bridge / state / hook / function lost.');
} else {
  console.log(JSON.stringify(extract(args[0] || 'src'), null, 2));
}
