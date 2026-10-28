import { useState } from 'react';
import {
  Check,
  Code2,
  Eye,
  RotateCcw,
  Sliders,
  Sparkles,
  UserCheck,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  LANGUAGES,
  PERSONALITIES,
  RESPONSE_LENGTHS,
  THEMES,
  displayName,
  getPersonality,
} from '../../shared/settings.js';
import { buildSystemPrompt } from '../../shared/prompt.js';
import { useVoice } from '../lib/useVoice.js';
import Orb from '../widget/components/Orb.jsx';
import PetAvatar from '../widget/components/PetAvatar.jsx';

function SectionCard({ icon: Icon, title, subtitle, children }) {
  return (
    <section className="card p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid size-8 shrink-0 place-items-center rounded-md border border-line bg-surface-2 text-zinc-300">
          <Icon size={15} />
        </div>
        <div>
          <h2 className="section-title">{title}</h2>
          {subtitle && <p className="meta mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

const ANCHOR_LABELS = {
  'left-top': 'Top-Left (expands right-down)',
  'right-top': 'Top-Right (expands left-down)',
  'left-bottom': 'Bottom-Left (expands right-up)',
  'right-bottom': 'Bottom-Right (expands left-up)',
};

export default function PersonalizeSection({ settings, onUpdate, onReset }) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const { appearance, assistant, voice: voiceCfg, behavior, widgetState } = settings;
  const activePersona = getPersonality(assistant.personality);
  const name = displayName(settings);
  const anchorKey = `${widgetState?.anchor?.h ?? 'right'}-${widgetState?.anchor?.v ?? 'bottom'}`;

  const voice = useVoice(voiceCfg, assistant.language);

  const patch = (section, values) => {
    onUpdate({ [section]: values });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* Header bar */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight text-zinc-50">Companion Customization</h1>
          <p className="mt-1 text-[13px] text-zinc-500">
            Changes save automatically and update the desktop companion in real time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`badge badge-success transition-opacity duration-200 ${
              savedFlash ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <Check size={12} /> Auto-saved
          </span>
          <button
            type="button"
            onClick={onReset}
            className="btn btn-sm"
          >
            <RotateCcw size={12} /> Reset to Defaults
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left Column: configuration controls */}
        <div className="space-y-4 lg:col-span-7">
          {/* 1. Theme & Appearance */}
          <SectionCard
            icon={Sparkles}
            title="Visual Theme & Transparency"
            subtitle="Choose the companion accent palette and widget background opacity."
          >
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {THEMES.map((t) => {
                const selected = appearance.theme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => patch('appearance', { theme: t.id })}
                    className={`card-raised flex items-center gap-2.5 p-2.5 text-left transition-colors ${
                      selected
                        ? 'border-aura-500/60 bg-aura-500/[0.08] ring-1 ring-aura-400/20'
                        : 'hover:border-line-strong'
                    }`}
                  >
                    <span
                      className="size-5 shrink-0 rounded-full border border-white/20"
                      style={{ background: t.orb[0] }}
                    />
                    <span className="truncate text-xs font-medium text-zinc-200">{t.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 border-t border-line pt-3">
              <div className="mb-1 flex justify-between text-xs">
                <span className="field-label mb-0">Widget Background Opacity</span>
                <span className="font-mono text-xs tabular-nums text-zinc-300">{Math.round(appearance.opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.6}
                max={1}
                step={0.02}
                value={appearance.opacity}
                onChange={(e) => patch('appearance', { opacity: parseFloat(e.target.value) })}
                className="w-full cursor-pointer accent-aura-500"
              />
              <div className="meta mt-1 flex justify-between text-[11px]">
                <span>60% (Translucent)</span>
                <span>100% (Solid Matte)</span>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            icon={Sparkles}
            title="Companion Form"
            subtitle="Choose how Aura appears when idle. You can switch between Orb and Pet anytime."
          >
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'orb', label: 'Original Orb', avatar: <Orb size={26} /> },
                { id: 'pet', label: 'Aura Pet', avatar: <PetAvatar size={30} /> },
              ].map((choice) => {
                const selected = (widgetState?.companionStyle || 'orb') === choice.id;
                return (
                  <button
                    key={choice.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => patch('widgetState', { companionStyle: choice.id })}
                    className={`card-raised flex items-center gap-3 p-3 text-left transition-colors ${
                      selected
                        ? 'border-aura-500/60 bg-aura-500/[0.08] ring-1 ring-aura-400/20 text-zinc-100'
                        : 'hover:border-line-strong text-zinc-300'
                    }`}
                  >
                    {choice.avatar}
                    <span className="text-[13px] font-medium">{choice.label}</span>
                  </button>
                );
              })}
            </div>
          </SectionCard>

          {/* 2. Identity & Personality */}
          <SectionCard
            icon={UserCheck}
            title="Identity & Personality"
            subtitle="Configure name, tone, and system instructions provided to AI models."
          >
            <div className="space-y-4">
              {/* Name + Language */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="field-label">Assistant Name</span>
                  <input
                    type="text"
                    maxLength={24}
                    value={assistant.name}
                    onChange={(e) => patch('assistant', { name: e.target.value })}
                    placeholder="Aura"
                    className="input"
                  />
                </label>

                <label className="block">
                  <span className="field-label">Response Language</span>
                  <select
                    value={assistant.language}
                    onChange={(e) => patch('assistant', { language: e.target.value })}
                    className="input"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Personality presets */}
              <div>
                <span className="field-label mb-2">Tone &amp; Personality</span>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {PERSONALITIES.map((p) => {
                    const selected = assistant.personality === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => patch('assistant', { personality: p.id })}
                        className={`card-raised flex items-start gap-2.5 p-3 text-left transition-colors ${
                          selected
                            ? 'border-aura-500/60 bg-aura-500/[0.08]'
                            : 'hover:border-line-strong'
                        }`}
                      >
                        <span className="text-base leading-none">{p.emoji}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-zinc-100">{p.label}</div>
                          <div className="meta mt-0.5 text-[11px]">{p.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Response Length + Creativity */}
              <div className="grid grid-cols-1 gap-3.5 pt-1 sm:grid-cols-2">
                <div>
                  <span className="field-label">Response Length</span>
                  <div className="segmented w-full">
                    {RESPONSE_LENGTHS.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        data-active={assistant.responseLength === r.id}
                        onClick={() => patch('assistant', { responseLength: r.id })}
                        className="flex-1"
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="field-label mb-0">Creativity (Temperature)</span>
                    <span className="font-mono text-xs tabular-nums text-zinc-300">{assistant.creativity.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1.4}
                    step={0.05}
                    value={assistant.creativity}
                    onChange={(e) => patch('assistant', { creativity: parseFloat(e.target.value) })}
                    className="mt-1 w-full cursor-pointer accent-aura-500"
                  />
                  <div className="meta mt-1 flex justify-between text-[11px]">
                    <span>Precise (0.0)</span>
                    <span>Creative (1.4)</span>
                  </div>
                </div>
              </div>

              {/* Custom Instructions */}
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="field-label mb-0">Custom System Instructions (Optional)</span>
                  <span className="meta text-[11px] tabular-nums">
                    {assistant.customInstructions.length} / 2000
                  </span>
                </div>
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={assistant.customInstructions}
                  onChange={(e) => patch('assistant', { customInstructions: e.target.value })}
                  placeholder="e.g. I work as a software engineer. Provide code examples in TypeScript and avoid lengthy preambles."
                  className="input scroll-thin resize-none"
                />
              </div>
            </div>
          </SectionCard>

          {/* 3. Voice & Speech Synthesis */}
          <SectionCard
            icon={Volume2}
            title="Voice & Text-to-Speech (TTS)"
            subtitle="Configure local speech synthesis and automatic voice reading."
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <label className="card-raised flex cursor-pointer items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-zinc-200">Enable Voice (TTS)</div>
                    <div className="meta text-[11px]">Adds "Listen" button to messages</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={voiceCfg.enabled}
                    onChange={(e) => patch('voice', { enabled: e.target.checked })}
                    className="size-4 rounded border-line accent-aura-500"
                  />
                </label>

                <label className="card-raised flex cursor-pointer items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-zinc-200">Auto-Speak Responses</div>
                    <div className="meta text-[11px]">Reads out each assistant answer automatically</div>
                  </div>
                  <input
                    type="checkbox"
                    disabled={!voiceCfg.enabled}
                    checked={voiceCfg.autoSpeak}
                    onChange={(e) => patch('voice', { autoSpeak: e.target.checked })}
                    className="size-4 rounded border-line accent-aura-500 disabled:opacity-40"
                  />
                </label>
              </div>

              {/* Voice Selector + Test Button */}
              <div className="flex flex-wrap items-end gap-2.5">
                <label className="min-w-[200px] flex-1">
                  <span className="field-label">
                    Installed System Voice ({voice.voices.length} detected)
                  </span>
                  <select
                    disabled={!voiceCfg.enabled}
                    value={voiceCfg.voiceURI}
                    onChange={(e) => patch('voice', { voiceURI: e.target.value })}
                    className="input disabled:opacity-40"
                  >
                    <option value="">Automatic (matches response language)</option>
                    {voice.voices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  disabled={!voiceCfg.enabled}
                  onClick={() =>
                    voice.speaking
                      ? voice.stopSpeaking()
                      : voice.speak(activePersona.sample, 'dashboard-test')
                  }
                  className="btn btn-sm btn-accent"
                >
                  {voice.speaking ? (
                    <>
                      <VolumeX size={13} /> Stop Test
                    </>
                  ) : (
                    <>
                      <Volume2 size={13} /> Test Voice
                    </>
                  )}
                </button>
              </div>

              {/* Rate, Pitch, Volume sliders */}
              <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-3">
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="field-label mb-0">Speed</span>
                    <span className="font-mono text-xs tabular-nums text-zinc-300">{voiceCfg.rate.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min={0.6}
                    max={1.8}
                    step={0.1}
                    disabled={!voiceCfg.enabled}
                    value={voiceCfg.rate}
                    onChange={(e) => patch('voice', { rate: parseFloat(e.target.value) })}
                    className="w-full cursor-pointer accent-aura-500 disabled:opacity-40"
                  />
                </div>

                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="field-label mb-0">Pitch</span>
                    <span className="font-mono text-xs tabular-nums text-zinc-300">{voiceCfg.pitch.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min={0.6}
                    max={1.4}
                    step={0.1}
                    disabled={!voiceCfg.enabled}
                    value={voiceCfg.pitch}
                    onChange={(e) => patch('voice', { pitch: parseFloat(e.target.value) })}
                    className="w-full cursor-pointer accent-aura-500 disabled:opacity-40"
                  />
                </div>

                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="field-label mb-0">Volume</span>
                    <span className="font-mono text-xs tabular-nums text-zinc-300">{Math.round(voiceCfg.volume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={1.0}
                    step={0.05}
                    disabled={!voiceCfg.enabled}
                    value={voiceCfg.volume}
                    onChange={(e) => patch('voice', { volume: parseFloat(e.target.value) })}
                    className="w-full cursor-pointer accent-aura-500 disabled:opacity-40"
                  />
                </div>
              </div>
            </div>
          </SectionCard>

          {/* 4. Widget Behavior */}
          <SectionCard
            icon={Sliders}
            title="Widget Behavior & Hover Timing"
            subtitle="Control how the floating top-notch companion responds to mouse hover and focus."
          >
            <div className="space-y-4">
              <label className="card-raised flex cursor-pointer items-center justify-between gap-4 p-3">
                <div className="min-w-0">
                  <div className="text-xs font-medium text-zinc-200">Expand on Mouse Hover</div>
                  <div className="meta text-[11px]">
                    If disabled, the companion only expands on click or with Ctrl+Shift+Space.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={behavior.expandOnHover}
                  onChange={(e) => patch('behavior', { expandOnHover: e.target.checked })}
                  className="size-4 rounded border-line accent-aura-500"
                />
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="field-label mb-0">Hover Delay</span>
                    <span className="font-mono text-xs tabular-nums text-zinc-300">{behavior.hoverDelay} ms</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={800}
                    step={20}
                    disabled={!behavior.expandOnHover}
                    value={behavior.hoverDelay}
                    onChange={(e) => patch('behavior', { hoverDelay: parseInt(e.target.value, 10) })}
                    className="w-full cursor-pointer accent-aura-500 disabled:opacity-40"
                  />
                </div>

                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="field-label mb-0">Collapse Delay</span>
                    <span className="font-mono text-xs tabular-nums text-zinc-300">{behavior.collapseDelay} ms</span>
                  </div>
                  <input
                    type="range"
                    min={200}
                    max={2500}
                    step={50}
                    value={behavior.collapseDelay}
                    onChange={(e) => patch('behavior', { collapseDelay: parseInt(e.target.value, 10) })}
                    className="w-full cursor-pointer accent-aura-500"
                  />
                </div>
              </div>

              <div className="card-raised flex items-center justify-between px-3 py-2 text-xs">
                <span className="meta">Active Screen Anchor:</span>
                <span className="font-medium text-aura-300">
                  {ANCHOR_LABELS[anchorKey] ?? 'Top-Center (MacBook Notch Style)'}
                </span>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Right Column: live preview */}
        <div className="space-y-4 lg:col-span-5">
          <div className="sticky top-6 space-y-4">
            <SectionCard
              icon={Eye}
              title="Live Preview"
              subtitle="Preview how your assistant looks and replies with current settings."
            >
              {/* Wallpaper simulation */}
              <div className="card-raised space-y-3 p-3.5">
                {/* Floating notch/pill */}
                <div className="flex items-center justify-between">
                  <span className="meta text-[11px]">Idle Top Notch:</span>
                  <div className="glass inline-flex items-center gap-2 rounded-full py-1 pr-3 pl-2">
                    <Orb size={22} active={voice.speaking} online />
                    <div className="leading-tight">
                      <div className="text-xs font-semibold text-zinc-100">{name}</div>
                      <div className="flex items-center gap-1 text-[10px] meta">
                        <span className="dot dot-success" />
                        <span>{voice.speaking ? 'Speaking…' : 'Ready to help'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded chat panel */}
                <div className="card overflow-hidden">
                  <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-3 py-2">
                    <Orb size={20} active={voice.speaking} online />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-semibold text-zinc-100">{name}</span>
                        <span className="badge text-[10px]">
                          {activePersona.emoji} {activePersona.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 p-3 text-xs">
                    <div className="flex justify-end">
                      <div className="rounded-md rounded-br-none border border-line bg-surface-3 px-2.5 py-1.5 text-zinc-200">
                        Can you help me organize the quarterly strategy report?
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="rounded-md rounded-bl-none border border-line bg-surface-2 px-2.5 py-1.5 leading-relaxed text-zinc-300">
                        {activePersona.sample}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* System Prompt Inspector */}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setShowPrompt((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-aura-300 transition-colors hover:text-aura-400"
                >
                  <Code2 size={13} />
                  {showPrompt ? 'Hide Generated System Prompt' : 'View Generated System Prompt'}
                </button>
                {showPrompt && (
                  <pre className="scroll-thin mt-2 max-h-48 overflow-auto rounded-md border border-line bg-canvas p-3 font-mono text-[11px] whitespace-pre-wrap text-zinc-400">
                    {buildSystemPrompt(settings)}
                  </pre>
                )}
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}
