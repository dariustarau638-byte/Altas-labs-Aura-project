/**
 * Security Approval Gate (Human-in-the-Loop) for Jarvis Desktop System Tools.
 * Prevents unprompted execution of destructive or high-privilege shell/system commands.
 */

export const RISK_LEVELS = {
  SAFE: 'SAFE',           // Read-only inspection (CPU, battery, get git status)
  CAUTION: 'CAUTION',     // Benign state changes (mute, toggle dark mode, open URL)
  DANGEROUS: 'DANGEROUS', // Shell execution, process termination, disk purge, file deletion
};

let approvalCounter = 1;
const pendingApprovals = new Map();
const sessionAllowedTools = new Set();
const listeners = new Set();

export function onApprovalRequest(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function broadcastApproval(event, payload) {
  for (const fn of listeners) {
    try {
      fn(event, payload);
    } catch {}
  }
}

export function isToolSessionAllowed(toolId) {
  return sessionAllowedTools.has(toolId);
}

export function allowToolForSession(toolId) {
  sessionAllowedTools.add(toolId);
}

export function clearSessionAllowances() {
  sessionAllowedTools.clear();
}

/**
 * Evaluates whether a tool needs human approval before execution.
 * Returns a Promise that resolves to true (approved) or false (rejected).
 */
export async function requestApprovalIfNeeded({ toolId, name, description, risk, params, previewCommand }) {
  if (risk !== RISK_LEVELS.DANGEROUS) {
    return { approved: true, auto: true };
  }

  if (isToolSessionAllowed(toolId)) {
    return { approved: true, sessionBypassed: true };
  }

  const approvalId = `gate-${Date.now()}-${approvalCounter++}`;

  return new Promise((resolve) => {
    const entry = {
      id: approvalId,
      toolId,
      name,
      description,
      risk,
      params,
      previewCommand: previewCommand || `Execute ${name}`,
      createdAt: new Date().toISOString(),
      resolve,
    };

    pendingApprovals.set(approvalId, entry);
    broadcastApproval('approval_requested', {
      id: approvalId,
      toolId,
      name,
      description,
      risk,
      previewCommand: entry.previewCommand,
      createdAt: entry.createdAt,
    });
  });
}

export function getPendingApprovals() {
  return Array.from(pendingApprovals.values()).map(({ resolve, ...rest }) => rest);
}

export function resolveApproval(approvalId, { approved, allowSession = false } = {}) {
  const item = pendingApprovals.get(approvalId);
  if (!item) return false;

  pendingApprovals.delete(approvalId);

  if (approved && allowSession) {
    allowToolForSession(item.toolId);
  }

  item.resolve({ approved: Boolean(approved), allowSession });
  broadcastApproval('approval_resolved', { id: approvalId, approved: Boolean(approved) });
  return true;
}
