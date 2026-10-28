import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { executeJarvisTool } from './jarvisTools.js';

let electronApp;
try {
  const electron = await import('electron');
  electronApp = electron.app;
} catch {}

/**
 * Jarvis-style Scheduled Routines & Automation Engine.
 * Supports manual, recurring interval, and daily time-of-day automation workflows.
 */

const DEFAULT_ROUTINES = [
  {
    id: 'routine-morning-standup',
    name: 'Morning Developer Briefing',
    description: 'Inspects CPU/RAM health, checks git status, and provides an active summary.',
    trigger: 'timeOfDay',
    timeOfDay: '09:00',
    intervalMinutes: 1440,
    enabled: true,
    tools: ['routine_morning_standup', 'dev_git_status', 'sys_health_overview'],
    lastRunAt: null,
    lastResult: null,
  },
  {
    id: 'routine-workspace-cleanup',
    name: 'Daily Disk & Cache Cleanup',
    description: 'Flushes %TEMP% files, clears Recycle Bin, and frees SSD storage space.',
    trigger: 'interval',
    intervalMinutes: 720, // twice a day
    enabled: true,
    tools: ['file_clean_temp', 'file_empty_recycle_bin'],
    lastRunAt: null,
    lastResult: null,
  },
  {
    id: 'routine-hourly-health',
    name: 'Hourly System Telemetry Check',
    description: 'Monitors memory consumption and alerts if physical RAM exceeds safe threshold.',
    trigger: 'interval',
    intervalMinutes: 60,
    enabled: false,
    tools: ['sys_health_overview', 'sys_battery_status'],
    lastRunAt: null,
    lastResult: null,
  },
  {
    id: 'routine-deep-focus-setup',
    name: 'Deep Focus Coding Mode',
    description: 'Mutes audio interruptions and minimizes all non-essential background windows.',
    trigger: 'manual',
    intervalMinutes: null,
    enabled: true,
    tools: ['routine_deep_focus'],
    lastRunAt: null,
    lastResult: null,
  },
];

let routines = null;
let routineTimer = null;
const listeners = new Set();

function getStoragePath() {
  const userDir = electronApp?.getPath ? electronApp.getPath('userData') : path.join(os.tmpdir(), 'aura');
  return path.join(userDir, 'aura-routines.json');
}

function loadRoutines() {
  if (routines !== null) return routines;
  try {
    const file = getStoragePath();
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (Array.isArray(data) && data.length > 0) {
        routines = data;
        return routines;
      }
    }
  } catch {}
  routines = DEFAULT_ROUTINES;
  return routines;
}

function persistRoutines() {
  if (!routines) return;
  try {
    fs.writeFileSync(getStoragePath(), JSON.stringify(routines, null, 2), 'utf8');
  } catch {}
}

export function listRoutines() {
  return loadRoutines();
}

export function toggleRoutine(id, enabled) {
  const list = loadRoutines();
  const routine = list.find((r) => r.id === id);
  if (routine) {
    routine.enabled = Boolean(enabled);
    persistRoutines();
    return routine;
  }
  return null;
}

export async function runRoutine(id) {
  const list = loadRoutines();
  const routine = list.find((r) => r.id === id);
  if (!routine) throw new Error(`Routine not found: ${id}`);

  const stepResults = [];
  for (const toolId of routine.tools) {
    try {
      const result = await executeJarvisTool(toolId);
      stepResults.push({ toolId, success: result.success !== false, result });
    } catch (err) {
      stepResults.push({ toolId, success: false, error: err.message });
    }
  }

  const finishedAt = new Date().toISOString();
  routine.lastRunAt = finishedAt;
  routine.lastResult = {
    executedAt: finishedAt,
    stepCount: stepResults.length,
    successfulSteps: stepResults.filter((s) => s.success).length,
    results: stepResults,
  };
  persistRoutines();

  for (const fn of listeners) {
    try { fn('routine_finished', routine); } catch {}
  }

  try {
    const { trackDesktopUsage } = await import('./telemetryTracker.js');
    trackDesktopUsage('routine_run:' + routine.name, routine.tools?.length || 1, { routineId: routine.id });
  } catch {}

  return routine;
}

export function saveRoutine(routineData) {
  const list = loadRoutines();
  const id = routineData.id || `routine-${Date.now()}`;
  const existingIdx = list.findIndex((r) => r.id === id);

  const entry = {
    id,
    name: routineData.name || 'Custom Automation Routine',
    description: routineData.description || '',
    trigger: routineData.trigger || 'manual',
    intervalMinutes: routineData.intervalMinutes || 60,
    timeOfDay: routineData.timeOfDay || '10:00',
    enabled: routineData.enabled ?? true,
    tools: Array.isArray(routineData.tools) ? routineData.tools : [],
    lastRunAt: routineData.lastRunAt || null,
    lastResult: routineData.lastResult || null,
  };

  if (existingIdx >= 0) {
    list[existingIdx] = { ...list[existingIdx], ...entry };
  } else {
    list.push(entry);
  }

  persistRoutines();
  return entry;
}

export function deleteRoutine(id) {
  const list = loadRoutines();
  routines = list.filter((r) => r.id !== id);
  persistRoutines();
  return true;
}

export function startRoutineScheduler() {
  if (routineTimer) return;
  loadRoutines();

  routineTimer = setInterval(async () => {
    const now = new Date();
    const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const list = loadRoutines();

    for (const r of list) {
      if (!r.enabled) continue;

      if (r.trigger === 'timeOfDay' && r.timeOfDay === currentHHMM) {
        // Run once in this minute if not already run in the last 60 seconds
        const last = r.lastRunAt ? new Date(r.lastRunAt).getTime() : 0;
        if (Date.now() - last > 70000) {
          runRoutine(r.id).catch(() => {});
        }
      } else if (r.trigger === 'interval' && r.intervalMinutes > 0) {
        const last = r.lastRunAt ? new Date(r.lastRunAt).getTime() : 0;
        const intervalMs = r.intervalMinutes * 60 * 1000;
        if (Date.now() - last >= intervalMs) {
          runRoutine(r.id).catch(() => {});
        }
      }
    }
  }, 30000); // Check every 30 seconds
}

export function stopRoutineScheduler() {
  if (routineTimer) {
    clearInterval(routineTimer);
    routineTimer = null;
  }
}

export function onRoutineEvent(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
