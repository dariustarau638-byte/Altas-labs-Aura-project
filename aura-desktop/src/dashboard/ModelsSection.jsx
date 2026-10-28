import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Check,
  Cpu,
  Download,
  Gauge,
  HardDrive,
  MemoryStick,
  PowerOff,
  RefreshCw,
  Server,
  Sparkles,
  Square,
  Trash2,
  Zap,
} from 'lucide-react';
import { aura } from '../lib/bridge.js';

const RECOMMENDED_MODELS = [
  {
    name: 'llama3.2:3b',
    label: 'Llama 3.2 (3B)',
    size: '~2.0 GB',
    desc: 'Fast and versatile, ideal for laptops and daily desktop assistance.',
  },
  {
    name: 'gemma3:4b',
    label: 'Gemma 3 (4B)',
    size: '~3.3 GB',
    desc: 'Compact and modern Google model with an exceptional speed-to-quality ratio.',
  },
  {
    name: 'qwen2.5-coder:7b',
    label: 'Qwen 2.5 Coder (7B)',
    size: '~4.7 GB',
    desc: 'Specialized in coding, script generation, and software architecture.',
  },
  {
    name: 'mistral:7b',
    label: 'Mistral (7B)',
    size: '~4.1 GB',
    desc: 'Strong performance in document drafting, synthesis, and general reasoning.',
  },
  {
    name: 'deepseek-r1:8b',
    label: 'DeepSeek R1 (8B)',
    size: '~4.9 GB',
    desc: 'Step-by-step reasoning model optimized for complex problem solving.',
  },
];

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const val = bytes / 1024 ** i;
  return `${val.toFixed(i >= 3 ? 1 : 0)} ${units[i]}`;
}

function MeterBar({ percent, colorClass = 'bg-emerald-400' }) {
  const safe = Math.min(100, Math.max(0, Number(percent) || 0));
  const barColor =
    safe > 88 ? 'bg-red-400' : safe > 70 ? 'bg-amber-400' : colorClass;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
      <div
        className={`h-full rounded-full transition-all duration-300 ${barColor}`}
        style={{ width: `${safe}%` }}
      />
    </div>
  );
}

