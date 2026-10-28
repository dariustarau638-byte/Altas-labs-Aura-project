import fs from 'node:fs/promises';
import path from 'node:path';
import { app, clipboard, desktopCapturer, screen } from 'electron';
import { getActiveWindowInfo } from './desktopAgent.js';

const MAX_SNAPSHOTS = 60;
let timelineCache = null;
let autoRecordTimer = null;
let isAutoRecording = true;

function getTimelineFilePath() {
  return path.join(app.getPath('userData'), 'visual-timeline.json');
}

function classifyWindow(processName = '', windowTitle = '') {
  const combined = `${processName} ${windowTitle}`.toLowerCase();
  if (/(code|cursor|visual studio|webstorm|idea|pycharm|sublime|vim|git|terminal|powershell|cmd)/.test(combined)) {
    return 'Code & Development';
  }
  if (/(chrome|msedge|firefox|brave|opera|http|www|google|youtube|github|stack)/.test(combined)) {
    return 'Browser & Web';
  }
  if (/(notepad|word|excel|powerpoint|notion|obsidian|pdf|acrobat|docs|document)/.test(combined)) {
    return 'Documents & Notes';
  }
  if (/(cs2|valorant|league|dota|minecraft|steam|epic|cyberpunk|elden|fortnite|gta)/.test(combined)) {
    return 'Gaming';
  }
  return 'Desktop & Apps';
}

function buildSearchTags(processName, windowTitle, category, clipboardSnippet) {
  const raw = `${processName} ${windowTitle} ${category} ${clipboardSnippet || ''}`
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s._-]/gu, ' ');
  const tokens = raw.split(/\s+/).filter((w) => w.length >= 2);
  return Array.from(new Set(tokens)).slice(0, 40);
}

async function loadTimelineFromDisk() {
  if (Array.isArray(timelineCache)) return timelineCache;
  try {
    const raw = await fs.readFile(getTimelineFilePath(), 'utf8');
    const parsed = JSON.parse(raw);
    timelineCache = Array.isArray(parsed) ? parsed : [];
  } catch {
    timelineCache = [];
  }
  return timelineCache;
}

async function saveTimelineToDisk(list) {
  timelineCache = list.slice(0, MAX_SNAPSHOTS);
  try {
    await fs.writeFile(getTimelineFilePath(), JSON.stringify(timelineCache, null, 2), 'utf8');
  } catch {
    // ignore write error
  }
  return timelineCache;
}

/**
 * Captures a compact snapshot (JPEG 640x360) for local SSD Visual Timeline.
 */
export async function captureTimelineSnapshot({ reason = 'manual', note = '' } = {}) {
  const list = await loadTimelineFromDisk();
  const winInfo = await getActiveWindowInfo();

  if (
    reason === 'auto' &&
    list.length > 0 &&
    list[0].windowTitle === winInfo.title &&
    Date.now() - list[0].epochMs < 120_000
  ) {
    return list[0];
  }

  const primary = screen.getPrimaryDisplay();
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 640, height: 360 },
  });

  const source = sources[0];
  if (!source) {
    throw new Error('Could not create visual timeline snapshot.');
  }

  const jpegBuffer = source.thumbnail.toJPEG(68);
  const imageDataUrl = `data:image/jpeg;base64,${jpegBuffer.toString('base64')}`;

  let clipText = '';
  try {
    clipText = (clipboard.readText() || '').trim().slice(0, 220);
  } catch {
    // ignore
  }

  const now = new Date();
  const category = classifyWindow(winInfo.processName, winInfo.title);
  const snapshot = {
    id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    epochMs: Date.now(),
    createdAt: now.toISOString(),
    timeLabel: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    dateLabel: now.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
    windowTitle: winInfo.title || 'Desktop Windows',
    processName: winInfo.processName || 'explorer',
    category,
    clipboardSnippet: clipText,
    note: note || '',
    screenSize: `${primary.size.width}x${primary.size.height}`,
    tags: buildSearchTags(winInfo.processName, winInfo.title, category, clipText),
    imageDataUrl,
  };

  const updated = [snapshot, ...list].slice(0, MAX_SNAPSHOTS);
  await saveTimelineToDisk(updated);
  return snapshot;
}

/**
 * Formats relative time difference ("just now", "5 minutes ago").
 */
function formatRelativeMinutes(epochMs) {
  const diffMin = Math.max(0, Math.round((Date.now() - epochMs) / 60000));
  if (diffMin === 0) return 'just now (<1 min)';
  if (diffMin === 1) return '1 minute ago';
  return `${diffMin} minutes ago`;
}

