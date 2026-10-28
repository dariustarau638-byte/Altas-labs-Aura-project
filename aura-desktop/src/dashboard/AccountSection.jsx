import { useEffect, useState } from 'react';
import {
  Check,
  Crown,
  LogOut,
  Mail,
  MessageSquare,
  MousePointerClick,
  Palette,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  User,
  UserCircle2,
  Volume2,
  Wand2,
} from 'lucide-react';
import {
  LANGUAGES,
  MASTER_LICENSE_KEY,
  PERSONALITIES,
  RESPONSE_LENGTHS,
  THEMES,
  displayName,
  getPersonality,
  getPlan,
  getTheme,
} from '../../shared/settings.js';
import { aura } from '../lib/bridge.js';
import Orb from '../widget/components/Orb.jsx';

const AUTH_PROVIDERS = [
  { id: 'google', label: 'Google', domain: 'gmail.com' },
  { id: 'icloud', label: 'iCloud', domain: 'icloud.com' },
  { id: 'yahoo', label: 'Yahoo', domain: 'yahoo.com' },
  { id: 'email', label: 'Standard Email', domain: 'aura-ai.com' },
];

export default function AccountSection({ settings, onUpdateSettings, onGoToBilling }) {
  const { account, assistant, appearance, behavior, voice, memory } = settings;
  const activePlan = getPlan(account?.plan);
  const activeTheme = getTheme(appearance?.theme);
  const activePersonality = getPersonality(assistant?.personality);
  const isMaster = Boolean(account?.isMasterKey || account?.licenseKey === MASTER_LICENSE_KEY);

  const [savedNotice, setSavedNotice] = useState('');
  const [copilotActive, setCopilotActive] = useState(false);

  useEffect(() => {
    aura.copilot
      ?.status()
      .then((s) => {
        if (s) setCopilotActive(Boolean(s.active));
      })
      .catch(() => {});
    const off = aura.copilot?.onStatus((s) => {
      if (s) setCopilotActive(Boolean(s.active));
    });
    return () => off?.();
  }, []);

  const flashSaved = (msg = 'Account changes saved automatically!') => {
    setSavedNotice(msg);
    setTimeout(() => setSavedNotice(''), 2500);
  };

  const handleNicknameChange = (val) => {
    const existingFacts = Array.isArray(memory?.facts) ? memory.facts : [];
    const clean = val.trim();
    const updatedFacts = clean
      ? [
          `User prefers to be addressed as "${clean}"`,
          ...existingFacts.filter((f) => !f.startsWith('User prefers to be addressed as')),
        ]
      : existingFacts;

    onUpdateSettings({
      account: { userNickname: val },
      memory: { facts: updatedFacts },
    });
  };

  const handleToggleCursorAura = async () => {
    try {
      const res = await aura.copilot.toggle();
      if (res) setCopilotActive(Boolean(res.active));
    } catch {}
  };

  const initials = (account?.userNickname || account?.name || 'AU')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const greetingName = account?.userNickname?.trim() || account?.name?.trim() || 'Friend';
  const assistantDisplayName = displayName(settings);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* Account Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight text-zinc-50">
            Account — Your Profile &amp; Aura Identity
          </h1>
          <p className="mt-1 text-[13px] text-zinc-500">
            Configure your preferred name, companion personality, voice dictation, and visual appearance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              onUpdateSettings({
                account: { onboardingCompleted: false },
              })
            }
            className="btn btn-sm"
          >
            <RefreshCw size={12} className="text-zinc-400" />
            Restart Onboarding Wizard
          </button>
          <button
            type="button"
            onClick={() =>
              onUpdateSettings({
                account: { authenticated: false, onboardingCompleted: false },
              })
            }
            className="btn btn-sm btn-danger"
          >
            <LogOut size={12} />
            Switch Account / Sign Out
          </button>
        </div>
      </header>

      {savedNotice && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-500/25 bg-emerald-500/[0.08] px-3.5 py-2 text-xs text-emerald-300">
          <Check size={13} />
          <span>{savedNotice}</span>
        </div>
      )}

      {/* Account Summary + Live Preview */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        {/* User Profile Card */}
        <section className="card p-4 sm:p-5 lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-md border border-line bg-surface-2 font-mono text-sm font-semibold text-zinc-100">
                {initials || 'AU'}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-[13px] font-semibold text-zinc-100">
                    {account?.name || 'Aura User'}
                  </h2>
                  <span className="badge text-[10px] font-mono">
                    {(account?.authProvider || 'email').toUpperCase()}
                  </span>
                </div>
                <p className="meta mt-0.5 truncate text-[11.5px]">
                  {account?.email || 'No email configured'} · Active Nickname:{' '}
                  <strong className="font-medium text-zinc-200">"{greetingName}"</strong>
                </p>
              </div>
            </div>

            {onGoToBilling && (
              <button
                type="button"
                onClick={onGoToBilling}
                className="badge badge-accent hover:border-aura-400 transition-colors"
              >
                <Crown size={11} />
                <span>{isMaster ? 'Founder Master' : activePlan.name}</span>
              </button>
            )}
          </div>

          <div className="space-y-3 pt-1">
            <label className="block">
              <div className="mb-1 flex items-center justify-between">
                <span className="field-label mb-0">
                  What should {assistantDisplayName} call you? (Preferred Nickname)
                </span>
                <span className="meta text-[11px]">Used in conversations and greetings</span>
              </div>
              <input
                type="text"
                value={account?.userNickname || ''}
                onChange={(e) => handleNicknameChange(e.target.value)}
                placeholder="e.g. Alex, Sam, Captain, Boss, Founder..."
                className="input"
              />
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="meta text-[11px]">Quick presets:</span>
                {['Alex', 'Sam', 'Founder', 'Boss', 'Captain', 'Partner'].map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => {
                      handleNicknameChange(sug);
                      flashSaved(`Aura will now address you as "${sug}"!`);
                    }}
                    className={`h-6 rounded-md border px-2 text-[11.5px] transition-colors ${
                      account?.userNickname === sug
                        ? 'border-aura-500/50 bg-aura-500/10 font-medium text-aura-300'
                        : 'border-line bg-surface-2 text-zinc-400 hover:border-line-strong hover:text-zinc-200'
                    }`}
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="field-label">Full Name / Organization</span>
                <div className="relative">
                  <User
                    size={14}
                    className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-zinc-500"
                  />
                  <input
                    type="text"
                    value={account?.name || ''}
                    onChange={(e) => onUpdateSettings({ account: { name: e.target.value } })}
                    placeholder="Your legal or display name"
                    className="input pl-8"
                  />
                </div>
              </label>

              <label className="block">
                <span className="field-label">Email Address</span>
                <div className="relative">
                  <Mail
                    size={14}
                    className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-zinc-500"
                  />
                  <input
                    type="email"
                    value={account?.email || ''}
                    onChange={(e) => onUpdateSettings({ account: { email: e.target.value } })}
                    placeholder="name@company.com"
                    className="input pl-8"
                  />
                </div>
              </label>
            </div>
          </div>

          {/* Account Authentication Provider */}
          <div className="border-t border-line pt-3">
            <span className="field-label mb-2">
              Account Authentication Provider:
            </span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {AUTH_PROVIDERS.map((prov) => {
                const isSelected = (account?.authProvider || 'email') === prov.id;
                return (
                  <button
                    key={prov.id}
                    type="button"
                    onClick={() => {
                      onUpdateSettings({ account: { authProvider: prov.id } });
                      flashSaved(`Account provider set to ${prov.label}.`);
                    }}
                    className={`h-8 rounded-md border text-xs font-medium transition-colors ${
                      isSelected
                        ? 'border-line-strong bg-surface-3 text-zinc-100'
                        : 'border-line bg-surface-2 text-zinc-400 hover:border-line-strong hover:text-zinc-200'
                    }`}
                  >
                    {prov.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Live Preview Card */}
        <section className="card flex flex-col justify-between p-4 sm:p-5 lg:col-span-5 space-y-4">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Orb size={28} online />
                <div>
                  <h2 className="section-title">
                    Live Preview — {assistantDisplayName}
                  </h2>
                  <p className="meta mt-0.5 text-[11px]">
                    Theme {activeTheme.label} · Style {activePersonality.label}
                  </p>
                </div>
              </div>
              <span className="badge badge-success text-[10px]">
                Active
              </span>
            </div>

            {/* Simulated Dialog */}
            <div className="card-raised p-3.5">
              <div className="mb-1 text-[11.5px] font-medium text-aura-300">
                {assistantDisplayName} ({activePersonality.emoji} {activePersonality.label}):
              </div>
              <p className="text-[12.5px] leading-relaxed text-zinc-200">
                "Hello, <strong className="font-medium text-zinc-100">{greetingName}</strong>! I am{' '}
                <strong className="font-medium text-zinc-100">{assistantDisplayName}</strong>. {activePersonality.sample}"
              </p>
            </div>
          </div>

          {/* Quick Toggle: Cursor Co-Pilot */}
          <div className="card-raised p-3 mt-auto">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="grid size-8 shrink-0 place-items-center rounded-md border border-line bg-surface text-aura-400">
                  <MousePointerClick size={15} />
                </div>
                <div>
                  <div className="text-[12.5px] font-medium text-zinc-200">
                    Cursor Co-Pilot (Ctrl+Shift+A)
                  </div>
                  <div className="meta text-[11px]">
                    Enables real-time cursor assistance and visual screen tracking
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleCursorAura}
                className={copilotActive ? 'btn btn-sm btn-accent shrink-0' : 'btn btn-sm shrink-0'}
              >
                {copilotActive ? 'Co-Pilot: ON' : 'Enable Co-Pilot'}
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Companion Identity & Personality */}
      <section className="card p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="grid size-8 shrink-0 place-items-center rounded-md border border-line bg-surface-2 text-zinc-300">
            <Wand2 size={15} />
          </div>
          <div>
            <h2 className="section-title">
              Assistant Name &amp; Behavior ({assistantDisplayName})
            </h2>
            <p className="meta mt-0.5">
              Customize your companion's name, conversation language, personality, and response depth.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
          <label className="block">
            <span className="field-label">
              AI Assistant Name
            </span>
            <input
              type="text"
              value={assistant?.name || ''}
              onChange={(e) => onUpdateSettings({ assistant: { name: e.target.value } })}
              placeholder="Aura"
              className="input"
            />
            <div className="mt-2 flex flex-wrap gap-1">
              {['Aura', 'Jarvis', 'Nova', 'Iris', 'Atlas'].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onUpdateSettings({ assistant: { name: n } })}
                  className={`h-5 rounded px-1.5 text-[10.5px] font-medium transition-colors ${
                    assistant?.name === n
                      ? 'border border-aura-500/40 bg-aura-500/15 text-aura-300'
                      : 'border border-line bg-surface-2 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </label>

          <label className="block">
            <span className="field-label">
              Conversation Language
            </span>
            <select
              value={assistant?.language || 'en'}
              onChange={(e) => onUpdateSettings({ assistant: { language: e.target.value } })}
              className="input"
            >
              {LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>

          <div>
            <span className="field-label">
              Response Length
            </span>
            <div className="segmented w-full">
              {RESPONSE_LENGTHS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  data-active={assistant?.responseLength === r.id}
                  onClick={() => onUpdateSettings({ assistant: { responseLength: r.id } })}
                  className="flex-1"
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Personality Picker */}
        <div className="pt-1">
          <span className="field-label mb-2">
            Personality &amp; Tone of {assistantDisplayName}
          </span>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {PERSONALITIES.map((p) => {
              const selected = assistant?.personality === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onUpdateSettings({ assistant: { personality: p.id } })}
                  className={`card-raised p-3 text-left transition-colors flex flex-col justify-between ${
                    selected
                      ? 'border-aura-500/50 bg-aura-500/[0.08]'
                      : 'hover:border-line-strong'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-base">{p.emoji}</span>
                      {selected && <Check size={13} className="text-aura-400" />}
                    </div>
                    <div className="mt-2 text-[12.5px] font-medium text-zinc-100">{p.label}</div>
                    <div className="meta text-[11px] mt-0.5">{p.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Instructions */}
        <label className="block pt-1">
          <span className="field-label">
            Custom System Instructions for {assistantDisplayName}
          </span>
          <textarea
            rows={2}
            value={assistant?.customInstructions || ''}
            onChange={(e) => onUpdateSettings({ assistant: { customInstructions: e.target.value } })}
            placeholder="e.g. Always structure answers with concise bullet points and provide code examples..."
            className="input"
          />
        </label>
      </section>

      {/* Visual Appearance & Theme */}
      <section className="card p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="grid size-8 shrink-0 place-items-center rounded-md border border-line bg-surface-2 text-zinc-300">
            <Palette size={15} />
          </div>
          <div>
            <h2 className="section-title">
              Visual Appearance &amp; Accent Themes
            </h2>
            <p className="meta mt-0.5">
              The selected accent theme adjusts the top notch, floating widget glow, active buttons, and cursor highlights.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6 pt-1">
          {THEMES.map((t) => {
            const active = appearance?.theme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onUpdateSettings({ appearance: { theme: t.id } })}
                className={`card-raised p-3 flex flex-col items-center gap-2 text-center transition-colors ${
                  active
                    ? 'border-aura-500/60 bg-aura-500/[0.08] ring-1 ring-aura-400/20'
                    : 'hover:border-line-strong'
                }`}
              >
                <span
                  className="size-6 rounded-full border border-white/20 shrink-0"
                  style={{ background: t.orb[0] }}
                />
                <span className="text-xs font-medium text-zinc-200">{t.label}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
