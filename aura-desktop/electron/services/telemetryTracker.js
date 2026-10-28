import { apiClient } from './apiClient.js';
import { isAuthenticated } from './tokenStorage.js';

/**
 * Lightweight, non-blocking telemetry engine for Aura Desktop.
 * Dispatches usage events asynchronously in the background.
 * If offline or server is temporarily unreachable, buffers in-memory
 * for automatic retry so desktop automation and UI threads are never blocked.
 */

const MAX_BUFFER_SIZE = 100;
let queue = [];
let flushTimer = null;

async function sendEventImmediately(item) {
  try {
    if (!isAuthenticated()) {
      return false; // Skip silently if user is not authenticated with shared backend
    }
    await apiClient.trackUsage(item.action, item.units, item.metadata);
    return true;
  } catch (err) {
    if (err.status === 403 && err.data?.upgradeRequired) {
      // Tier restriction hit — do not re-queue
      return null;
    }
    if (process.env.DEBUG_TELEMETRY) {
      console.warn('[telemetry] Failed to track usage:', err.message);
    }
    return false;
  }
}

async function flushQueue() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (!queue.length || !isAuthenticated()) {
    return;
  }

  const batch = queue.splice(0, 20);
  for (const item of batch) {
    const result = await sendEventImmediately(item);
    if (result === false && queue.length < MAX_BUFFER_SIZE) {
      queue.push(item);
    }
  }

  if (queue.length > 0) {
    flushTimer = setTimeout(flushQueue, 3000);
  }
}

/**
 * Track a feature execution asynchronously without awaiting or blocking.
 * @param {string} action_performed - e.g. "tool:file_clean_temp", "routine:morning_standup"
 * @param {number} tokens_used_or_duration - e.g. token count or duration
 * @param {object} metadata - optional contextual data
 */
export function trackDesktopUsage(action_performed, tokens_used_or_duration = 1, metadata = {}) {
  const item = {
    action: action_performed,
    units: Number(tokens_used_or_duration) || 1,
    metadata,
    timestamp: Date.now(),
  };

  // Immediate non-blocking dispatch
  setImmediate(async () => {
    const result = await sendEventImmediately(item);
    if (result === false && queue.length < MAX_BUFFER_SIZE) {
      queue.push(item);
      if (!flushTimer) {
        flushTimer = setTimeout(flushQueue, 3000);
      }
    }
  });
}

export async function flushTelemetry() {
  await flushQueue();
}
