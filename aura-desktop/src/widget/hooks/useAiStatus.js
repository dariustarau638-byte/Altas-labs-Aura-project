import { useEffect, useState } from 'react';
import { aura } from '../../lib/bridge.js';

const POLL_MS = 8000;

/** Polls the status of the active AI runtime (local Ollama or Cloud OpenAI/Claude/Gemini). */
export function useAiStatus() {
  const [status, setStatus] = useState({ online: false, models: [], model: null, loading: true });

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try {
        const s = await aura.ai.status();
        if (alive) setStatus({ ...s, loading: false });
      } catch {
        if (alive) setStatus((prev) => ({ ...prev, online: false, loading: false }));
      }
    };
    refresh();
    const offSettings = aura.settings.onChange(() => refresh());
    const timer = setInterval(refresh, POLL_MS);
    return () => {
      alive = false;
      offSettings();
      clearInterval(timer);
    };
  }, []);

  return status;
}
