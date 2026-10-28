import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  Command,
  Monitor,
  MousePointerClick,
  Palette,
  ShieldCheck,
  Sparkles,
  WandSparkles,
  Wrench,
  Clipboard,
} from 'lucide-react';
import { aura } from '../lib/bridge.js';
import Orb from '../widget/components/Orb.jsx';
import PetAvatar from '../widget/components/PetAvatar.jsx';

const SHORTCUTS = [
  { id: 'routines', icon: Clock, title: 'Jarvis Routines', detail: 'Morning briefings & scheduled cleanup' },
  { id: 'system-tools', icon: Wrench, title: 'System Tools (70+)', detail: 'Direct OS execution & hardware tools' },
  { id: 'clipboard', icon: Clipboard, title: 'Contextual Memory', detail: 'Pieces-style code & link timeline' },
  { id: 'v2', icon: MousePointerClick, title: 'PC Control & Automations', detail: 'Mouse control & desktop agent' },
  { id: 'personalize', icon: Palette, title: 'Personalization', detail: 'Appearance, voice, and behavior' },
  { id: 'cloud-workspace', icon: Monitor, title: 'Cloud Workspace', detail: 'Work inside an isolated cloud VM' },
];

export default function OverviewSection({ settings, onUpdate, onNavigate }) {
  const [copilotStatus, setCopilotStatus] = useState({ active: false });
  const companionStyle = settings.widgetState?.companionStyle || 'notch';
  const selectedModel = settings.ai?.model || 'Default Model';

  useEffect(() => {
    aura.copilot?.status?.().then((s) => s && setCopilotStatus(s)).catch(() => {});
  }, []);

  const switchCompanion = () => onUpdate({ widgetState: { companionStyle: companionStyle === 'pet' ? 'orb' : 'pet' } });

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* Hero section */}
      <section className="card p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="max-w-xl">
            <div className="eyebrow mb-2 flex items-center gap-1.5 text-zinc-400">
              <Sparkles size={12} className="text-aura-400" /> Aura Control Center
            </div>
            <h1 className="text-[20px] font-semibold tracking-tight text-zinc-50 sm:text-[22px]">
              Everything Aura does,<br className="hidden sm:block" /> in one unified dashboard.
            </h1>
            <p className="mt-1.5 max-w-lg text-[13px] leading-relaxed text-zinc-400">
              Configure your desktop companion, manage mouse automation, and control local background automations on this PC.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onNavigate('v2')}
                className="btn btn-primary"
              >
                <MousePointerClick size={14} /> Desktop Control &amp; Actions <ArrowRight size={13} />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('personalize')}
                className="btn"
              >
                <WandSparkles size={14} /> Customize Aura
              </button>
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-center md:pr-4">
            <div className="relative grid size-28 place-items-center rounded-full border border-line bg-surface-2">
              <div className="absolute inset-2 rounded-full border border-line/40" />
              {companionStyle === 'pet' ? <PetAvatar size={68} active /> : <Orb size={72} active online />}
              <span className="absolute right-0 bottom-0.5 grid size-6 place-items-center rounded-full border border-line bg-surface text-emerald-400">
                <CheckCircle2 size={13} />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Control Mouse & Companion grid */}
      <section className="grid gap-3 lg:grid-cols-[1.25fr_0.75fr]">
        <article className="card flex flex-col justify-between p-4 sm:p-5">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-md border border-line bg-surface-2 text-zinc-300">
                  <MousePointerClick size={15} />
                </span>
                <div>
                  <h2 className="section-title">Mouse Control &amp; Desktop Co-Pilot</h2>
                  <p className="meta mt-0.5">Aura smoothly steers your cursor and types when requested.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const res = await aura.copilot.toggle();
                  if (res) setCopilotStatus(res);
                }}
                className={copilotStatus.active ? 'btn btn-sm btn-accent' : 'btn btn-sm'}
              >
                <MousePointerClick size={13} /> {copilotStatus.active ? 'Disable' : 'Enable'} (Ctrl+Shift+A)
              </button>
            </div>
            <div className="card-raised mt-4 p-3.5">
              <div className="flex items-center gap-2">
                <span className={`dot ${copilotStatus.active ? 'dot-success' : ''}`} />
                <span className="text-[13px] font-medium text-zinc-200">
                  {copilotStatus.active ? 'Mouse Control Active — Ready for instructions' : 'Mouse Control Idle'}
                </span>
              </div>
              <p className="mt-1.5 pl-3.5 text-xs leading-relaxed text-zinc-400">
                Type natural instructions into the companion such as "open Notepad and write a project summary" or "search YouTube for lofi beats". Aura generates a plan and guides your cursor.
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-zinc-400">
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-aura-400" />
            <span>
              Every movement and keystroke runs in real time on your actual Windows desktop. You can abort instantly at any moment by pressing{' '}
              <strong className="font-medium text-zinc-200">Esc</strong>.
            </span>
          </div>
        </article>

        <article className="card flex flex-col justify-between p-4 sm:p-5">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-md border border-line bg-surface-2 text-zinc-300">
                <Bot size={15} />
              </span>
              <div>
                <h2 className="section-title">Your Companion</h2>
                <p className="meta mt-0.5">Switch avatar visualization anytime.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={switchCompanion}
              className="card-raised card-interactive mt-4 flex w-full items-center justify-between gap-3 p-3 text-left"
            >
              <span className="flex items-center gap-3">
                {companionStyle === 'pet' ? <PetAvatar size={36} active /> : <Orb size={36} active online />}
                <span>
                  <span className="block text-[13px] font-medium text-zinc-200">
                    {companionStyle === 'pet' ? 'Aura Pet' : 'Original Orb'}
                  </span>
                  <span className="meta mt-0.5 block">Click to toggle style</span>
                </span>
              </span>
              <ArrowRight size={14} className="text-zinc-500" />
            </button>
          </div>
          <div className="card-raised mt-3 px-3.5 py-2.5">
            <div className="eyebrow">Active Model</div>
            <div className="mt-0.5 truncate font-mono text-xs text-zinc-200">{selectedModel}</div>
          </div>
        </article>
      </section>

      {/* Quick Access */}
      <section className="pt-1">
        <div className="mb-2.5">
          <h2 className="section-title">Quick Access</h2>
          <p className="meta mt-0.5">Frequently accessed controls and tools.</p>
        </div>
        <div className="grid gap-2.5 md:grid-cols-3">
          {SHORTCUTS.map(({ id, icon: Icon, title, detail }) => (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              className="card card-interactive group flex items-center gap-3 p-3.5 text-left"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-md border border-line bg-surface-2 text-zinc-300">
                <Icon size={15} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-zinc-200 transition-colors group-hover:text-zinc-50">
                  {title}
                </span>
                <span className="meta mt-0.5 block truncate">{detail}</span>
              </span>
              <ArrowRight size={14} className="shrink-0 text-zinc-600 transition-colors group-hover:text-zinc-400" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
