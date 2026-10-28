import { useEffect, useState } from 'react';
import {
  Clock,
  Cloud,
  Cpu,
  CreditCard,
  Crown,
  LayoutDashboard,
  LogOut,
  MonitorUp,
  MousePointerClick,
  Palette,
  Power,
  Shield,
  Sparkles,
  UserCheck,
  UserCircle2,
  Wrench,
  Clipboard,
} from 'lucide-react';
import { displayName, getPlan } from '../../shared/settings.js';
import { aura } from '../lib/bridge.js';
import { useSettings } from '../lib/useSettings.js';
import Orb from '../widget/components/Orb.jsx';
import UpgradeAlert from '../components/UpgradeAlert.jsx';
import AuthOnboarding from './AuthOnboarding.jsx';
import AccountSection from './AccountSection.jsx';
import PersonalizeSection from './PersonalizeSection.jsx';
import AuraV2Section from './AuraV2Section.jsx';
import ConnectorsSection from './ConnectorsSection.jsx';
import ModelsSection from './ModelsSection.jsx';
import BillingSection from './BillingSection.jsx';
import PrivacySection from './PrivacySection.jsx';
import CloudWorkspaceSection from './CloudWorkspaceSection.jsx';
import OverviewSection from './OverviewSection.jsx';
import { RoutinesSection } from './RoutinesSection.jsx';
import { SystemToolsSection } from './SystemToolsSection.jsx';
import { ClipboardMemorySection } from './ClipboardMemorySection.jsx';

const SECTIONS = [
  { id: 'home', icon: LayoutDashboard, label: 'Overview', desc: 'Companion status, mouse control, and system shortcuts.' },
  { id: 'routines', icon: Clock, label: 'Jarvis Routines', desc: 'Scheduled morning standups, automatic disk purges, and focus workflows.' },
  { id: 'system-tools', icon: Wrench, label: 'System Tools (70+)', desc: 'Direct OS execution for processes, network diagnostics, git, and media.' },
  { id: 'clipboard', icon: Clipboard, label: 'Contextual Memory', desc: 'Pieces-style timeline of copied code snippets, URLs, and notes.' },
  { id: 'account', icon: UserCircle2, label: 'Account & Identity', desc: 'Your name, nickname, Aura naming, behavior, and theme.' },
  { id: 'v2', icon: MousePointerClick, label: 'Aura v2.0 (PC Control)', desc: 'Desktop control, local automations & visual SSD recall.' },
  { id: 'personalize', icon: Palette, label: 'Personalization', desc: 'Themes, voice dictation, personality, and styling.' },
  { id: 'connectors', icon: Cloud, label: 'Connectors & Cloud', desc: 'ChatGPT, Claude, Gemini keys + Gmail, Drive, Calendar.' },
  { id: 'cloud-workspace', icon: MonitorUp, label: 'Cloud Workspace', desc: 'Isolated cloud Windows machine separated from local files.' },
  { id: 'models', icon: Cpu, label: 'AI Models (Local)', desc: 'Local Ollama models, RAM/VRAM telemetry, system status.' },
  { id: 'billing', icon: CreditCard, label: 'Billing & Plans', desc: 'Monthly ($20/$50) and Annual ($240/$600) plans, licensing.' },
  { id: 'privacy', icon: Shield, label: 'Privacy & Security', desc: 'Allowed directories, file indexing, and local data policy.' },
];

