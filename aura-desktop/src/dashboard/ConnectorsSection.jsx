import { useEffect, useState } from 'react';
import {
  BookOpen,
  Brain,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Cloud,
  Cpu,
  ExternalLink,
  Eye,
  EyeOff,
  GitBranch,
  HardDrive,
  KeyRound,
  Loader2,
  Mail,
  PlugZap,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Unplug,
  Zap,
} from 'lucide-react';
import { AI_PROVIDERS } from '../../shared/settings.js';
import { aura } from '../lib/bridge.js';

const CLOUD_PROVIDER_META = {
  openai: {
    id: 'openai',
    name: 'OpenAI (ChatGPT)',
    badge: 'GPT-4o / o3-mini · Vision AI',
    keyField: 'openaiKey',
    modelField: 'openaiModel',
    placeholder: 'sk-proj-...',
    portalUrl: 'https://platform.openai.com/api-keys',
    portalLabel: 'Get OpenAI Key',
    accent: '',
    description:
      'Connect your OpenAI account to run ChatGPT models and Vision AI screen analysis (/screen), with zero RAM/GPU consumption on your PC.',
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    badge: 'Claude Sonnet 4 · Vision & Code',
    keyField: 'anthropicKey',
    modelField: 'anthropicModel',
    placeholder: 'sk-ant-api03-...',
    portalUrl: 'https://console.anthropic.com/settings/keys',
    portalLabel: 'Get Anthropic Key',
    accent: '',
    description:
      'Exceptional for technical writing, coding, GitHub code reviews, and deep analysis of Notion or Google Drive documents.',
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    badge: 'Gemini 2.5 Flash / Pro · 1M Context',
    keyField: 'geminiKey',
    modelField: 'geminiModel',
    placeholder: 'AIzaSy...',
    portalUrl: 'https://aistudio.google.com/app/apikey',
    portalLabel: 'Get Google AI Studio Key (Free)',
    accent: '',
    description:
      'Ultra-fast Gemini models for Vision AI (/screen), Desktop Control (/control), and high-context multi-modal reasoning.',
  },
};

const WORKSPACE_SERVICES = [
  {
    id: 'gmail',
    title: 'Google Gmail',
    command: '/gmail',
    icon: Mail,
    iconBg: 'bg-surface-2 text-zinc-300 border border-line',
    identityField: 'email',
    identityLabel: 'Google Account Email',
    scopeHint: 'gmail.readonly',
    desc: 'Read, search, and summarize recent emails or draft replies with a single click.',
  },
  {
    id: 'gdrive',
    title: 'Google Drive',
    command: '/drive',
    icon: HardDrive,
    iconBg: 'bg-surface-2 text-zinc-300 border border-line',
    identityField: 'email',
    identityLabel: 'Google Account Email',
    scopeHint: 'drive.readonly',
    desc: 'Instantly search and summarize Google Docs, Slides presentations, and Sheets spreadsheets.',
  },
  {
    id: 'gcalendar',
    title: 'Google Calendar',
    command: '/calendar',
    icon: Calendar,
    iconBg: 'bg-surface-2 text-zinc-300 border border-line',
    identityField: 'email',
    identityLabel: 'Google Account Email',
    scopeHint: 'calendar.readonly',
    desc: 'View your daily schedule, upcoming events, and automatically generate pre-meeting briefings.',
  },
  {
    id: 'notion',
    title: 'Notion Workspace',
    command: '/notion',
    icon: BookOpen,
    iconBg: 'bg-surface-2 text-zinc-300 border border-line',
    identityField: 'workspace',
    identityLabel: 'Notion Workspace Name',
    scopeHint: 'secret_... (Notion Internal Integration Token)',
    desc: 'Search team notes, project roadmaps, and documentation in Notion directly from the widget.',
  },
  {
    id: 'github',
    title: 'GitHub',
    command: '/github',
    icon: GitBranch,
    iconBg: 'bg-surface-2 text-zinc-300 border border-line',
    identityField: 'username',
    identityLabel: 'GitHub Username / Organization',
    scopeHint: 'ghp_... (Personal Access Token)',
    desc: 'Check Pull Requests, review active issues, and request rapid AI code analysis.',
  },
];