export default function ModelsSection({ settings, onUpdateSettings }) {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pullInput, setPullInput] = useState('');
  const [pullState, setPullState] = useState(null); // { name, status, completed, total, error }
  const [busyModel, setBusyModel] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const data = await aura.ai.overview();
      setOverview(data);
    } catch {
      // retain state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 2500);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    const offProgress = aura.ai.onPullProgress((p) => {
      setPullState({
        name: p.name,
        status: p.status || 'Downloading…',
        completed: p.completed,
        total: p.total,
        error: null,
      });
    });
    const offDone = aura.ai.onPullDone(({ name, aborted }) => {
      setPullState(null);
      if (!aborted) {
        setFeedback({ type: 'success', text: `Model "${name}" installed successfully.` });
        setPullInput('');
        refresh();
      }
    });
    const offError = aura.ai.onPullError(({ name, message }) => {
      setPullState({ name, status: 'Error', error: message });
    });
    return () => {
      offProgress();
      offDone();
      offError();
    };
  }, [refresh]);

  const startPull = (modelName) => {
    const clean = (modelName ?? pullInput).trim();
    if (!clean) return;
    setFeedback(null);
    setPullState({ name: clean, status: 'Initiating connection to Ollama registry…', completed: 0, total: 0 });
    aura.ai.pullModel(clean);
  };

  const handleSelectModel = (name) => {
    onUpdateSettings({ ai: { model: name } });
    setFeedback({ type: 'success', text: `Active model changed to "${name}".` });
    refresh();
  };

  const handleUnload = async (name) => {
    setBusyModel(name);
    try {
      await aura.ai.unloadModel(name);
      await refresh();
      setFeedback({ type: 'success', text: `VRAM/RAM memory for "${name}" has been freed.` });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setBusyModel(null);
    }
  };

  const handleDelete = async (name) => {
    setBusyModel(name);
    try {
      await aura.ai.deleteModel(name);
      if (settings.ai.model === name) {
        onUpdateSettings({ ai: { model: '' } });
      }
      await refresh();
      setFeedback({ type: 'success', text: `Model "${name}" deleted from disk.` });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setBusyModel(null);
    }
  };

  const sys = overview?.system;
  const gpu = sys?.gpu;
  const models = overview?.models ?? [];
  const running = overview?.running ?? [];
  const activeModel = settings.ai.model || overview?.activeModel;

  const pullPercent =
    pullState?.total > 0 ? Math.min(100, Math.round((pullState.completed / pullState.total) * 100)) : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight text-zinc-50">
            AI Models &amp; Hardware Telemetry
          </h1>
          <p className="mt-1 text-[13px] leading-relaxed text-zinc-400">
            Track real-time CPU, RAM, and GPU/VRAM utilization and manage local Ollama models.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`badge ${
              overview?.online
                ? 'badge-success'
                : 'badge-warning'
            }`}
          >
            <span
              className={`dot ${
                overview?.online ? 'dot-success' : 'dot-warning'
              }`}
            />
            <span>{overview?.online ? `Ollama Online (${overview.host})` : 'Ollama Offline'}</span>
          </span>
          <button
            type="button"
            onClick={refresh}
            className="btn btn-sm"
          >
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* Feedback / error message */}
      {feedback && (
        <div
          className={`flex items-center justify-between rounded-md border px-3 py-2 text-xs ${
            feedback.type === 'error'
              ? 'border-red-500/25 bg-red-500/[0.08] text-red-200'
              : 'border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-200'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-zinc-400 hover:text-zinc-200"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. Hardware Telemetry Cards */}
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
        {/* CPU */}
        <div className="card p-3.5">
          <div className="mb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="grid size-7 place-items-center rounded-md border border-line bg-surface-2 text-zinc-300">
                <Cpu size={15} />
              </div>
              <div>
                <div className="text-xs font-medium text-zinc-200">Processor (CPU)</div>
                <div className="text-[11px] text-zinc-500">
                  {sys ? `${sys.cpu.cores} logical threads` : 'Reading…'}
                </div>
              </div>
            </div>
            <span className="font-mono text-base font-semibold text-zinc-100 tabular-nums">
              {sys ? `${sys.cpu.usagePercent}%` : '—'}
            </span>
          </div>
          <MeterBar percent={sys?.cpu.usagePercent ?? 0} />
          <div className="mt-2 truncate font-mono text-[11px] text-zinc-500" title={sys?.cpu.model}>
            {sys?.cpu.model ?? 'Loading…'}
          </div>
        </div>

        {/* RAM */}
        <div className="card p-3.5">
          <div className="mb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="grid size-7 place-items-center rounded-md border border-line bg-surface-2 text-zinc-300">
                <MemoryStick size={15} />
              </div>
              <div>
                <div className="text-xs font-medium text-zinc-200">System Memory (RAM)</div>
                <div className="text-[11px] text-zinc-500">
                  {sys
                    ? `${formatBytes(sys.ram.usedBytes)} / ${formatBytes(sys.ram.totalBytes)}`
                    : 'Reading…'}
                </div>
              </div>
            </div>
            <span className="font-mono text-base font-semibold text-zinc-100 tabular-nums">
              {sys ? `${sys.ram.usagePercent}%` : '—'}
            </span>
          </div>
          <MeterBar percent={sys?.ram.usagePercent ?? 0} colorClass="bg-zinc-200" />
          <div className="mt-2 text-[11px] text-zinc-500">
            Available:{' '}
            <span className="font-mono text-zinc-400">
              {sys ? formatBytes(sys.ram.totalBytes - sys.ram.usedBytes) : '—'}
            </span>
          </div>
        </div>

        {/* GPU / VRAM */}
        <div className="card p-3.5">
          <div className="mb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="grid size-7 place-items-center rounded-md border border-line bg-surface-2 text-zinc-300">
                <Gauge size={15} />
              </div>
              <div>
                <div className="text-xs font-medium text-zinc-200">GPU / VRAM Accelerator</div>
                <div className="text-[11px] text-zinc-500">
                  {gpu?.vramUsed != null && gpu?.vramTotal != null
                    ? `VRAM: ${formatBytes(gpu.vramUsed)} / ${formatBytes(gpu.vramTotal)}`
                    : gpu?.vramTotal
                      ? `Dedicated memory: ${formatBytes(gpu.vramTotal)}`
                      : 'Shared / integrated memory'}
                </div>
              </div>
            </div>
            <span className="font-mono text-base font-semibold text-zinc-100 tabular-nums">
              {gpu?.vramPercent != null
                ? `${gpu.vramPercent}%`
                : gpu?.utilizationPercent != null
                  ? `${gpu.utilizationPercent}%`
                  : 'Active'}
            </span>
          </div>
          <MeterBar
            percent={gpu?.vramPercent ?? gpu?.utilizationPercent ?? 12}
            colorClass="bg-emerald-400"
          />
          <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-zinc-500">
            <span className="truncate" title={gpu?.name}>
              {gpu?.name ?? 'Detecting graphics adapter…'}
            </span>
            {gpu?.temperatureC != null && (
              <span className="shrink-0 font-mono text-zinc-400">{gpu.temperatureC}°C</span>
            )}
          </div>
        </div>
      </div>

      {/* Guide if Ollama is offline */}
      {!loading && !overview?.online && (
        <div className="card border-amber-500/25 bg-amber-500/[0.03] p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-400" />
            <div className="space-y-1 text-xs">
              <div className="font-medium text-amber-200">
                Local Ollama service is not responding on {overview?.host || 'http://127.0.0.1:11434'}
              </div>
              <p className="text-zinc-400">
                To run local AI models on your PC, make sure <span className="font-medium text-zinc-200">Ollama</span> is installed and active:
              </p>
              <pre className="mt-2 inline-block rounded border border-line bg-canvas px-2.5 py-1 font-mono text-[11px] text-zinc-200">
                ollama serve
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* 2. Models in memory */}
      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 shrink-0 place-items-center rounded-md border border-line bg-surface-2 text-zinc-300">
              <Activity size={16} />
            </div>
            <div>
              <h2 className="section-title">
                Models Loaded in Memory (VRAM / RAM)
              </h2>
              <p className="text-xs text-zinc-400">
                Models kept warm in memory for instantaneous replies in companion.
              </p>
            </div>
          </div>
          <span className="badge">
            {running.length} running
          </span>
        </div>

        {running.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-canvas px-4 py-4 text-center text-xs text-zinc-400">
            No models currently occupying VRAM/RAM. The selected model loads automatically on your first prompt.
          </div>
        ) : (
          <div className="space-y-2">
            {running.map((m) => {
              const vramRatio =
                m.sizeBytes > 0 ? Math.round((m.sizeVramBytes / m.sizeBytes) * 100) : 0;
              return (
                <div
                  key={m.name}
                  className="card-raised flex flex-wrap items-center justify-between gap-3 p-3"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="dot dot-success" />
                    <div>
                      <div className="flex items-center gap-2 text-xs font-medium text-zinc-200">
                        <span>{m.name}</span>
                        {m.parameterSize && (
                          <span className="badge text-[10px] py-0 px-1.5 h-4">
                            {m.parameterSize}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-[11px] text-zinc-500">
                        Allocated memory: <span className="font-mono text-zinc-300">{formatBytes(m.sizeBytes)}</span>
                        {' · '}
                        VRAM Acceleration: <span className="font-mono text-emerald-400">{vramRatio}% GPU</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={busyModel === m.name}
                    onClick={() => handleUnload(m.name)}
                    className="btn btn-sm"
                  >
                    <PowerOff size={12} />
                    <span>Free from Memory</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. Installed models */}
      <section className="card p-4">
        <div className="mb-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 shrink-0 place-items-center rounded-md border border-line bg-surface-2 text-zinc-300">
              <HardDrive size={16} />
            </div>
            <div>
              <h2 className="section-title">Locally Installed Models</h2>
              <p className="text-xs text-zinc-400">
                Choose which model the Aura companion uses for conversation and tasks.
              </p>
            </div>
          </div>
          <span className="badge">
            {models.length} installed
          </span>
        </div>

        {models.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-canvas px-4 py-6 text-center text-xs text-zinc-400">
            No models downloaded yet. Use the section below to pull your first local AI model.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {models.map((m) => {
              const isSelected =
                activeModel === m.name ||
                (!settings.ai.model && overview?.activeModel === m.name);
              const isRunning = running.some((r) => r.name === m.name);

              return (
                <div
                  key={m.name}
                  className={`card-raised p-3 flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-zinc-600 bg-surface-3'
                      : 'card-interactive'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-medium text-zinc-200">{m.name}</span>
                      {isSelected && (
                        <span className="badge badge-accent">
                          <Check size={10} /> Active
                        </span>
                      )}
                      {isRunning && (
                        <span className="badge badge-success">
                          In VRAM
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-zinc-500">
                      <span>{formatBytes(m.sizeBytes)}</span>
                      {m.parameterSize && <span>· {m.parameterSize}</span>}
                      {m.quantization && <span>· {m.quantization}</span>}
                      {m.family && <span>· {m.family}</span>}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    {!isSelected && (
                      <button
                        type="button"
                        onClick={() => handleSelectModel(m.name)}
                        className="btn btn-sm"
                      >
                        Select
                      </button>
                    )}
                    <button
                      type="button"
                      title="Delete model from disk"
                      disabled={busyModel === m.name}
                      onClick={() => handleDelete(m.name)}
                      className="btn btn-sm btn-icon btn-ghost text-zinc-400 hover:text-red-300"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. Pull models */}
      <section className="card p-4">
        <div className="mb-3.5 flex items-center gap-2.5">
          <div className="grid size-8 shrink-0 place-items-center rounded-md border border-line bg-surface-2 text-zinc-300">
            <Download size={16} />
          </div>
          <div>
            <h2 className="section-title">Download Models from Ollama</h2>
            <p className="text-xs text-zinc-400">
              Enter any model tag from the Ollama library or choose from the recommended catalog below.
            </p>
          </div>
        </div>

        {/* Pull Input */}
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={pullInput}
            onChange={(e) => setPullInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !pullState && startPull()}
            placeholder="e.g. llama3.2:3b, mistral:7b, phi4:latest, qwen2.5-coder:7b…"
            disabled={Boolean(pullState)}
            className="input min-w-[240px] flex-1 text-xs font-mono"
          />
          {pullState ? (
            <button
              type="button"
              onClick={() => aura.ai.abortPull()}
              className="btn btn-sm btn-danger shrink-0"
            >
              <Square size={12} fill="currentColor" />
              <span>Cancel Download</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={!pullInput.trim() || !overview?.online}
              onClick={() => startPull()}
              className="btn btn-sm btn-primary shrink-0"
            >
              <Download size={13} />
              <span>Download Model</span>
            </button>
          )}
        </div>

        {/* Live download progress */}
        {pullState && (
          <div className="card-raised mt-3.5 p-3">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-medium text-zinc-200">
                {pullState.name} — <span className="text-zinc-400">{pullState.status}</span>
              </span>
              {pullPercent != null && (
                <span className="font-mono text-zinc-300">
                  {formatBytes(pullState.completed)} / {formatBytes(pullState.total)} ({pullPercent}%)
                </span>
              )}
            </div>
            {pullState.error ? (
              <div className="text-xs text-red-300">{pullState.error}</div>
            ) : (
              <MeterBar percent={pullPercent ?? 15} />
            )}
          </div>
        )}

        {/* Recommended Models */}
        <div className="mt-4">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-zinc-300">
            <Sparkles size={13} className="text-zinc-400" />
            <span>Recommended Models for Local Execution</span>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {RECOMMENDED_MODELS.map((rec) => {
              const installed = models.some(
                (m) => m.name === rec.name || m.name.startsWith(`${rec.name.split(':')[0]}:`),
              );
              return (
                <div
                  key={rec.name}
                  className="card-raised flex items-center justify-between gap-3 p-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-zinc-200">{rec.label}</span>
                      <span className="badge font-mono text-[10px] py-0 px-1.5 h-4">
                        {rec.size}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500">{rec.desc}</p>
                  </div>

                  {installed ? (
                    <span className="badge badge-success shrink-0">
                      <Check size={11} />
                      <span>Installed</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={Boolean(pullState) || !overview?.online}
                      onClick={() => startPull(rec.name)}
                      className="btn btn-sm shrink-0"
                    >
                      <Zap size={12} />
                      <span>Install</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
