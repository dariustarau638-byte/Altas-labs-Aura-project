/**
 * Aura UI end-to-end harness (browser-in-the-loop).
 *
 * Drives the live Vite preview (npm run dev:ui → http://127.0.0.1:5173) inside an
 * offscreen Chromium (Electron), using the renderer's built-in mock bridge.
 *
 *  - walks the Auth/Onboarding flow, every Dashboard section and the Widget
 *  - clicks every visible button / switch / tab, types into every input,
 *    changes every <select> and range slider
 *  - records console errors, uncaught exceptions and unhandled rejections
 *  - captures full-page screenshots of every screen
 *
 * Usage:  npx electron scripts/ui-e2e.cjs [outDir] [--only=sectionId,...] [--no-exercise]
 * Exit code 1 when any runtime error was observed.
 */
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const BASE = process.env.E2E_BASE || 'http://127.0.0.1:5173';
const argv = process.argv.slice(2).filter((a) => !a.startsWith('--') && !a.endsWith('.cjs') && a !== '.');
const OUT = path.resolve(argv[0] || path.join(__dirname, '..', '.e2e'));
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const EXERCISE = !process.argv.includes('--no-exercise');
const W = 1320;
const H = 880;

fs.mkdirSync(OUT, { recursive: true });
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('force-device-scale-factor', '1');

const report = { startedAt: new Date().toISOString(), pages: [], errors: [] };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SEED = {
  account: {
    authenticated: true,
    onboardingCompleted: true,
    name: 'Daniel',
    userNickname: 'Dani',
    email: 'daniel@atlaslabs.dev',
    authProvider: 'google',
  },
};

const PRELUDE = `
  (() => {
    if (window.__e2e) return;
    window.__e2e = { errors: [] };
    const push = (kind, msg) => window.__e2e.errors.push({ kind, msg: String(msg).slice(0, 600), at: location.pathname });
    window.addEventListener('error', (e) => push('uncaught', (e.error && e.error.stack) || e.message));
    window.addEventListener('unhandledrejection', (e) => push('rejection', (e.reason && e.reason.stack) || e.reason));
    window.confirm = () => true;
    window.alert = () => {};
    window.prompt = () => 'e2e';
    window.open = () => null;
    try { Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || function(){}; } catch {}
  })();
`;

// In-page helpers, injected once per load.
const HELPERS = `
  (() => {
    if (window.__h) return;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const visible = (el) => {
      if (!el || !el.isConnected) return false;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return false;
      const s = getComputedStyle(el);
      return s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05;
    };
    const label = (el) => (el.getAttribute('aria-label') || el.title || el.textContent || el.name || el.placeholder || el.type || '').replace(/\\s+/g, ' ').trim().slice(0, 60);
    const nativeSet = (el, value) => {
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    };
    const SKIP = /quit app|^login$|sign ?out|log ?out/i;
    window.__h = {
      sleep, visible, label,
      // Real-user reachability: the element (or a descendant) must be the hit target at its centre.
      hittable(el) {
        el.scrollIntoView({ block: 'center' });
        const r = el.getBoundingClientRect();
        const x = Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1);
        const y = Math.min(Math.max(r.top + r.height / 2, 0), innerHeight - 1);
        const hit = document.elementFromPoint(x, y);
        if (!hit) return false;
        if (el.contains(hit) || hit.contains(el)) return true;
        // Visually-hidden checkbox wrapped in a <label>
        const lab = el.closest('label');
        return Boolean(lab && lab.contains(hit));
      },
      clickables(root) {
        return [...root.querySelectorAll('button, [role="switch"], [role="tab"], [role="radio"], [role="checkbox"], input[type="checkbox"], input[type="radio"], summary')]
          .filter((el) => visible(el) && !el.disabled && el.getAttribute('aria-disabled') !== 'true');
      },
      reachable(root) {
        return window.__h.clickables(root).filter((el) => window.__h.hittable(el));
      },
      async fillInputs(root) {
        const done = [];
        for (const el of root.querySelectorAll('input, textarea, select')) {
          if (!visible(el) || el.disabled || el.readOnly) continue;
          const t = (el.type || '').toLowerCase();
          try {
            if (el.tagName === 'SELECT') {
              if (el.options.length > 1) { nativeSet(el, el.options[(el.selectedIndex + 1) % el.options.length].value); el.dispatchEvent(new Event('change', { bubbles: true })); done.push('select:' + label(el)); }
            } else if (t === 'range') {
              const min = Number(el.min || 0), max = Number(el.max || 100);
              nativeSet(el, String(min + (max - min) * 0.6)); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); done.push('range:' + label(el));
            } else if (['checkbox', 'radio', 'file', 'hidden', 'submit', 'button', 'color'].includes(t)) {
              continue;
            } else {
              const v = t === 'number' ? '3' : t === 'email' ? 'qa@atlaslabs.dev' : t === 'url' ? 'https://example.com' : t === 'password' ? 'sk-test-e2e-123456' : 'test e2e';
              el.focus(); nativeSet(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.blur();
              done.push((el.tagName === 'TEXTAREA' ? 'textarea:' : 'input:') + label(el));
            }
          } catch (e) { done.push('FAILED input ' + label(el) + ' ' + e.message); }
          await sleep(25);
        }
        return done;
      },
    };
  })();
`;