export default function ConnectorsSection({ settings, onUpdateSettings }) {
  const ai = settings.ai || {};
  const connectors = settings.connectors || {};
  const memory = settings.memory || { enabled: true, autoSaveChats: true, facts: [] };

  const [showKeys, setShowKeys] = useState({});
  const [testingProvider, setTestingProvider] = useState(null);
  const [testResults, setTestResults] = useState({});

  // Modal connect OAuth / Token
  const [oauthModal, setOauthModal] = useState(null);
  const [oauthIdentity, setOauthIdentity] = useState('');
  const [oauthToken, setOauthToken] = useState('');
  const [busyService, setBusyService] = useState(null);

  // Long-term memory
  const [newFact, setNewFact] = useState('');
  const [savedChats, setSavedChats] = useState([]);

  const refreshSavedChats = async () => {
    try {
      const list = await aura.chats.list();
      if (Array.isArray(list)) setSavedChats(list);
    } catch {}
  };

  useEffect(() => {
    refreshSavedChats();
  }, []);

  const handleTestProvider = async (providerId) => {
    setTestingProvider(providerId);
    setTestResults((prev) => ({ ...prev, [providerId]: null }));
    try {
      const res = await aura.ai.testProvider(providerId);
      setTestResults((prev) => ({
        ...prev,
        [providerId]: { ok: true, message: `Successfully connected to ${res.model}!` },
      }));
    } catch (err) {
      setTestResults((prev) => ({
        ...prev,
        [providerId]: { ok: false, message: err.message || 'Connection error.' },
      }));
    } finally {
      setTestingProvider(null);
    }
  };

  const handleQuickConnect = async (srv) => {
    setBusyService(srv.id);
    try {
      const defaultIdentity =
        srv.id === 'notion'
          ? 'Aura HQ Workspace'
          : srv.id === 'github'
            ? 'aura-user'
            : settings.account?.email || 'user@example.com';
      await aura.connectors.connect({
        service: srv.id,
        mode: 'demo',
        [srv.identityField]: defaultIdentity,
      });
    } finally {
      setBusyService(null);
    }
  };

  const handleOauthSubmit = async (e) => {
    e.preventDefault();
    if (!oauthModal) return;
    setBusyService(oauthModal.id);
    try {
      await aura.connectors.connect({
        service: oauthModal.id,
        mode: oauthToken.trim() ? 'oauth' : 'demo',
        [oauthModal.identityField]: oauthIdentity.trim(),
        accessToken: oauthToken.trim(),
      });
      setOauthModal(null);
      setOauthToken('');
    } finally {
      setBusyService(null);
    }
  };

  const handleDisconnect = async (serviceId) => {
    setBusyService(serviceId);
    try {
      await aura.connectors.disconnect(serviceId);
    } finally {
      setBusyService(null);
    }
  };

  const handleAddFact = (e) => {
    e.preventDefault();
    const trimmed = newFact.trim();
    if (!trimmed) return;
    const currentFacts = Array.isArray(memory.facts) ? memory.facts : [];
    if (!currentFacts.includes(trimmed)) {
      onUpdateSettings({ memory: { facts: [trimmed, ...currentFacts] } });
    }
    setNewFact('');
  };

  const handleRemoveFact = (factToRemove) => {
    const currentFacts = Array.isArray(memory.facts) ? memory.facts : [];
    onUpdateSettings({
      memory: { facts: currentFacts.filter((f) => f !== factToRemove) },
    });
  };

  const handleClearSavedChats = async () => {
    const next = await aura.chats.clear();
    setSavedChats(Array.isArray(next) ? next : []);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-10">
      {/* Header */}
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight text-zinc-50">
            Connectors, Vision AI, Memory &amp; Cloud
          </h1>
          <p className="mt-1 text-[13px] text-zinc-500">
            Connect Cloud AI accounts (ChatGPT, Claude, Gemini), productivity tools (Gmail, Drive, Calendar, Notion, GitHub), and manage assistant memory.
          </p>
        </div>
        <div className="badge badge-accent shrink-0 text-xs">
          <Zap size={13} className="shrink-0 text-aura-400" />
          <span>
            Active engine:{' '}
            <strong className="text-zinc-200">
              {AI_PROVIDERS.find((p) => p.id === ai.provider)?.label || 'Ollama Local'}
            </strong>
          </span>
        </div>
      </header>

      {/* 1. Intelligent Desktop Tools: Vision AI & Smart Clipboard */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-line bg-surface-2 text-zinc-300">
              <Camera size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-[13px] font-semibold text-zinc-100">
                  Screen Capture &amp; Vision AI
                </h3>
                <span className="badge badge-success text-[10px]">
                  Active in Companion
                </span>
              </div>
              <p className="mt-0.5 text-xs text-zinc-500">
                Quick command: <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[11px] text-zinc-300">/screen</code> or the 📷 icon in the companion header
              </p>
            </div>
          </div>
          <p className="mt-2.5 text-xs text-zinc-400 leading-relaxed">
            Aura captures your screen instantly and sends the image to the active Vision model (GPT-4o, Claude Sonnet 4, Gemini 2.5 Flash, or local model) to diagnose errors, extract text, or summarize visible content.
          </p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-line bg-surface-2 text-zinc-300">
              <ClipboardCheck size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-[13px] font-semibold text-zinc-100">
                  Smart Clipboard Assistant
                </h3>
                <span className="badge badge-success text-[10px]">
                  Active in Companion
                </span>
              </div>
              <p className="mt-0.5 text-xs text-zinc-500">
                Quick command: <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[11px] text-zinc-300">/clipboard</code> in companion after any <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[11px] text-zinc-300">Ctrl+C</code>
              </p>
            </div>
          </div>
          <p className="mt-2.5 text-xs text-zinc-400 leading-relaxed">
            Instantly grabs any copied text or code and offers 1-click actions: <strong>Professional Rewrite</strong>, <strong>Translate EN</strong>, <strong>Fix Grammar</strong>, or <strong>Explain Code</strong>.
          </p>
        </div>
      </section>

      {/* 2. Active AI Engine Selector + Auto-Fallback */}
      <section className="card p-4 space-y-3">
        <div>
          <h2 className="flex items-center gap-2 text-[13px] font-semibold text-zinc-100">
            <Sparkles size={14} className="text-aura-400" />
            Active AI Engine (Local vs. Cloud for lightweight PCs)
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            If your PC has limited hardware resources, choose a Cloud provider for instant responses with zero local hardware load.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {AI_PROVIDERS.map((p) => {
            const selected = (ai.provider || 'ollama') === p.id;
            const hasKey =
              p.id === 'ollama'
                ? true
                : p.id === 'openai'
                  ? Boolean(ai.openaiKey?.trim())
                  : p.id === 'anthropic'
                    ? Boolean(ai.anthropicKey?.trim())
                    : Boolean(ai.geminiKey?.trim());

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onUpdateSettings({ ai: { provider: p.id } })}
                className={`flex flex-col justify-between rounded-[8px] border p-3 text-left transition-colors duration-100 ${
                  selected
                    ? 'border-zinc-700 bg-surface-2 text-zinc-100'
                    : 'border-line bg-surface hover:border-zinc-700 hover:bg-surface-2 text-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-200">
                    {p.badge === 'Local' ? (
                      <Cpu size={13} className="text-emerald-400" />
                    ) : (
                      <Cloud size={13} className="text-zinc-400" />
                    )}
                    {p.shortLabel}
                  </span>
                  <span
                    className={`badge text-[10px] ${
                      p.badge === 'Local'
                        ? 'badge-success'
                        : hasKey
                          ? 'badge-accent'
                          : 'bg-surface-3 text-zinc-500 border-zinc-800'
                    }`}
                  >
                    {p.badge === 'Local' ? 'Local' : hasKey ? 'Key Active' : 'Not Configured'}
                  </span>
                </div>
                <div className="mt-2 text-[11.5px] text-zinc-500 leading-snug">{p.description || p.desc}</div>
              </button>
            );
          })}
        </div>

        {/* Toggle Auto-Fallback */}
        <div className="flex items-center justify-between gap-4 rounded-md border border-line bg-canvas p-3">
          <div className="min-w-0">
            <div className="text-xs font-medium text-zinc-200">
              Auto-switch to Cloud if Ollama is not running (Recommended for low-spec PCs)
            </div>
            <div className="mt-0.5 text-[11px] text-zinc-500">
              When enabled, if the local Ollama instance is stopped or unreachable, Aura automatically switches to your configured Cloud API key (Gemini, ChatGPT, or Claude).
            </div>
          </div>
          <input
            type="checkbox"
            checked={Boolean(ai.autoFallbackToCloud)}
            onChange={(e) => onUpdateSettings({ ai: { autoFallbackToCloud: e.target.checked } })}
            className="size-4 shrink-0 rounded border-line bg-surface-2 accent-emerald-500 cursor-pointer"
          />
        </div>
      </section>

      {/* 3. Productivity Connectors */}
      <section className="space-y-3">
        <div>
          <h2 className="flex items-center gap-2 text-[13px] font-semibold text-zinc-100">
            <Cloud size={14} className="text-aura-400" />
            Google Workspace, Notion &amp; GitHub Connectors
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Connect your productivity suites with 1 click (or with your own OAuth2/API token) and query them directly in companion chat.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {WORKSPACE_SERVICES.map((srv) => {
            const Icon = srv.icon;
            const cfg = connectors[srv.id] || {};
            const isConnected = Boolean(cfg.connected);
            const identityVal = cfg[srv.identityField] || '';

            return (
              <div
                key={srv.id}
                className="card p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`flex size-8 shrink-0 items-center justify-center rounded-md ${srv.iconBg}`}>
                        <Icon size={16} />
                      </div>
                      <div>
                        <h3 className="text-[13px] font-semibold text-zinc-100">{srv.title}</h3>
                        <span className="font-mono text-[10.5px] text-zinc-400">
                          Command: {srv.command}
                        </span>
                      </div>
                    </div>
                    {isConnected ? (
                      <span className="badge badge-success text-[10px]">
                        <CheckCircle2 size={10} /> Connected
                      </span>
                    ) : (
                      <span className="badge text-[10px]">
                        Disconnected
                      </span>
                    )}
                  </div>

                  <p className="mt-2.5 text-xs text-zinc-400 leading-relaxed">{srv.desc}</p>

                  {isConnected && (
                    <div className="mt-3 rounded-md border border-line bg-canvas px-3 py-2 text-[11px] text-zinc-300">
                      <div className="truncate font-medium text-zinc-200">{identityVal}</div>
                      <div className="text-[10px] text-zinc-500">
                        Mode: {cfg.mode === 'oauth' ? 'Live API / OAuth' : 'Demo Sandbox'} · Synced {cfg.lastSync || 'just now'}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
                  {isConnected ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setOauthIdentity(identityVal);
                          setOauthToken(cfg.accessToken || '');
                          setOauthModal(srv);
                        }}
                        className="btn btn-sm"
                      >
                        API Token
                      </button>
                      <button
                        type="button"
                        disabled={busyService === srv.id}
                        onClick={() => handleDisconnect(srv.id)}
                        className="btn btn-sm btn-danger"
                      >
                        <Unplug size={11} /> Disconnect
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={busyService === srv.id}
                        onClick={() => handleQuickConnect(srv)}
                        className="btn btn-sm btn-primary"
                      >
                        <PlugZap size={11} /> 1-Click Connect
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOauthIdentity(
                            srv.id === 'notion'
                              ? 'Aura HQ Workspace'
                              : srv.id === 'github'
                                ? 'aura-user'
                                : settings.account?.email || 'user@example.com',
                          );
                          setOauthToken('');
                          setOauthModal(srv);
                        }}
                        className="btn btn-sm"
                      >
                        OAuth / API Token
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Long-Term Memory & Conversation History */}
      <section className="card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-line bg-surface-2 text-zinc-300">
              <Brain size={16} />
            </div>
            <div>
              <h2 className="text-[13px] font-semibold text-zinc-100">
                Long-Term Memory &amp; Chat History
              </h2>
              <p className="text-xs text-zinc-500">
                Aura recalls these preferences and context across every session (add from companion with <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[11px] text-zinc-300">/memory &lt;fact&gt;</code>).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={memory.enabled !== false}
                onChange={(e) =>
                  onUpdateSettings({ memory: { enabled: e.target.checked } })
                }
                className="size-4 shrink-0 rounded border-line bg-surface-2 accent-emerald-500 cursor-pointer"
              />
              Memory Active
            </label>
            <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={memory.autoSaveChats !== false}
                onChange={(e) =>
                  onUpdateSettings({ memory: { autoSaveChats: e.target.checked } })
                }
                className="size-4 shrink-0 rounded border-line bg-surface-2 accent-emerald-500 cursor-pointer"
              />
              Save Chats to Disk ({savedChats.length} saved)
            </label>
            {savedChats.length > 0 && (
              <button
                type="button"
                onClick={handleClearSavedChats}
                className="btn btn-sm btn-danger"
              >
                <Trash2 size={11} /> Clear History
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleAddFact} className="flex gap-2">
          <input
            type="text"
            value={newFact}
            onChange={(e) => setNewFact(e.target.value)}
            placeholder="Add a fact to long-term memory (e.g. I work with React and Python, prefer concise code)..."
            className="input text-xs"
          />
          <button
            type="submit"
            className="btn btn-primary btn-sm shrink-0"
          >
            <Plus size={13} /> Add Fact
          </button>
        </form>

        <div className="flex flex-wrap gap-1.5">
          {(memory.facts || []).map((fact) => (
            <div
              key={fact}
              className="inline-flex items-center gap-2 rounded-md border border-line bg-surface-2 px-2.5 py-1 text-xs text-zinc-200"
            >
              <span>🧠 {fact}</span>
              <button
                type="button"
                onClick={() => handleRemoveFact(fact)}
                className="text-zinc-500 hover:text-red-400"
                title="Remove from memory"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Cloud AI Provider Keys */}
      <section className="space-y-3">
        <div>
          <h2 className="flex items-center gap-2 text-[13px] font-semibold text-zinc-100">
            <KeyRound size={14} className="text-aura-400" />
            Cloud AI Provider Keys (ChatGPT, Claude, Gemini)
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Your API keys are stored strictly locally on your PC and communicate directly over encrypted HTTPS.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {Object.values(CLOUD_PROVIDER_META).map((meta) => {
            const providerSpec = AI_PROVIDERS.find((p) => p.id === meta.id);
            const currentKey = ai[meta.keyField] || '';
            const firstModelId =
              typeof providerSpec?.models?.[0] === 'string'
                ? providerSpec.models[0]
                : providerSpec?.models?.[0]?.id || '';
            const currentModel = ai[meta.modelField] || firstModelId;
            const isActiveProvider = ai.provider === meta.id;
            const isRevealed = Boolean(showKeys[meta.id]);
            const testResult = testResults[meta.id];

            return (
              <div
                key={meta.id}
                className="card p-4 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-[13px] font-semibold text-zinc-100">{meta.name}</h3>
                      <span className="badge text-[10px]">
                        {meta.badge}
                      </span>
                      {isActiveProvider && (
                        <span className="badge badge-accent text-[10px]">
                          <Check size={10} /> Active in Companion
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-zinc-400 leading-relaxed">{meta.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => aura.connectors.openExternal(meta.portalUrl)}
                      className="btn btn-sm"
                    >
                      <ExternalLink size={12} /> {meta.portalLabel}
                    </button>
                    {!isActiveProvider && currentKey.trim() && (
                      <button
                        type="button"
                        onClick={() => onUpdateSettings({ ai: { provider: meta.id } })}
                        className="btn btn-primary btn-sm"
                      >
                        Set as Active
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {/* API Key Input */}
                  <div className="sm:col-span-2">
                    <label className="field-label">
                      API Key ({meta.name})
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={isRevealed ? 'text' : 'password'}
                        value={currentKey}
                        onChange={(e) =>
                          onUpdateSettings({ ai: { [meta.keyField]: e.target.value } })
                        }
                        placeholder={meta.placeholder}
                        className="input pr-9 font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowKeys((prev) => ({ ...prev, [meta.id]: !prev[meta.id] }))
                        }
                        className="absolute right-2.5 text-zinc-500 hover:text-zinc-200"
                        title={isRevealed ? 'Hide key' : 'Show key'}
                      >
                        {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  </div>

                  {/* Model Selector */}
                  <div>
                    <label className="field-label">
                      Preferred Model
                    </label>
                    <select
                      value={currentModel}
                      onChange={(e) =>
                        onUpdateSettings({ ai: { [meta.modelField]: e.target.value } })
                      }
                      className="input text-xs"
                    >
                      {providerSpec?.models?.map((m) => {
                        const id = typeof m === 'string' ? m : m.id;
                        const label = typeof m === 'string' ? m : m.label;
                        return (
                          <option key={id} value={id}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2.5">
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      disabled={!currentKey.trim() || testingProvider === meta.id}
                      onClick={() => handleTestProvider(meta.id)}
                      className="btn btn-sm"
                    >
                      {testingProvider === meta.id ? (
                        <>
                          <Loader2 size={12} className="animate-spin" /> Testing…
                        </>
                      ) : (
                        <>
                          <PlugZap size={12} /> Test Connection
                        </>
                      )}
                    </button>

                    {currentKey.trim() && (
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateSettings({ ai: { [meta.keyField]: '' } });
                          setTestResults((prev) => ({ ...prev, [meta.id]: null }));
                        }}
                        className="text-[11px] text-zinc-500 hover:text-red-400"
                      >
                        Clear Key
                      </button>
                    )}
                  </div>

                  {testResult && (
                    <div
                      className={`text-xs font-medium ${
                        testResult.ok ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {testResult.ok ? '✓ ' : '⚠ '}
                      {testResult.message}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Modal connect OAuth2 / Token */}
      {oauthModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <form
            onSubmit={handleOauthSubmit}
            className="card w-full max-w-md border-line-strong p-5 space-y-4"
          >
            <div>
              <h3 className="text-[14px] font-semibold text-zinc-100">
                Connect {oauthModal.title}
              </h3>
              <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
                Enter an API or OAuth2 token ({oauthModal.scopeHint}) for live requests, or leave the field blank to run in Sandbox Demo mode.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="field-label">
                  {oauthModal.identityLabel}
                </label>
                <input
                  type="text"
                  required
                  value={oauthIdentity}
                  onChange={(e) => setOauthIdentity(e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div>
                <label className="field-label">
                  Access Token / API Token (optional — leave empty for Demo)
                </label>
                <input
                  type="password"
                  value={oauthToken}
                  onChange={(e) => setOauthToken(e.target.value)}
                  placeholder={oauthModal.scopeHint}
                  className="input font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setOauthModal(null)}
                className="btn btn-ghost btn-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
              >
                Save &amp; Connect
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