export default function Dashboard() {
  const [active, setActive] = useState('home');
  const { settings, update, reset } = useSettings();

  useEffect(() => {
    const handleNav = (e) => {
      if (e.detail?.section) {
        setActive(e.detail.section);
      }
    };
    window.addEventListener('aura:navigate-dashboard', handleNav);
    return () => window.removeEventListener('aura:navigate-dashboard', handleNav);
  }, []);

  const name = displayName(settings);
  const activePlan = getPlan(settings.account?.plan);
  const activeSection = SECTIONS.find((section) => section.id === active) || SECTIONS[0];
  const isAuthenticated = Boolean(settings.account?.authenticated);
  const isOnboarded = Boolean(settings.account?.onboardingCompleted);
  const userGreetingName =
    settings.account?.userNickname?.trim() || settings.account?.name || 'User';

  // If user is not authenticated or has not completed onboarding, display the Login & Onboarding flow
  if (!isAuthenticated || !isOnboarded) {
    return <AuthOnboarding settings={settings} onUpdate={update} />;
  }

  return (
    <div className="flex h-full bg-canvas text-zinc-200">
      <aside className="flex w-[248px] shrink-0 flex-col border-r border-zinc-800/60 bg-[#0c0c0e]">
        {/* Brand */}
        <div className="flex h-14 items-center justify-between gap-2 border-b border-zinc-800/60 px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <Orb size={22} online />
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[13px] font-semibold tracking-tight text-zinc-50">{name}</div>
              <div className="text-[10.5px] text-zinc-500">Aura Control Center</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActive('billing')}
            title="Active plan"
            className="badge shrink-0 cursor-pointer transition-colors hover:border-zinc-600 hover:text-zinc-100"
          >
            <Crown size={10} className="text-aura-400" /> {activePlan.name}
          </button>
        </div>

        {/* Connected User Card */}
        <div className="border-b border-zinc-800/60 p-3">
          <button
            type="button"
            onClick={() => setActive('account')}
            className="flex w-full items-center justify-between gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-white/[0.03]"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="grid size-7 shrink-0 place-items-center rounded-md border border-zinc-800/60 bg-surface-2 text-zinc-300">
                <UserCheck size={14} />
              </div>
              <div className="min-w-0">
                <div className="truncate text-[12.5px] font-medium text-zinc-100">
                  Hello, {userGreetingName}!
                </div>
                <div className="truncate text-[11px] text-zinc-500">
                  {settings.account?.email || 'Active Account'} ·{' '}
                  {(settings.account?.authProvider || 'email').toUpperCase()}
                </div>
              </div>
            </div>
          </button>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() =>
                update({
                  account: { onboardingCompleted: false },
                })
              }
              className="btn btn-sm w-full"
              title="Restart the onboarding wizard"
            >
              <Sparkles size={11} className="text-zinc-400" /> Wizard
            </button>
            <button
              type="button"
              onClick={() =>
                update({
                  account: { authenticated: false, onboardingCompleted: false },
                })
              }
              className="btn btn-sm w-full text-zinc-400 hover:border-red-900/70 hover:bg-red-950/30 hover:text-red-300"
              title="Go to sign in page (Google / iCloud / Email)"
            >
              <LogOut size={11} /> Sign In
            </button>
          </div>
        </div>

        <nav aria-label="Aura Navigation" className="scroll-thin flex flex-1 flex-col gap-px overflow-y-auto p-2">
          <div className="eyebrow px-2.5 pb-1.5 pt-2">Navigation</div>
          {SECTIONS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActive(id)}
              aria-current={active === id ? 'page' : undefined}
              className={`group relative flex h-8 items-center gap-2.5 rounded-md px-2.5 text-left text-[13px] transition-colors duration-100 ${
                active === id
                  ? 'bg-white/[0.06] font-medium text-zinc-50'
                  : 'text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-100'
              }`}
            >
              {active === id && <span className="absolute inset-y-1.5 left-0 w-[2px] rounded-full bg-aura-400" />}
              <Icon size={15} strokeWidth={1.75} className={`shrink-0 ${active === id ? 'text-aura-400' : 'text-zinc-500 transition-colors group-hover:text-zinc-300'}`} />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </nav>
        <div className="border-t border-zinc-800/60 p-2">
          <button
            type="button"
            onClick={() => aura.app.quit()}
            className="flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-[13px] text-zinc-500 transition-colors hover:bg-red-950/30 hover:text-red-300"
          >
            <Power size={15} strokeWidth={1.75} /> Quit {name}
          </button>
        </div>
      </aside>

      <main className="scroll-thin min-w-0 flex-1 overflow-y-auto">
        <div className="sticky top-0 z-20 mb-6 border-b border-zinc-800/60 bg-canvas/85 px-8 backdrop-blur-md">
          <div className="flex h-14 items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[12.5px]">
                <span className="text-zinc-500">Control Center</span>
                <span className="text-zinc-700">/</span>
                <span className="truncate font-medium text-zinc-100">{activeSection.label}</span>
              </div>
              <p className="mt-0.5 truncate text-[11.5px] text-zinc-500">{activeSection.desc}</p>
            </div>
            <span className="badge badge-success shrink-0"><span className="dot dot-success" /> Active Companion</span>
          </div>
        </div>
        <div className="mx-auto w-full max-w-[1120px] px-8 pb-10">
          <UpgradeAlert className="mb-6" onUpgrade={() => setActive('billing')} />
          {active === 'account' && (
            <AccountSection
              settings={settings}
              onUpdateSettings={update}
              onGoToBilling={() => setActive('billing')}
            />
          )}
          {active === 'home' && <OverviewSection settings={settings} onUpdate={update} onNavigate={setActive} />}
          {active === 'routines' && <RoutinesSection />}
          {active === 'system-tools' && <SystemToolsSection />}
          {active === 'clipboard' && <ClipboardMemorySection />}
          {active === 'v2' && <AuraV2Section />}
          {active === 'personalize' && (
            <PersonalizeSection settings={settings} onUpdate={update} onReset={reset} />
          )}
          {active === 'connectors' && (
            <ConnectorsSection settings={settings} onUpdateSettings={update} />
          )}
          {active === 'cloud-workspace' && <CloudWorkspaceSection />}
          {active === 'models' && (
            <ModelsSection
              settings={settings}
              onUpdateSettings={update}
              onOpenConnectors={() => setActive('connectors')}
            />
          )}
          {active === 'billing' && (
            <BillingSection settings={settings} onUpdateSettings={update} />
          )}
          {active === 'privacy' && (
            <PrivacySection settings={settings} onUpdateSettings={update} />
          )}
        </div>
      </main>
    </div>
  );
}
