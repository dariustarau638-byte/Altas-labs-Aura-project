import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_SETTINGS, deepMerge, getTheme, sanitizeSettings } from '../../shared/settings.js';
import { aura } from './bridge.js';

/** Applies CSS variables for the theme and opacity onto an element (default :root). */
export function applyThemeVariables(appearance, target = document.documentElement) {
  if (!target || !appearance) return;
  const theme = getTheme(appearance.theme);
  const s = target.style;
  s.setProperty('--aura-300', theme.accent[300]);
  s.setProperty('--aura-400', theme.accent[400]);
  s.setProperty('--aura-500', theme.accent[500]);
  s.setProperty('--aura-600', theme.accent[600]);
  s.setProperty('--orb-1', theme.orb[0]);
  s.setProperty('--orb-2', theme.orb[1]);
  s.setProperty('--orb-3', theme.orb[2]);
  s.setProperty('--orb-4', theme.orb[3]);
  s.setProperty('--glass-top', theme.glass[0]);
  s.setProperty('--glass-bottom', theme.glass[1]);
  s.setProperty('--glass-alpha', String(appearance.opacity ?? 0.88));
}

/**
 * Shared hook between Companion Widget and Control Dashboard.
 * - loads settings from main process
 * - listens for 'settings:changed' broadcasts
 * - automatically applies theme CSS variables
 * - provides optimistic update(patch) and reset()
 */
export function useSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    aura.settings.get().then((initial) => {
      if (!alive || !initial) return;
      const clean = sanitizeSettings(initial);
      setSettings(clean);
      setLoaded(true);
    });
    const off = aura.settings.onChange((incoming) => {
      setSettings(sanitizeSettings(incoming));
    });
    return () => {
      alive = false;
      off();
    };
  }, []);

  useEffect(() => {
    applyThemeVariables(settings.appearance);
  }, [settings.appearance]);

  const update = useCallback((patch) => {
    setSettings((prev) => sanitizeSettings(deepMerge(prev, patch)));
    return aura.settings.update(patch);
  }, []);

  const reset = useCallback(async () => {
    const fresh = await aura.settings.reset();
    if (fresh) setSettings(sanitizeSettings(fresh));
    return fresh;
  }, []);

  return { settings, loaded, update, reset };
}
