import { config } from '../config.js';

/**
 * Client for Ollama HTTP API (http://127.0.0.1:11434).
 * Supports:
 * - getStatus() & getDetailedStatus() (/api/tags + /api/ps for models in VRAM/RAM)
 * - streamChat() (/api/chat)
 * - pullModel() (/api/pull with NDJSON progress)
 * - deleteModel() (/api/delete)
 * - unloadModel() (releases model from VRAM/RAM using keep_alive: 0)
 */
const base = () => config.ai.host.replace(/\/$/, '');

export async function getStatus() {
  try {
    const res = await fetch(`${base()}/api/tags`, { signal: AbortSignal.timeout(1500) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { online: true, models: (data.models ?? []).map((m) => m.name) };
  } catch {
    return { online: false, models: [] };
  }
}

export async function getDetailedStatus() {
  try {
    const [tagsRes, psRes] = await Promise.all([
      fetch(`${base()}/api/tags`, { signal: AbortSignal.timeout(2000) }),
      fetch(`${base()}/api/ps`, { signal: AbortSignal.timeout(2000) }).catch(() => null),
    ]);
    if (!tagsRes.ok) throw new Error(`HTTP ${tagsRes.status}`);
    const tagsData = await tagsRes.json();
    const psData = psRes && psRes.ok ? await psRes.json() : { models: [] };

    const models = (tagsData.models ?? []).map((m) => ({
      name: m.name,
      sizeBytes: m.size ?? 0,
      modifiedAt: m.modified_at ?? null,
      family: m.details?.family ?? null,
      parameterSize: m.details?.parameter_size ?? null,
      quantization: m.details?.quantization_level ?? null,
    }));

    const running = (psData.models ?? []).map((m) => ({
      name: m.name,
      sizeBytes: m.size ?? 0,
      sizeVramBytes: m.size_vram ?? 0,
      expiresAt: m.expires_at ?? null,
      parameterSize: m.details?.parameter_size ?? null,
      quantization: m.details?.quantization_level ?? null,
    }));

    return {
      online: true,
      host: config.ai.host,
      models,
      running,
    };
  } catch {
    return {
      online: false,
      host: config.ai.host,
      models: [],
      running: [],
    };
  }
}

/** Picks the preferred model from settings or default if installed, else first available. */
export function pickModel(models, preferred) {
  const names = models.map((m) => (typeof m === 'string' ? m : m.name));
  const wanted = preferred || config.ai.defaultModel;
  if (!names.length) return wanted;
  return names.find((m) => m === wanted || m.startsWith(`${wanted}:`)) ?? names[0];
}

/** Async generator yielding text deltas as the model streams tokens (NDJSON). */
export async function* streamChat({ model, messages, options, signal }) {
  const res = await fetch(`${base()}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, options, stream: true }),
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Ollama responded with ${res.status}: ${text || res.statusText}`);
  }

  const decoder = new TextDecoder();
  let buffer = '';
  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true });
    let newline;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line) continue;
      const data = JSON.parse(line);
      if (data.error) throw new Error(data.error);
      if (data.message?.content) yield data.message.content;
      if (data.done) return;
    }
  }
}

/** Async generator for downloading models (`ollama pull`) with live progress. */
export async function* pullModel(name, { signal } = {}) {
  const res = await fetch(`${base()}/api/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name.trim(), stream: true }),
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Download error (${res.status}): ${text || res.statusText}`);
  }

  const decoder = new TextDecoder();
  let buffer = '';
  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true });
    let newline;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line) continue;
      const data = JSON.parse(line);
      if (data.error) throw new Error(data.error);
      yield {
        status: data.status || 'Downloading...',
        completed: data.completed ?? null,
        total: data.total ?? null,
        digest: data.digest ?? null,
      };
    }
  }
}

/** Deletes a locally installed model. */
export async function deleteModel(name) {
  const res = await fetch(`${base()}/api/delete`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to delete model (${res.status}): ${text || res.statusText}`);
  }
  return true;
}

/** Unloads a model from VRAM/RAM by setting `keep_alive: 0`. */
export async function unloadModel(name) {
  const res = await fetch(`${base()}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: name, keep_alive: 0 }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to unload model (${res.status}): ${text || res.statusText}`);
  }
  return true;
}