function attach(win, pageName) {
  const wc = win.webContents;
  wc.setWindowOpenHandler(() => ({ action: 'deny' }));
  wc.on('will-navigate', (e, url) => { if (!url.startsWith(BASE)) e.preventDefault(); });
  wc.on('console-message', (...args) => {
    const ev = args[0];
    const level = typeof args[1] === 'number' ? args[1] : ev.level;
    const message = typeof args[2] === 'string' ? args[2] : ev.message;
    const isErr = level === 3 || level === 'error';
    const isWarn = level === 2 || level === 'warning';
    if (isErr || (isWarn && /react|key|uncontrolled|controlled|act\(|deprecated/i.test(message))) {
      if (/Download the React DevTools|Electron Security Warning|\[vite\]/i.test(message)) return;
      report.errors.push({ page: pageName(), kind: isErr ? 'console.error' : 'console.warn', msg: String(message).slice(0, 600) });
    }
  });
  wc.on('render-process-gone', (_e, d) => report.errors.push({ page: pageName(), kind: 'crash', msg: JSON.stringify(d) }));
  wc.on('dom-ready', () => { wc.executeJavaScript(PRELUDE).catch(() => {}); });
}

async function drainPageErrors(win, page) {
  const errs = await win.webContents.executeJavaScript('(window.__e2e && window.__e2e.errors.splice(0)) || []').catch(() => []);
  for (const e of errs) report.errors.push({ page, ...e });
}

async function load(win, url) {
  await win.loadURL(url);
  await win.webContents.executeJavaScript(PRELUDE + HELPERS);
  await sleep(500);
}

async function seed(win, settings) {
  await win.webContents.executeJavaScript(`localStorage.setItem('aura:settings', ${JSON.stringify(JSON.stringify(settings))}); true`);
}

async function shot(win, name, { full = true, scroller = 'main' } = {}) {
  let restore = null;
  if (full) {
    const h = await win.webContents.executeJavaScript(`(() => { const m = document.querySelector(${JSON.stringify(scroller)}); return m ? Math.ceil(m.scrollHeight + (window.innerHeight - m.clientHeight)) : document.documentElement.scrollHeight; })()`);
    const target = Math.min(Math.max(h, H), 7000);
    if (target > H + 4) { win.setContentSize(W, target); restore = true; await sleep(450); }
  }
  const img = await win.webContents.capturePage();
  const file = path.join(OUT, `${name}.png`);
  fs.writeFileSync(file, img.toPNG());
  if (restore) { win.setContentSize(W, H); await sleep(200); }
  return file;
}

/** Click every clickable inside `rootSel`, re-establishing context via `reset()` when needed. */
async function exercise(win, page, rootSel, resetJs, contextCheckJs) {
  const clicked = [];
  const covered = [];
  const retried = new Set();
  let recoveries = 0;
  const inputs = await win.webContents.executeJavaScript(`window.__h.fillInputs(document.querySelector(${JSON.stringify(rootSel)}) || document.body)`).catch((e) => ['FILL FAILED ' + e.message]);
  await sleep(150);
  let i = 0;
  let guard = 0;
  while (guard++ < 220) {
    if (contextCheckJs) {
      const ok = await win.webContents.executeJavaScript(contextCheckJs).catch(() => false);
      if (!ok) { recoveries++; if (typeof resetJs === 'function') await resetJs(); else await win.webContents.executeJavaScript(resetJs).catch(() => {}); await sleep(250); }
    }
    const res = await win.webContents.executeJavaScript(`(async () => {
      const root = document.querySelector(${JSON.stringify(rootSel)}) || document.body;
      const list = window.__h.clickables(root);
      if (${i} >= list.length) return { done: true, total: list.length };
      const el = list[${i}];
      const name = window.__h.label(el);
      if (/quit|sign ?out|log ?out/i.test(name)) return { skipped: name, total: list.length };
      if (!window.__h.hittable(el)) return { covered: name, total: list.length };
      el.click();
      await window.__h.sleep(140);
      return { clicked: name || '(unnamed ' + el.tagName.toLowerCase() + ')', total: list.length };
    })()`).catch((e) => ({ error: e.message }));
    if (res.done) break;
    if (res.error) clicked.push('ERROR ' + res.error);
    else if (res.clicked) clicked.push(res.clicked);
    else if (res.covered !== undefined) {
      // Something (modal / popover) is on top — dismiss it and retry this element once.
      covered.push(res.covered);
      win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' });
      await win.webContents.executeJavaScript(`(() => { const c = [...document.querySelectorAll('button')].find((b) => /^(cancel|close|dismiss)/i.test((b.textContent || b.getAttribute('aria-label') || b.title || '').trim()) && window.__h.hittable(b)); if (c) c.click(); return true; })()`).catch(() => {});
      await sleep(200);
      if (!retried.has(i)) { retried.add(i); continue; }
    }
    i++;
    // Close stray modals with Escape so subsequent elements remain reachable.
    if (i % 6 === 0) win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' });
    await drainPageErrors(win, page);
  }
  return { clicked, inputs, covered, recoveries };
}

async function run() {
  let current = 'boot';
  const win = new BrowserWindow({
    width: W, height: H, show: false, useContentSize: true, backgroundColor: '#09090b',
    webPreferences: { offscreen: true, contextIsolation: true, sandbox: false },
  });
  win.webContents.setFrameRate(30);
  attach(win, () => current);

  // ---------- 1. Auth + onboarding ----------
  if (!ONLY.length || ONLY.includes('auth')) {
    current = 'auth';
    await load(win, `${BASE}/dashboard.html`);
    await win.webContents.executeJavaScript(`localStorage.clear(); true`);
    await load(win, `${BASE}/dashboard.html`);
    const p = { name: 'auth', shots: [] };
    p.shots.push(await shot(win, '01-auth-login', { scroller: 'body' }));
    // Walk the wizard: repeatedly press the primary "continue"-type button.
    const steps = [];
    for (let s = 0; s < 14; s++) {
      const r = await win.webContents.executeJavaScript(`(async () => {
        await window.__h.fillInputs(document.body);
        const btns = window.__h.reachable(document.body);
        const L = (b) => window.__h.label(b);
        const notBack = (b) => !/back|cancel/i.test(L(b));
        const pick = btns.find((b) => notBack(b) && /authorize|confirm|save/i.test(L(b)))
          || btns.find((b) => notBack(b) && /finish|complete|launch|start/i.test(L(b)))
          || btns.find((b) => notBack(b) && /continue|next|sign in|log in/i.test(L(b)))
          || btns.find((b) => notBack(b) && /google/i.test(L(b)));
        if (!pick) return null;
        const n = window.__h.label(pick); pick.click(); await window.__h.sleep(700); return n;
      })()`).catch((e) => 'ERROR ' + e.message);
      if (!r) break;
      steps.push(r);
      p.shots.push(await shot(win, `01-auth-step-${String(s + 1).padStart(2, '0')}`, { scroller: 'body' }));
      const onDash = await win.webContents.executeJavaScript(`Boolean(document.querySelector('nav[aria-label]'))`);
      if (onDash) break;
      await drainPageErrors(win, 'auth');
    }
    p.steps = steps;
    report.pages.push(p);
    await drainPageErrors(win, 'auth');
  }

  // ---------- 2. Dashboard sections ----------
  current = 'dashboard';
  await load(win, `${BASE}/dashboard.html`);
  await seed(win, SEED);
  await load(win, `${BASE}/dashboard.html`);
  const sections = await win.webContents.executeJavaScript(`[...document.querySelectorAll('nav[aria-label] button')].map((b) => b.textContent.trim())`);
  report.sections = sections;
  for (let idx = 0; idx < sections.length; idx++) {
    const label = sections[idx];
    const id = `${String(idx + 1).padStart(2, '0')}-${label.replace(/[^a-z0-9]+/gi, '-').toLowerCase().replace(/^-|-$/g, '')}`;
    if (ONLY.length && !ONLY.some((o) => id.includes(o) || label.toLowerCase().includes(o.toLowerCase()))) continue;
    current = `section:${label}`;
    const selectJs = `(() => { const b = [...document.querySelectorAll('nav[aria-label] button')][${idx}]; b && b.click(); return true; })()`;
    const checkJs = `(() => { const b = [...document.querySelectorAll('nav[aria-label] button')][${idx}]; return Boolean(b && b.getAttribute('aria-current') === 'page'); })()`;
    // Fresh state for each section.
    await seed(win, SEED);
    await load(win, `${BASE}/dashboard.html`);
    await win.webContents.executeJavaScript(selectJs);
    await sleep(700);
    const page = { name: label, shots: [await shot(win, `02-${id}`)] };
    if (EXERCISE) {
      const recover = async () => { await seed(win, SEED); await load(win, `${BASE}/dashboard.html`); await win.webContents.executeJavaScript(selectJs); await sleep(500); };
      const ex = await exercise(win, current, 'main', recover, checkJs);
      page.recoveries = ex.recoveries;
      page.clicked = ex.clicked;
      page.covered = ex.covered;
      page.inputs = ex.inputs;
      page.shots.push(await shot(win, `02-${id}-after`, { full: false }));
    }
    await drainPageErrors(win, current);
    report.pages.push(page);
  }

  // Sidebar controls (plan badge, account card, wizard) — exercised separately.
  if (!ONLY.length || ONLY.includes('sidebar')) {
    current = 'sidebar';
    await seed(win, SEED);
    await load(win, `${BASE}/dashboard.html`);
    const ex = await exercise(win, current, 'aside', async () => { await seed(win, SEED); await load(win, `${BASE}/dashboard.html`); }, `Boolean(document.querySelector('nav[aria-label]'))`);
    report.pages.push({ name: 'sidebar', clicked: ex.clicked });
    await drainPageErrors(win, current);
  }

  // ---------- 3. Widget (top notch) ----------
  if (!ONLY.length || ONLY.includes('widget')) {
    current = 'widget';
    const ww = new BrowserWindow({
      width: 440, height: 620, show: false, transparent: true, frame: false, useContentSize: true,
      webPreferences: { offscreen: true, contextIsolation: true, sandbox: false },
    });
    attach(ww, () => current);
    await load(ww, `${BASE}/widget.html`);
    await seed(ww, SEED);
    await load(ww, `${BASE}/widget.html`);
    const wp = { name: 'widget', shots: [] };
    const save = async (n) => { const img = await ww.webContents.capturePage(); const f = path.join(OUT, `03-widget-${n}.png`); fs.writeFileSync(f, img.toPNG()); wp.shots.push(f); };
    await save('collapsed');
    // Hover the notch (real input events).
    for (let x = 200; x <= 220; x += 5) { ww.webContents.sendInputEvent({ type: 'mouseMove', x, y: 12 }); await sleep(60); }
    await sleep(900);
    await save('expanded');
    // Type a message and send it.
    const sent = await ww.webContents.executeJavaScript(`(async () => {
      const ta = document.querySelector('textarea');
      if (!ta) return 'no composer';
      ta.focus();
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(ta, 'Hello Aura, what can you do?');
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      await window.__h.sleep(80);
      ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
      return 'sent';
    })()`);
    wp.composer = sent;
    await sleep(2600);
    ww.webContents.sendInputEvent({ type: 'mouseMove', x: 220, y: 300 });
    await sleep(300);
    await save('chat');
    if (EXERCISE) {
      const ex = await exercise(ww, 'widget', '#root', `(() => true)()`, null);
      wp.clicked = ex.clicked;
      wp.covered = ex.covered;
      wp.inputs = ex.inputs;
      ww.webContents.sendInputEvent({ type: 'mouseMove', x: 220, y: 300 });
      await sleep(500);
      await save('after');
    }
    await drainPageErrors(ww, 'widget');
    report.pages.push(wp);
    ww.destroy();
  }

  report.finishedAt = new Date().toISOString();
  report.summary = {
    pages: report.pages.length,
    clicks: report.pages.reduce((n, p) => n + (p.clicked ? p.clicked.length : 0), 0),
    inputs: report.pages.reduce((n, p) => n + (p.inputs ? p.inputs.length : 0), 0),
    errors: report.errors.length,
  };
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.summary));
  for (const e of report.errors.slice(0, 40)) console.log(`[${e.page}] ${e.kind}: ${e.msg.split('\n')[0]}`);
  app.exit(report.errors.length ? 1 : 0);
}

app.whenReady().then(() => run().catch((e) => { console.error('HARNESS FAILURE', e); app.exit(2); }));