/**
 * Searches local SSD Visual Timeline using natural language queries.
 */
export async function searchVisualTimeline(naturalQuery = '') {
  let list = await loadTimelineFromDisk();

  if (list.length === 0) {
    await captureTimelineSnapshot({ reason: 'initial' });
    list = await loadTimelineFromDisk();
  }

  const q = String(naturalQuery || '').trim().toLowerCase();
  const enriched = list.map((item) => ({
    ...item,
    relativeTime: formatRelativeMinutes(item.epochMs),
    minutesAgo: Math.max(0, Math.round((Date.now() - item.epochMs) / 60000)),
  }));

  if (!q) {
    return {
      query: '',
      totalStored: enriched.length,
      autoRecording: isAutoRecording,
      results: enriched.slice(0, 8),
      explanation: `🕒 Local SSD Visual Timeline (${enriched.length} snapshots stored privately). Most recent captures:`,
    };
  }

  // Extract relative time e.g. "10 minutes ago"
  const minMatch = q.match(/(?:(\d+)\s*(?:minutes?|mins?|m)\s*ago)/i);
  const targetMinutes = minMatch ? Number(minMatch[1]) : null;

  // Semantic category extraction
  const wantsCode = /(code|script|function|vscode|visual studio|error|terminal|git)/i.test(q);
  const wantsDoc = /(doc|document|notes?|text|pdf|word|excel|sheet|file)/i.test(q);
  const wantsWeb = /(browser|website|page|web|link|chrome|edge|article|site)/i.test(q);
  const wantsGame = /(game|gaming|match|score)/i.test(q);

  const stopWords = new Set([
    'hey', 'aura', 'where', 'did', 'i', 'see', 'that', 'thing', 'ago',
    'minutes', 'min', 'show', 'me', 'what', 'was', 'open', 'earlier',
    'the', 'a', 'an', 'in', 'on', 'at', 'with', 'from', 'to', 'for',
  ]);
  const keywords = q
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !stopWords.has(w) && !/^\d+$/.test(w));

  const scored = enriched.map((item) => {
    let score = 0;

    if (wantsCode && item.category === 'Code & Development') score += 5;
    if (wantsDoc && item.category === 'Documents & Notes') score += 5;
    if (wantsWeb && item.category === 'Browser & Web') score += 5;
    if (wantsGame && item.category === 'Gaming') score += 5;

    if (targetMinutes !== null) {
      const delta = Math.abs(item.minutesAgo - targetMinutes);
      if (delta <= 3) score += 6;
      else if (delta <= 10) score += 3;
    }

    const haystack = `${item.windowTitle} ${item.processName} ${item.category} ${item.clipboardSnippet || ''} ${(item.tags || []).join(' ')}`.toLowerCase();
    for (const kw of keywords) {
      if (haystack.includes(kw)) score += 4;
    }

    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score || b.item.epochMs - a.item.epochMs);
  const filtered = scored.filter((s) => s.score > 0).map((s) => s.item);
  const finalResults = (filtered.length > 0 ? filtered : enriched).slice(0, 6);

  return {
    query: naturalQuery,
    totalStored: enriched.length,
    autoRecording: isAutoRecording,
    results: finalResults,
    explanation:
      filtered.length > 0
        ? `🕒 Searched local SSD timeline for "${naturalQuery}" and found ${finalResults.length} relevant moments:`
        : `🕒 No exact keyword match for "${naturalQuery}", but here are the windows open recently on your screen:`,
  };
}

export async function clearVisualTimeline() {
  await saveTimelineToDisk([]);
  return { ok: true, totalStored: 0 };
}

export async function deleteTimelineSnapshot(snapshotId) {
  const list = await loadTimelineFromDisk();
  const next = list.filter((x) => x.id !== snapshotId);
  await saveTimelineToDisk(next);
  return { ok: true, totalStored: next.length };
}

export function setTimelineAutoRecord(enabled) {
  isAutoRecording = Boolean(enabled);
  clearInterval(autoRecordTimer);
  autoRecordTimer = null;

  if (isAutoRecording) {
    autoRecordTimer = setInterval(() => {
      captureTimelineSnapshot({ reason: 'auto' }).catch(() => {});
    }, 55_000);
  }
  return { autoRecording: isAutoRecording };
}

export function startVisualTimelineRecorder() {
  setTimeout(() => {
    captureTimelineSnapshot({ reason: 'startup' }).catch(() => {});
  }, 4000);
  setTimelineAutoRecord(true);
}
