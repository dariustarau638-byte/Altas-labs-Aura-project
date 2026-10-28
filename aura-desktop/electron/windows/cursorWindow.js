// Cursor overlay is completely disabled per user request ("delete the mouse png").
// Real mouse control now directly drives the native Windows cursor smoothly.

let isCoPilotActive = false;

export function ensureCursorWindow() {
  return null;
}

export function syncCursorThemeAndState() {}

export function setCursorCoPilotActive(active) {
  isCoPilotActive = Boolean(active);
  return isCoPilotActive;
}

export function getCursorCoPilotActive() {
  return isCoPilotActive;
}

export function triggerCursorClickEffect() {}

export function updateCursorBadgeState() {}

export const updateCursorCoPilotBadge = updateCursorBadgeState;

export function destroyCursorWindow() {
  isCoPilotActive = false;
}
