import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Check,
  Clock,
  Cloud,
  Copy,
  Cpu,
  Crown,
  Download,
  Eye,
  EyeOff,
  ExternalLink,
  Gamepad2,
  Globe,
  HardDrive,
  KeyRound,
  Layers,
  Lock,
  LogOut,
  Mail,
  Monitor,
  MousePointerClick,
  Play,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Terminal,
  User,
  Zap,
} from 'lucide-react';

const PLANS = [
  {
    id: 'free',
    name: 'Free Trial (7 Zile)',
    badge: 'Probă 1 Săptămână',
    monthlyPrice: 0,
    yearlyTotal: 0,
    maxDevices: 1,
    desc: 'Testează gratuit Aura v2.0 timp de 7 zile pe PC-ul tău Windows, fără card bancar.',
    features: [
      'Acces gratuit timp de 7 zile (1 săptămână de probă)',
      'Conversații cu modele locale (Ollama) sau cheie Cloud proprie',
      'Widget flotant minimalist cu expandare la hover',
      'Căutare de bază în fișierele locale (1 PC)',
    ],
  },
  {
    id: 'pro',
    name: 'Aura Pro',
    badge: 'Cel mai popular',
    popular: true,
    monthlyPrice: 20,
    yearlyTotal: 240,
    maxDevices: 3,
    desc: 'Pentru profesioniști și creatori: conectare completă Cloud AI, Google Workspace, Istoric Vizual SSD și Automatizări PC.',
    features: [
      'Acces permanent fără limită de timp (după trial-ul de 7 zile)',
      'Conectori Google Gmail, Drive, Calendar, Notion & GitHub',
      'Modele Cloud: Gemini 4 Argon, Gemini 3.8 Pro, Claude Sonnet 4, GPT-4o',
      'Istoric Vizual pe SSD (/timeline) & Automatizări PC (/actiune)',
      'Licență valabilă pe până la 3 dispozitive (PC / Laptop)',
    ],
  },
  {
    id: 'max',
    name: 'Aura Max / Ultra',
    badge: 'Performanță Maximă',
    monthlyPrice: 50,
    yearlyTotal: 600,
    maxDevices: 10,
    desc: 'Putere totală: Gaming Coach Live, Control Desktop în timp real (Co-Pilot cu aură pe cursor) și până la 10 PC-uri.',
    features: [
      'Tot ce include Aura Pro la capacitate maximă și fără limite',
      'Cursor Co-Pilot (Ctrl+Shift+A) cu aură animată & Control Desktop (/controlează)',
      'Modul Gaming Coach Live (/joc) cu analiză tactică HUD fără Alt-Tab',
      'Conectare simultană la toți furnizorii Cloud AI cu auto-fallback',
      'Până la 10 dispozitive autorizate + suport tehnic prioritar VIP',
    ],
  },
];

const AURA_MODULES = [
  {
    id: 'copilot',
    icon: MousePointerClick,
    badge: 'Ctrl + Shift + A',
    title: 'Cursor Co-Pilot & Control Desktop în Timp Real',
    desc: 'La apăsarea combinației Ctrl+Shift+A, cursorul tău primește o aură luminoasă animată în timp real. Aura vede fereastra activă și poate executa acțiuni pe desktop (/controlează) exclusiv cu aprobarea ta.',
    bullets: [
      'Aură animată fluid direct în jurul cursorului, fără casete care să blocheze ecranul',
      'Previzualizare pas cu pas a planului de acțiune înainte de orice click sau tastă',
      'Buton de siguranță Aprobă & Execută / Respinge pentru control 100% al utilizatorului',
    ],
  },
  {
    id: 'gaming',
    icon: Gamepad2,
    badge: 'Comanda /joc',
    title: 'Gaming Coach Live & Co-Pilot Vizual',
    desc: 'Detectează automat jocurile video deschise (CS2, Valorant, League of Legends, Elden Ring, Dota 2, Cyberpunk etc.) și analizează HUD-ul, harta sau inventarul fără să faci Alt-Tab.',
    bullets: [
      'Sfaturi tactice în timp real bazate pe imaginea curentă din joc',
      'Rulare ultra-ușoară în overlay, fără scăderi de FPS',
      'Analiză de build-uri, economie de rundă și obiective pe hartă',
    ],
  },
  {
    id: 'timeline',
    icon: Clock,
    badge: 'Comanda /timeline',
    title: 'Memorie Vizuală Locală pe SSD (Timeline)',
    desc: 'Întreabă în limbaj natural: „Băi Aura, unde am văzut codul sau documentul ăla acum 10 minute?” și Aura îți găsește instant snapshot-ul salvat 100% local pe SSD.',
    bullets: [
      'Confidențialitate absolută: imaginile rămân exclusiv pe SSD-ul tău local',
      'Căutare semantică după titlul ferestrei, aplicație sau momentul de timp',
      'Re-analizare cu Vision AI a oricărui moment din trecut cu un singur click',
    ],
  },
  {
    id: 'actions',
    icon: Zap,
    badge: 'Comanda /actiune',
    title: 'Sistem de Automatizări Locale Sigure',
    desc: 'Execută acțiuni directe pe PC-ul tău prin scripturi verificate: organizarea automată a folderului Downloads pe categorii, curățarea fișierelor temporare, raport de sănătate RAM/CPU/Disk sau control media.',
    bullets: [
      'Organizare inteligentă a fișierelor din Downloads în subfoldere ordonate',
      'Diagnostic rapid al proceselor care consumă RAM și CPU',
      'Comutare temă Windows Dark/Light și control audio instant',
    ],
  },
  {
    id: 'mobile',
    icon: Smartphone,
    badge: '4G / 5G / PWA',
    title: 'Aura Mobile Companion (iOS & Android)',
    desc: 'Controlează-ți computerul de pe smartphone de la orice distanță: vezi ecranul PC-ului live cu noul cursor neon, trimiți comenzi vocale/text, lansezi proiecte în VS Code și aprobi acțiuni desktop dintr-un tap.',
    bullets: [
      'Acces global securizat Cloudflare Edge pe 4G/5G sau orice Wi-Fi fără setări în router',
      'Instalare instantă ca PWA nativ pe ecranul telefonului fără Google Play sau taxe',
      'Consolă live terminal pentru lansare de comenzi (npm run dev, git) direct de pe mobil',
    ],
  },
  {
    id: 'cloud',
    icon: Cloud,
    badge: 'Local + Cloud AI',
    title: 'Arhitectură Hibridă: Ollama Local + Gemini 4 Argon, Claude & ChatGPT',
    desc: 'Ai un PC puternic? Rulează modele gratuit prin Ollama. Ai un laptop mai slab? Conectează-ți direct contul Google Gemini (Gemini 4 Argon & 3.8 Pro), Claude sau OpenAI.',
    bullets: [
      'Suport nativ pentru noile modele Gemini 4 Argon (1M context) și Gemini 3.8 Pro',
      'Conectori direcți pentru Gmail, Google Drive, Google Calendar, Notion și GitHub',
      'Comutare automată (Auto-Fallback) pe Cloud dacă Ollama nu este pornit',
    ],
  },
];

const SOCIAL_PROVIDERS = [
  {
    id: 'google',
    label: 'Google',
    domain: 'gmail.com',
    icon: (
      <svg viewBox="0 0 24 24" className="size-4 shrink-0">
        <path
          fill="#EA4335"
          d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.8 9.1-9.2 0-.6-.1-1.1-.2-1.6H12z"
        />
        <path
          fill="#34A853"
          d="M3.6 7.4l3.2 2.4C7.7 7.8 9.7 6 12 6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.5 12 2.5 8.3 2.5 5.1 4.6 3.6 7.4z"
        />
        <path
          fill="#FBBC05"
          d="M12 21.5c2.5 0 4.7-.8 6.3-2.3l-3-2.4c-.8.6-1.9 1-3.3 1-2.5 0-4.6-1.7-5.4-4l-3.2 2.5c1.5 3.1 4.8 5.2 8.6 5.2z"
        />
        <path
          fill="#4285F4"
          d="M21.1 12.3c0-.6-.1-1.1-.2-1.6H12v3.9h5.5c-.3 1.3-1 2.4-2.2 3.1l3 2.4c1.8-1.6 2.8-4.1 2.8-7.8z"
        />
      </svg>
    ),
  },
  {
    id: 'icloud',
    label: 'iCloud',
    domain: 'icloud.com',
    icon: (
      <svg viewBox="0 0 24 24" className="size-4 shrink-0 fill-white">
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
      </svg>
    ),
  },
  {
    id: 'yahoo',
    label: 'Yahoo',
    domain: 'yahoo.com',
    icon: (
      <svg viewBox="0 0 24 24" className="size-4 shrink-0">
        <path
          fill="#A855F7"
          d="M3.2 4.5h4.1l3.4 6.7 3.4-6.7H18l-5.5 10.3v4.7H8.8v-4.7L3.2 4.5zm15.2 9.2h3.1l-.5 3.6h-2.1l-.5-3.6zm.2 4.6h2.7v2.5h-2.7v-2.5z"
        />
      </svg>
    ),
  },
];

function randomBlock5() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 5; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

/** Logo-ul Minimalist & Profesionist Atlas Labs */
function AtlasLogo({ size = 34 }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        className="shrink-0 drop-shadow-[0_0_14px_rgba(99,102,241,0.35)]"
      >
        <defs>
          <linearGradient id="atlasG" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#818CF8" />
            <stop offset="50%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#38BDF8" />
          </linearGradient>
        </defs>
        <rect
          x="4"
          y="4"
          width="56"
          height="56"
          rx="16"
          fill="#0B0D14"
          stroke="url(#atlasG)"
          strokeWidth="2.4"
        />
        <circle
          cx="32"
          cy="32"
          r="20"
          stroke="url(#atlasG)"
          strokeWidth="1.4"
          strokeDasharray="4 4"
          opacity="0.55"
        />
        <path
          d="M32 13L47 47H40.2L36.8 39H27.2L23.8 47H17L32 13ZM34.5 33.2L32 27L29.5 33.2H34.5Z"
          fill="#FFFFFF"
        />
        <circle cx="32" cy="13" r="2.8" fill="#38BDF8" />
      </svg>
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className="text-base font-bold tracking-tight text-white">ATLAS</span>
          <span className="text-base font-light tracking-widest text-indigo-400">LABS</span>
        </div>
        <span className="text-[9.5px] font-medium uppercase tracking-[0.18em] text-zinc-500">
          Desktop AI Systems
        </span>
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'products' | 'pricing' | 'docs' | 'login'
  const [billingCycle, setBillingCycle] = useState('yearly'); // 'monthly' | 'yearly'
  const [selectedModule, setSelectedModule] = useState(AURA_MODULES[0].id);

  // Stare Utilizator & Cont pe site-ul Atlas Labs (persistată în localStorage)
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('atlas_labs_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Stare Login / Sign Up
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [nicknameInput, setNicknameInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [socialModal, setSocialModal] = useState(null);
  const [socialEmail, setSocialEmail] = useState('');
  const [socialName, setSocialName] = useState('');

  // Stare Checkout & Plăți
  const [checkoutPlan, setCheckoutPlan] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Simulator interactiv în pagina Produse
  const [demoPrompt, setDemoPrompt] = useState('/joc');
  const [demoCursorAura, setDemoCursorAura] = useState(true);
  const [mousePos, setMousePos] = useState({ x: 50, y: 20 });

  useEffect(() => {
    try {
      if (user) localStorage.setItem('atlas_labs_user', JSON.stringify(user));
      else localStorage.removeItem('atlas_labs_user');
    } catch {}
  }, [user]);

  const handleMouseMove = (e) => {
    const x = (e.clientX / window.innerWidth) * 100;
    const y = (e.clientY / window.innerHeight) * 100;
    setMousePos({ x, y });
  };

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    setAuthError('');
    if (!email.includes('@')) {
      setAuthError('Te rugăm să introduci o adresă de email validă.');
      return;
    }
    if (password.length < 4) {
      setAuthError('Parola trebuie să conțină cel puțin 4 caractere.');
      return;
    }
    const finalName =
      nameInput.trim() ||
      email
        .split('@')[0]
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

    const newUser = {
      name: finalName,
      nickname: nicknameInput.trim() || finalName.split(' ')[0],
      email: email.trim(),
      provider: 'email',
      plan: user?.plan || 'free',
      billingCycle: user?.billingCycle || 'yearly',
      licenseKey: user?.licenseKey || '',
      createdAt: new Date().toLocaleDateString('ro-RO'),
    };
    setUser(newUser);
  };

  const handleSocialConfirm = (e) => {
    e.preventDefault();
    if (!socialModal) return;
    const finalEmail = socialEmail.trim() || `utilizator@${socialModal.domain}`;
    const finalName =
      socialName.trim() ||
      finalEmail
        .split('@')[0]
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

    const newUser = {
      name: finalName,
      nickname: finalName.split(' ')[0],
      email: finalEmail,
      provider: socialModal.id,
      plan: user?.plan || 'free',
      billingCycle: user?.billingCycle || 'yearly',
      licenseKey: user?.licenseKey || '',
      createdAt: new Date().toLocaleDateString('ro-RO'),
    };
    setUser(newUser);
    setSocialModal(null);
  };

  const handleCompleteCheckout = async (e) => {
    e.preventDefault();
    if (!checkoutPlan) return;
    setProcessingPayment(true);
    const generatedKey = `DEMO-${randomBlock5()}-${randomBlock5()}`;
    const updatedUser = {
      ...(user || {
        name: 'Vizitator',
        nickname: 'Vizitator',
        email: email || 'client@atlaslabs.ai',
        provider: 'email',
      }),
      plan: checkoutPlan.id,
      planName: checkoutPlan.name,
      billingCycle,
      licenseKey: generatedKey,
      isDemo: true,
    };

    setUser(updatedUser);
    setProcessingPayment(false);
    setCheckoutPlan(null);
    setActiveTab('login');
  };

  const copyKey = (text) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 1800);
  };

  const activeModuleObj =
    AURA_MODULES.find((m) => m.id === selectedModule) || AURA_MODULES[0];

  return (
    <div
      onMouseMove={handleMouseMove}
      className="relative min-h-screen bg-[#07080c] text-zinc-100 bg-grid-pattern"
    >
      {/* Spotlight Ambiental Minimalist */}
      <div
        className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(750px circle at ${mousePos.x}% ${mousePos.y}%, rgba(99, 102, 241, 0.11), transparent 65%)`,
        }}
      />

      {/* BARA DE NAVIGAȚIE ATLAS LABS */}
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#07080c]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className="text-left focus:outline-none"
          >
            <AtlasLogo />
          </button>

          {/* Meniu Central */}
          <nav className="hidden items-center gap-1 rounded-full border border-white/[0.08] bg-zinc-900/70 p-1 md:flex">
            {[
              { id: 'home', label: 'Acasă' },
              { id: 'products', label: 'Produse (Aura v2.0)', badge: 'NOU' },
              { id: 'showcase', label: 'Showcase Interactiv', badge: 'LIVE' },
              { id: 'pricing', label: 'Prețuri & Licențe' },
              { id: 'docs', label: 'Documentație' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition ${
                    isActive
                      ? 'bg-indigo-500 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : tab.badge === 'LIVE'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-indigo-500/20 text-indigo-300'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Butoane Dreapta: Login / Cont + Download Direct (.exe și .apk) */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setActiveTab('login')}
              className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-medium transition ${
                activeTab === 'login'
                  ? 'border-indigo-400 bg-indigo-500/20 text-white'
                  : 'border-white/10 bg-zinc-900/80 text-zinc-200 hover:border-white/20 hover:text-white'
              }`}
            >
              <User size={14} className="text-indigo-400" />
              <span>{user ? `Cont: ${user.nickname || user.name}` : 'Login / Sign Up'}</span>
            </button>

            <a
              href="/downloads/Aura-Setup-2.0.0.exe"
              download="Aura Setup 2.0.0.exe"
              className="hidden items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-200 sm:inline-flex"
            >
              <Download size={14} />
              <span>Descarcă PC (.exe)</span>
            </a>

            <a
              href="/downloads/Aura-Mobile.apk"
              download="Aura-Mobile.apk"
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-3.5 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/25 shadow-sm"
              title="Descarcă direct pachetul de instalare Android Aura-Mobile.apk"
            >
              <Download size={14} className="text-emerald-400" />
              <span>Descarcă APK Mobil</span>
            </a>
          </div>
        </div>

        {/* Meniu Mobil (pentru Telefon) */}
        <div className="flex items-center justify-around gap-1 border-t border-white/[0.06] bg-zinc-950/90 px-3 py-2 md:hidden">
          {[
            { id: 'home', label: 'Acasă' },
            { id: 'products', label: 'Produse' },
            { id: 'showcase', label: 'Demo Live' },
            { id: 'pricing', label: 'Prețuri' },
            { id: 'docs', label: 'Ghid' },
            { id: 'login', label: 'Login' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg px-2 py-1.5 text-[11px] font-semibold transition ${
                  isActive
                    ? 'bg-indigo-500 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* CONȚINUT PRINCIPAL PE TAB-URI */}
      <main className="relative z-10 mx-auto max-w-7xl px-6 pt-10 pb-24">
        <AnimatePresence mode="wait">
          {/* ==================== TAB 1: ACASĂ (ATLAS LABS OVERVIEW) ==================== */}
          {activeTab === 'home' && (
            <motion.div
              key="tab-home"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="space-y-20"
            >
              {/* Hero Section */}
              <section className="mx-auto max-w-4xl pt-6 text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-medium text-indigo-300">
                  <Sparkles size={13} />
                  <span>Atlas Labs prezintă Aura v2.0 — Disponibil acum pentru Windows 10 / 11</span>
                </div>

                <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-6xl leading-[1.1]">
                  Inteligență artificială nativă,{' '}
                  <span className="bg-gradient-to-r from-indigo-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
                    construită pentru desktopul tău.
                  </span>
                </h1>

                <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
                  La <strong className="text-zinc-200">Atlas Labs</strong> dezvoltăm sisteme AI
                  hibride (Local + Cloud) care văd, înțeleg și asistă în timp real tot ce faci pe
                  calculator — de la programare și documente, până la Gaming Coach și automatizări
                  locale.
                </p>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <a
                    href="/downloads/Aura-Setup-2.0.0.exe"
                    download="Aura Setup 2.0.0.exe"
                    className="inline-flex items-center gap-2 rounded-2xl bg-indigo-500 px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-indigo-500/25 transition hover:bg-indigo-400"
                  >
                    <Download size={17} />
                    <span>Descarcă Aura PC (.exe)</span>
                  </a>

                  <a
                    href="/downloads/Aura-Mobile.apk"
                    download="Aura-Mobile.apk"
                    className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/40 bg-emerald-500/20 px-6 py-3.5 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/30 shadow-lg shadow-emerald-500/20"
                    title="Descarcă fișierul Aura-Mobile.apk direct pe telefon sau PC"
                  >
                    <Download size={17} className="text-emerald-400" />
                    <span>Descarcă Aura Mobil (.apk)</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => setActiveTab('showcase')}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-zinc-900/80 px-6 py-3.5 text-sm font-semibold text-zinc-200 transition hover:border-white/30 hover:text-white"
                  >
                    <Smartphone size={16} className="text-cyan-400" />
                    <span>Vezi Demo Interactiv</span>
                    <ArrowRight size={16} />
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-zinc-400">
                  <span className="flex items-center gap-1.5 text-emerald-300">
                    <Check size={14} className="text-emerald-400" />
                    <span>Descărcare fișier APK Android (~290 KB)</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-indigo-300">
                    <Check size={14} className="text-indigo-400" />
                    <span>Windows 10 & 11 (64-bit)</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-zinc-400">
                    <span>Sau deschide direct în browser:</span>
                    <a
                      href="/mobile/"
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-cyan-400 underline hover:text-cyan-300"
                    >
                      Aura Web App (iOS/Safari)
                    </a>
                  </span>
                </div>
              </section>

              {/* Card Prezentare Flagship Aura v2.0 */}
              <section className="rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900/90 to-black/80 p-8 shadow-2xl">
                <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
                  <div className="space-y-4 lg:col-span-6">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-0.5 text-xs font-semibold text-emerald-300">
                      PRODUSUL PRINCIPAL ATLAS LABS
                    </span>
                    <h2 className="text-2xl font-bold text-white sm:text-3xl">
                      Aura v2.0 — AI Desktop Companion & Co-Pilot Vizual
                    </h2>
                    <p className="text-xs leading-relaxed text-zinc-400 sm:text-sm">
                      Aura plutește discret într-un colț al ecranului și înconjoară cursorul tău cu
                      o aură luminoasă animată atunci când ai nevoie de asistență vizuală în timp
                      real. Poate citi ecranul, îți oferă sfaturi live în jocuri, îți organizează
                      fișierele și își amintește tot ce ai lucrat pe SSD.
                    </p>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="rounded-xl border border-white/[0.07] bg-black/40 p-3">
                        <div className="text-xs font-semibold text-white">Cursor Co-Pilot</div>
                        <div className="mt-0.5 text-[11px] text-zinc-400">
                          Aură animată pe cursor (Ctrl+Shift+A) & control cu aprobare
                        </div>
                      </div>
                      <div className="rounded-xl border border-white/[0.07] bg-black/40 p-3">
                        <div className="text-xs font-semibold text-white">Gaming Coach Live</div>
                        <div className="mt-0.5 text-[11px] text-zinc-400">
                          Analiză tactică HUD în timp real fără Alt-Tab (/joc)
                        </div>
                      </div>
                      <div className="rounded-xl border border-white/[0.07] bg-black/40 p-3">
                        <div className="text-xs font-semibold text-white">Memorie Vizuală SSD</div>
                        <div className="mt-0.5 text-[11px] text-zinc-400">
                          Găsește orice fereastră sau cod văzut anterior (/timeline)
                        </div>
                      </div>
                      <div className="rounded-xl border border-white/[0.07] bg-black/40 p-3">
                        <div className="text-xs font-semibold text-white">Gemini 4 Argon & Cloud</div>
                        <div className="mt-0.5 text-[11px] text-zinc-400">
                          Rulează perfect și pe PC-uri slabe prin conectori Cloud
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('products')}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-400"
                      >
                        <span>Vezi Toate Funcțiile Aura v2.0</span>
                        <ArrowRight size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('pricing')}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-white/10"
                      >
                        <span>Vezi Planurile ($20 Pro / $50 Max)</span>
                      </button>
                    </div>
                  </div>

                  {/* Mockup Vizual Interactiv al Desktopului cu Aura */}
                  <div className="rounded-2xl border border-white/10 bg-[#0b0d14] p-5 shadow-inner lg:col-span-6">
                    <div className="mb-3 flex items-center justify-between border-b border-white/[0.07] pb-3">
                      <div className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full bg-rose-500/80" />
                        <span className="size-2.5 rounded-full bg-amber-500/80" />
                        <span className="size-2.5 rounded-full bg-emerald-500/80" />
                        <span className="ml-2 font-mono text-[11px] text-zinc-400">
                          Aura v2.0 — Desktop Companion (Live Preview)
                        </span>
                      </div>
                      <span className="rounded-full bg-indigo-500/20 px-2.5 py-0.5 font-mono text-[10px] text-indigo-300">
                        Gemini 4 Argon · Online
                      </span>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-indigo-500 px-3.5 py-2.5 text-white">
                        /joc Analizează situația curentă de pe ecran și dă-mi 3 ponturi rapide.
                      </div>
                      <div className="max-w-[90%] space-y-2 rounded-2xl rounded-bl-sm border border-white/10 bg-zinc-900/90 p-3.5 text-zinc-200">
                        <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-300">
                          <Gamepad2 size={13} /> Gaming Coach Live · Fereastră detectată
                        </div>
                        <p className="text-xs leading-relaxed text-zinc-300">
                          1. <strong>Economie & Obiectiv:</strong> Păstrează utilitățile pentru
                          ultimele 35 de secunde ale rundei.
                          <br />
                          2. <strong>Poziționare:</strong> Joacă din unghi acoperit și evită duelurile
                          izolate fără flash.
                          <br />
                          3. <strong>Minimap:</strong> Monitorizează rotația rapidă pe flancul opus.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Pilonii Tehnologici Atlas Labs */}
              <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
                {[
                  {
                    icon: ShieldCheck,
                    title: 'Confidențialitate Local-First',
                    desc: 'Istoricul vizual (/timeline), setările și indexul de fișiere rămân stocate local pe SSD-ul tău. Niciun fișier nu pleacă de pe PC fără comanda ta.',
                  },
                  {
                    icon: Cpu,
                    title: 'Performanță Nativă pe Orice PC',
                    desc: 'Indiferent dacă ai o stație grafică cu RTX pentru Ollama sau un laptop office care folosește Gemini 4 Argon în Cloud, Aura răspunde instant.',
                  },
                  {
                    icon: Layers,
                    title: 'Ecosistem Unificat de Conectori',
                    desc: 'Citește și rezumă emailurile din Gmail, caută documente în Google Drive, verifică agenda din Calendar și task-urile din Notion sau GitHub.',
                  },
                ].map((pillar) => {
                  const Icon = pillar.icon;
                  return (
                    <div
                      key={pillar.title}
                      className="rounded-2xl border border-white/[0.07] bg-zinc-900/50 p-6"
                    >
                      <div className="mb-3 grid size-10 place-items-center rounded-xl bg-indigo-500/15 text-indigo-400">
                        <Icon size={20} />
                      </div>
                      <h3 className="text-base font-semibold text-white">{pillar.title}</h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">{pillar.desc}</p>
                    </div>
                  );
                })}
              </section>
            </motion.div>
          )}

          {/* ==================== TAB 2: PRODUSE (AURA V2.0 SHOWCASE & DOWNLOAD) ==================== */}
          {activeTab === 'products' && (
            <motion.div
              key="tab-products"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="space-y-12"
            >
              {/* Header Portofoliu Produse Atlas Labs */}
              <div className="flex flex-wrap items-end justify-between gap-6 border-b border-white/[0.08] pb-8">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
                    Portofoliu de Produse · Atlas Labs
                  </span>
                  <h1 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">
                    Aura v2.0 — AI Desktop Companion
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm text-zinc-400">
                    Asistentul inteligent de desktop care îmbină vederea computerizată în timp real
                    (Live Vision), controlul asistat al cursorului, coaching-ul pentru jocuri și
                    automatizarea PC-ului.
                  </p>
                </div>

                {/* Box Descărcare Produs Final */}
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href="/downloads/Aura-Setup-2.0.0.exe"
                    download="Aura Setup 2.0.0.exe"
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-3 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-400"
                  >
                    <Download size={16} />
                    <span>Descarcă PC (.exe)</span>
                  </a>
                  <a
                    href="/downloads/Aura-Mobile.apk"
                    download="Aura-Mobile.apk"
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-5 py-3 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/30 shadow-lg shadow-emerald-500/20"
                  >
                    <Download size={16} className="text-emerald-400" />
                    <span>Descarcă APK Android (.apk)</span>
                  </a>
                  <a
                    href="/downloads/Aura-Portable-2.0.0.exe"
                    download="Aura-Portable-2.0.0.exe"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-zinc-900 px-4 py-3 text-xs font-semibold text-zinc-200 transition hover:bg-white/10 hover:text-white"
                  >
                    <HardDrive size={15} />
                    <span>Portabil PC (.exe)</span>
                  </a>
                </div>
              </div>

              {/* Descriere Detaliată + Explorator Interactiv al celor 5 Module Aura v2.0 */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Meniu Module Stânga */}
                <div className="space-y-2.5 lg:col-span-5">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Modulele Principale Aura v2.0
                  </div>
                  {AURA_MODULES.map((mod) => {
                    const Icon = mod.icon;
                    const active = selectedModule === mod.id;
                    return (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => setSelectedModule(mod.id)}
                        className={`flex w-full items-start gap-3.5 rounded-2xl border p-4 text-left transition ${
                          active
                            ? 'border-indigo-400/60 bg-indigo-500/15 text-white shadow-md'
                            : 'border-white/[0.07] bg-zinc-900/50 text-zinc-300 hover:border-white/20'
                        }`}
                      >
                        <div
                          className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                            active
                              ? 'bg-indigo-500 text-white'
                              : 'bg-white/5 text-indigo-400'
                          }`}
                        >
                          <Icon size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-white">{mod.title}</span>
                          </div>
                          <span className="mt-1 inline-block rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] text-indigo-300">
                            {mod.badge}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Detalii Modul Selectat + Demo Vizual Dreapta */}
                <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-zinc-900/70 p-7 lg:col-span-7">
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full border border-indigo-400/30 bg-indigo-500/15 px-3 py-1 font-mono text-xs font-semibold text-indigo-300">
                        {activeModuleObj.badge}
                      </span>
                      <span className="text-xs text-zinc-400">Inclus în Aura v2.0</span>
                    </div>

                    <h2 className="mt-4 text-2xl font-bold text-white">
                      {activeModuleObj.title}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                      {activeModuleObj.desc}
                    </p>

                    <div className="mt-6 space-y-2.5 rounded-2xl border border-white/[0.07] bg-black/40 p-5">
                      <div className="text-xs font-semibold text-zinc-200">
                        Capabilități cheie:
                      </div>
                      {activeModuleObj.bullets.map((b) => (
                        <div key={b} className="flex items-start gap-2.5 text-xs text-zinc-300">
                          <Check size={15} className="mt-0.5 shrink-0 text-emerald-400" />
                          <span>{b}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Previzualizare Aura Animată pe Cursor */}
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-indigo-500/25 bg-indigo-500/[0.07] p-4">
                    <div className="flex items-center gap-3.5">
                      <div className="relative grid size-12 place-items-center">
                        {demoCursorAura && (
                          <>
                            <span className="absolute inset-0 animate-ping rounded-full bg-indigo-500/25" />
                            <span
                              className="absolute inset-1 animate-spin rounded-full border-2 border-indigo-400 border-t-sky-300 border-r-transparent"
                              style={{ animationDuration: '2.2s' }}
                            />
                          </>
                        )}
                        <MousePointerClick size={18} className="relative z-10 text-white" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">
                          Previzualizare Cursor cu Aură Animată
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          În aplicația desktop, apăsarea <code className="text-zinc-200">Ctrl+Shift+A</code> înconjoară cursorul tău exact așa.
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDemoCursorAura((v) => !v)}
                      className="rounded-xl border border-white/15 bg-black/40 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/10"
                    >
                      {demoCursorAura ? 'Oprește Animația' : 'Pornește Animația'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Specificații Tehnice & Pachetul de Descărcare Final */}
              <section className="rounded-3xl border border-white/10 bg-zinc-900/50 p-7">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">Cerințe de Sistem</h3>
                    <ul className="mt-2 space-y-1.5 text-xs text-zinc-400">
                      <li>• Sistem de operare: Windows 10 / Windows 11 (64-bit)</li>
                      <li>• Memorie RAM: minim 4 GB RAM (pentru Cloud AI) / 8+ GB pentru Ollama</li>
                      <li>• Spațiu pe disc: ~280 MB pentru aplicația nativă</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Modele AI & Conectori</h3>
                    <ul className="mt-2 space-y-1.5 text-xs text-zinc-400">
                      <li>• Google Gemini: Gemini 4 Argon, Gemini 3.8 Pro, 3.8 Flash</li>
                      <li>• Anthropic & OpenAI: Claude Sonnet 4, GPT-4o, o3-mini</li>
                      <li>• Workspace: Gmail, Google Drive, Calendar, Notion, GitHub</li>
                    </ul>
                  </div>
                  <div className="flex flex-col justify-between rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4">
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-white">
                        <span>Versiune Oficială Stabilă</span>
                        <span className="font-mono text-indigo-300">v2.0.0 (x64)</span>
                      </div>
                      <p className="mt-1 text-[11px] text-zinc-300">
                        Include installerul NSIS cu shortcut pe Desktop și varianta portabilă.
                      </p>
                    </div>
                    <a
                      href="/downloads/Aura-Setup-2.0.0.exe"
                      download="Aura Setup 2.0.0.exe"
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 py-2.5 text-xs font-semibold text-white hover:bg-indigo-400"
                    >
                      <Download size={14} />
                      <span>Descarcă Aura Setup 2.0.0.exe</span>
                    </a>
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {/* ==================== TAB SHOWCASE INTERACTIV (DEMO MOBIL SEPARAT) ==================== */}
          {activeTab === 'showcase' && (
            <motion.div
              key="tab-showcase"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="space-y-10"
            >
              {/* Header Showcase */}
              <div className="mx-auto max-w-4xl text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1 text-xs font-semibold text-cyan-300">
                  <Smartphone size={14} />
                  <span>SIMULATOR INTERACTIV LIVE · SECȚIUNE DEDICATĂ</span>
                </div>
                <h1 className="mt-4 text-3xl font-extrabold text-white sm:text-5xl">
                  Aura Mobile Companion & PC Remote Control
                </h1>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
                  Experimentează direct în browser cum funcționează Aura Mobile: ecran PC în timp real cu noul cursor neon electric cyan, consolă terminal interactivă și asistentul AI care execută comenzi pe computerul tău de oriunde (Wi-Fi, 4G, 5G).
                </p>

                {/* Acțiuni Rapide de Descărcare și Deschidere */}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <a
                    href="/downloads/Aura-Mobile.apk"
                    download="Aura-Mobile.apk"
                    className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-400"
                  >
                    <Download size={16} />
                    <span>Descarcă Aplicația (Aura-Mobile.apk)</span>
                  </a>
                  <a
                    href="/downloads/Aura-Setup-2.0.0.exe"
                    download="Aura Setup 2.0.0.exe"
                    className="inline-flex items-center gap-2 rounded-2xl bg-indigo-500 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-400"
                  >
                    <Download size={16} />
                    <span>Descarcă PC Companion (.exe)</span>
                  </a>
                  <a
                    href="/demo.html"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-5 py-3 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/20"
                  >
                    <ExternalLink size={15} />
                    <span>Deschide Simulatorul în Tab Separat</span>
                  </a>
                  <a
                    href="/mobile/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-zinc-900 px-5 py-3 text-xs font-semibold text-zinc-300 transition hover:bg-white/10 hover:text-white"
                  >
                    <Globe size={15} />
                    <span>Deschide Web App (iOS/Safari)</span>
                  </a>
                </div>
              </div>

              {/* Mockup Interactiv încadrat în Iframe Responsive */}
              <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-white/15 bg-zinc-950 p-2 shadow-2xl shadow-cyan-500/10">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-zinc-900/80 rounded-t-2xl">
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full bg-rose-500/80" />
                    <span className="size-3 rounded-full bg-amber-500/80" />
                    <span className="size-3 rounded-full bg-emerald-500/80" />
                    <span className="ml-2 font-mono text-xs text-zinc-400">
                      Atlas Labs · iPhone 16 Pro & PC Remote Companion Live Simulation
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                      <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      SIMULARE ACTIVĂ
                    </span>
                  </div>
                </div>
                <div className="w-full bg-[#030712] flex justify-center py-4">
                  <iframe
                    src="/demo.html"
                    title="Aura Mobile Interactive Demo"
                    className="w-full max-w-4xl h-[780px] border-0 rounded-2xl shadow-inner"
                  />
                </div>
              </div>

              {/* 3 Carduri Detalii Tehnice Simulator */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/60 p-6">
                  <div className="mb-3 grid size-10 place-items-center rounded-xl bg-cyan-500/15 text-cyan-400">
                    <MousePointerClick size={20} />
                  </div>
                  <h3 className="text-base font-semibold text-white">Cursor Neon Electric Cyan</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                    Când Aura monitorizează PC-ul sau când transmiți ecranul către telefon, cursorul tău de pe desktop afișează aura luminoasă cyan cu impuls fluid, fără să blocheze fereastra activă.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/60 p-6">
                  <div className="mb-3 grid size-10 place-items-center rounded-xl bg-indigo-500/15 text-indigo-400">
                    <Terminal size={20} />
                  </div>
                  <h3 className="text-base font-semibold text-white">Consolă Terminal de la Distanță</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                    Poți lansa scripturi de dev (npm run dev, git commit/push, restart server) de pe telefon în timp ce ești pe canapea sau în deplasare.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/60 p-6">
                  <div className="mb-3 grid size-10 place-items-center rounded-xl bg-emerald-500/15 text-emerald-400">
                    <Globe size={20} />
                  </div>
                  <h3 className="text-base font-semibold text-white">Conexiune Globală Cloudflare</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                    Nu trebuie să configurezi port forwarding sau IP static pe router. Tunnel-ul securizat Cloudflare Edge funcționează nativ pe orice conexiune Wi-Fi, 4G sau 5G.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ==================== TAB 4: PREȚURI & LICENȚE ($20 PRO / $50 MAX) ==================== */}
          {activeTab === 'pricing' && (
            <motion.div
              key="tab-pricing"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="space-y-10"
            >
              <div className="mx-auto max-w-3xl text-center">
                <span className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
                  Licențiere Simplă & Transparentă
                </span>
                <h1 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">
                  Alege planul potrivit pentru tine
                </h1>
                <p className="mt-2 text-sm text-zinc-400">
                  Începe cu 7 zile gratuite (Free Trial), apoi alege{' '}
                  <strong className="text-white">Aura Pro ($20/lună · $240/an)</strong> sau{' '}
                  <strong className="text-white">Aura Max / Ultra ($50/lună · $600/an)</strong>.
                  Portalul afișează fluxul de abonament ca previzualizare; achizițiile și licențele reale nu sunt conectate.
                </p>

                {/* Comutator Lunar vs Anual */}
                <div className="mt-6 inline-flex items-center rounded-2xl border border-white/10 bg-zinc-900 p-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    className={`rounded-xl px-4 py-2 font-semibold transition ${
                      billingCycle === 'monthly'
                        ? 'bg-indigo-500 text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Facturare Lunară ($20 / $50)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('yearly')}
                    className={`rounded-xl px-4 py-2 font-semibold transition ${
                      billingCycle === 'yearly'
                        ? 'bg-indigo-500 text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Facturare Anuală ($240 / $600 pe an)
                  </button>
                </div>
              </div>

              {/* Carduri Planuri */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {PLANS.map((plan) => {
                  const displayPrice =
                    billingCycle === 'yearly' ? plan.yearlyTotal : plan.monthlyPrice;

                  return (
                    <div
                      key={plan.id}
                      className={`flex flex-col justify-between rounded-3xl border p-7 transition ${
                        plan.popular
                          ? 'border-indigo-400/70 bg-gradient-to-b from-indigo-500/[0.12] to-zinc-900/80 shadow-xl'
                          : 'border-white/10 bg-zinc-900/60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                          <span
                            className={`rounded-full px-3 py-0.5 text-[10px] font-bold ${
                              plan.popular
                                ? 'bg-indigo-500 text-white'
                                : 'bg-white/10 text-zinc-300'
                            }`}
                          >
                            {plan.badge}
                          </span>
                        </div>

                        <p className="mt-2 text-xs leading-relaxed text-zinc-400">{plan.desc}</p>

                        <div className="mt-5 rounded-2xl border border-white/[0.07] bg-black/40 p-4">
                          {plan.id === 'free' ? (
                            <div>
                              <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-extrabold text-white">$0</span>
                                <span className="text-xs font-medium text-amber-300">
                                  / 7 zile (1 săptămână)
                                </span>
                              </div>
                              <p className="mt-1 text-[11px] text-zinc-400">
                                Inclus automat la instalarea aplicației Aura v2.0.
                              </p>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-4xl font-extrabold text-white">
                                  ${displayPrice}
                                </span>
                                <span className="text-xs text-zinc-400">
                                  {billingCycle === 'yearly' ? '/ an' : '/ lună'}
                                </span>
                              </div>
                              <div className="mt-2 space-y-1 border-t border-white/[0.06] pt-2 text-[11px] text-zinc-300">
                                <div className="flex justify-between">
                                  <span className="text-zinc-400">Preț lunar:</span>
                                  <strong>${plan.monthlyPrice} / lună</strong>
                                </div>
                                <div className="flex justify-between text-indigo-300">
                                  <span>Preț anual (12 luni):</span>
                                  <strong>
                                    ${plan.monthlyPrice} × 12 = ${plan.yearlyTotal} / an
                                  </strong>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <ul className="mt-5 space-y-2.5 text-xs text-zinc-300">
                          {plan.features.map((f) => (
                            <li key={f} className="flex items-start gap-2.5">
                              <Check size={15} className="mt-0.5 shrink-0 text-indigo-400" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-7 pt-2">
                        {plan.id === 'free' ? (
                          <a
                            href="/downloads/Aura-Setup-2.0.0.exe"
                            download="Aura Setup 2.0.0.exe"
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-3 text-xs font-semibold text-white transition hover:bg-white/10"
                          >
                            <Download size={14} />
                            <span>Descarcă Gratuit (Trial 7 Zile)</span>
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setCheckoutPlan(plan)}
                            className={`w-full rounded-xl py-3 text-xs font-bold text-white transition ${
                              plan.popular
                                ? 'bg-indigo-500 hover:bg-indigo-400 shadow-lg shadow-indigo-500/25'
                                : 'bg-white/15 hover:bg-indigo-500'
                            }`}
                          >
                            Previzualizează {plan.name} (
                            {billingCycle === 'yearly'
                              ? `$${plan.yearlyTotal}/an`
                              : `$${plan.monthlyPrice}/lună`}
                            )
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ==================== TAB 4: DOCUMENTAȚIE & GHID RAPID ==================== */}
          {activeTab === 'docs' && (
            <motion.div
              key="tab-docs"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="mx-auto max-w-4xl space-y-8"
            >
              <div>
                <span className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
                  Documentație Oficială · Atlas Labs
                </span>
                <h1 className="mt-2 text-3xl font-extrabold text-white">
                  Ghid de Utilizare Aura v2.0
                </h1>
                <p className="mt-1 text-sm text-zinc-400">
                  Tot ce trebuie să știi pentru a instala, configura și folosi la maximum Aura pe
                  PC-ul tău.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  {
                    cmd: 'Ctrl + Shift + Space',
                    title: 'Deschide / Restrânge Widgetul Aura',
                    desc: 'Funcționează global din orice aplicație sau joc pentru a deschide fereastra de chat Aura.',
                  },
                  {
                    cmd: 'Ctrl + Shift + A',
                    title: 'Activează Aura Animată pe Cursor',
                    desc: 'Înconjoară cursorul tău cu o aură luminoasă animată și activează vederea în timp real a ecranului.',
                  },
                  {
                    cmd: '/joc [întrebare]',
                    title: 'Modul Gaming Coach Live',
                    desc: 'Analizează jocul de pe ecran și oferă sfaturi tactice fără să ieși din joc.',
                  },
                  {
                    cmd: '/controlează <instrucțiune>',
                    title: 'Control Desktop cu Aprobare',
                    desc: 'Generează un plan de click-uri și taste pe care îl poți aproba cu un singur click.',
                  },
                  {
                    cmd: '/timeline [căutare]',
                    title: 'Istoric Vizual pe SSD',
                    desc: 'Caută prin snapshot-urile recente de pe ecran sau întreabă „unde am văzut... acum 10 minute?”.',
                  },
                  {
                    cmd: '/actiune',
                    title: 'Automatizări Locale PC',
                    desc: 'Curăță fișierele temporare, organizează folderul Downloads sau verifică sănătatea sistemului.',
                  },
                ].map((item) => (
                  <div
                    key={item.cmd}
                    className="rounded-2xl border border-white/[0.08] bg-zinc-900/60 p-5"
                  >
                    <span className="rounded-lg border border-indigo-400/30 bg-indigo-500/15 px-2.5 py-1 font-mono text-xs font-semibold text-indigo-300">
                      {item.cmd}
                    </span>
                    <h3 className="mt-3 text-sm font-bold text-white">{item.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-400">{item.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ==================== TAB 5: LOGIN PAGE & PORTAL CONT ATLAS LABS ==================== */}
          {activeTab === 'login' && (
            <motion.div
              key="tab-login"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="mx-auto max-w-4xl"
            >
              <div className="mb-5 rounded-2xl border border-amber-400/20 bg-amber-400/[0.07] px-4 py-3 text-xs leading-relaxed text-amber-100/90">
                Portal demonstrativ: autentificarea nu este conectată la un serviciu de conturi, iar achizițiile nu sunt procesate. Datele rămân doar în acest browser. Nu introduce parole reale și nu furniza date de plată.
              </div>

              {user ? (
                /* PORTALUL UTILIZATORULUI AUTENTIFICAT */
                <div className="space-y-6 rounded-3xl border border-white/10 bg-zinc-900/75 p-8 shadow-2xl">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
                    <div className="flex items-center gap-4">
                      <div className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 text-lg font-extrabold text-white shadow-lg">
                        {(user.nickname || user.name || 'U').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h1 className="text-xl font-bold text-white">
                            Salut, {user.nickname || user.name}!
                          </h1>
                          <span className="rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase text-indigo-300">
                            {user.provider}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400">
                          {user.email} · Cont Atlas Labs activ
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setUser(null)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/20"
                    >
                      <LogOut size={14} />
                      <span>Deconectare (Sign Out)</span>
                    </button>
                  </div>

                  {/* Descărcare Produs & Cheie de Licență */}
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/[0.08] bg-black/40 p-5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-400">
                          Abonamentul Tău Aura
                        </span>
                        <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                          {user.isDemo ? 'Previzualizare' : user.plan === 'free' ? 'Free Trial 7 Zile' : 'Activ'}
                        </span>
                      </div>
                      <div className="mt-2 text-lg font-bold text-white">
                        {user.planName ||
                          (user.plan === 'max'
                            ? 'Aura Max / Ultra ($50/lună · $600/an)'
                            : user.plan === 'pro'
                              ? 'Aura Pro ($20/lună · $240/an)'
                              : 'Free Trial (7 Zile)')}
                      </div>

                      {user.licenseKey ? (
                        <div className="mt-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3">
                          <div className="text-[11px] text-zinc-300">
                            {user.isDemo
                              ? 'Cod demonstrativ; nu poate fi activat în aplicația Aura:'
                              : 'Cheia ta de produs One-Time Use (copiaz-o în aplicația Aura):'}
                          </div>
                          <div className="mt-1.5 flex items-center justify-between gap-2">
                            <code className="font-mono text-xs font-bold text-indigo-300">
                              {user.licenseKey}
                            </code>
                            <button
                              type="button"
                              onClick={() => copyKey(user.licenseKey)}
                              className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-[11px] text-white hover:bg-white/20"
                            >
                              <Copy size={12} />
                              <span>{copiedKey ? 'Copiat!' : 'Copiază'}</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4">
                          <button
                            type="button"
                            onClick={() => setActiveTab('pricing')}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-500 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-400"
                          >
                            <Crown size={13} />
                            <span>Fă Upgrade la Aura Pro ($20) sau Max ($50)</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-black/40 p-5">
                      <div>
                        <span className="text-xs font-semibold text-zinc-400">
                          Kit de Instalare Oficial
                        </span>
                        <h3 className="mt-1 text-base font-bold text-white">
                          Aura v2.0.0 pentru Windows (x64)
                        </h3>
                        <p className="mt-1 text-xs text-zinc-400">
                          Descarcă installerul și autentifică-te în aplicație cu același cont.
                        </p>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <a
                          href="/downloads/Aura-Setup-2.0.0.exe"
                          download="Aura Setup 2.0.0.exe"
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white py-2.5 text-xs font-bold text-zinc-950 hover:bg-zinc-200"
                        >
                          <Download size={14} />
                          <span>Aura Setup 2.0.0.exe</span>
                        </a>
                        <a
                          href="/downloads/Aura-Portable-2.0.0.exe"
                          download="Aura-Portable-2.0.0.exe"
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 px-3.5 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-white/10"
                        >
                          <span>Portable .exe</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* PAGINA DE LOGIN & SIGN UP INTERACTIVĂ ATLAS LABS */
                <div className="grid grid-cols-1 overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/80 shadow-2xl lg:grid-cols-12">
                  {/* Panou Stânga Brand */}
                  <div className="flex flex-col justify-between border-b border-white/[0.07] bg-gradient-to-b from-indigo-500/10 via-transparent to-black/50 p-8 lg:col-span-5 lg:border-r lg:border-b-0">
                    <div>
                      <AtlasLogo />
                      <h2 className="mt-8 text-2xl font-bold text-white">
                        Un singur cont pentru tot ecosistemul Atlas Labs.
                      </h2>
                      <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                        Conectează-te cu Google, iCloud, Yahoo sau Email pentru a descărca Aura
                        v2.0, a-ți gestiona cheile de licență și a sincroniza preferințele tale.
                      </p>
                    </div>

                    <div className="mt-8 space-y-2.5 text-xs text-zinc-300">
                      <div className="flex items-center gap-2">
                        <BadgeCheck size={15} className="text-indigo-400" />
                        <span>Descărcare directă Aura Setup 2.0.0.exe</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <BadgeCheck size={15} className="text-indigo-400" />
                        <span>Administrare licențe 5×5 & facturi fiscale</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <BadgeCheck size={15} className="text-indigo-400" />
                        <span>Sincronizare profil cu aplicația de desktop</span>
                      </div>
                    </div>
                  </div>

                  {/* Formular Login / Sign Up Dreapta */}
                  <div className="p-8 lg:col-span-7">
                    <div className="mb-6 flex items-center justify-between">
                      <div>
                        <h1 className="text-xl font-bold text-white">
                          {authMode === 'login' ? 'Intră în contul Atlas Labs' : 'Creează cont nou'}
                        </h1>
                        <p className="text-xs text-zinc-400">
                          Alege metoda preferată de autentificare
                        </p>
                      </div>

                      <div className="inline-flex rounded-xl border border-white/10 bg-black/40 p-1 text-xs">
                        <button
                          type="button"
                          onClick={() => setAuthMode('login')}
                          className={`rounded-lg px-3 py-1.5 font-medium transition ${
                            authMode === 'login'
                              ? 'bg-indigo-500 text-white'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          Login
                        </button>
                        <button
                          type="button"
                          onClick={() => setAuthMode('signup')}
                          className={`rounded-lg px-3 py-1.5 font-medium transition ${
                            authMode === 'signup'
                              ? 'bg-indigo-500 text-white'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          Sign Up
                        </button>
                      </div>
                    </div>

                    {/* Butoane Google, iCloud, Yahoo */}
                    <div className="grid grid-cols-3 gap-2.5">
                      {SOCIAL_PROVIDERS.map((prov) => (
                        <button
                          key={prov.id}
                          type="button"
                          onClick={() => {
                            setSocialModal(prov);
                            setSocialEmail(`utilizator@${prov.domain}`);
                            setSocialName('');
                          }}
                          className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/40 py-2.5 text-xs font-medium text-white transition hover:border-indigo-400/50 hover:bg-white/10"
                        >
                          {prov.icon}
                          <span>{prov.label}</span>
                        </button>
                      ))}
                    </div>

                    <div className="my-5 flex items-center">
                      <div className="flex-grow border-t border-white/10" />
                      <span className="mx-3 text-[11px] uppercase tracking-wider text-zinc-500">
                        sau cu email
                      </span>
                      <div className="flex-grow border-t border-white/10" />
                    </div>

                    <form onSubmit={handleEmailSubmit} className="space-y-3.5">
                      {authMode === 'signup' && (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <label className="block">
                            <span className="mb-1 block text-xs text-zinc-300">Nume complet</span>
                            <input
                              type="text"
                              required
                              value={nameInput}
                              onChange={(e) => setNameInput(e.target.value)}
                              placeholder="ex: Daniel Tăranu"
                              className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs text-white focus:border-indigo-400 focus:outline-none"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-xs text-zinc-300">
                              Cum să-ți spună Aura?
                            </span>
                            <input
                              type="text"
                              value={nicknameInput}
                              onChange={(e) => setNicknameInput(e.target.value)}
                              placeholder="ex: Dani, Șefu"
                              className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs text-white focus:border-indigo-400 focus:outline-none"
                            />
                          </label>
                        </div>
                      )}

                      <label className="block">
                        <span className="mb-1 block text-xs text-zinc-300">Email</span>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="nume@gmail.com / @icloud.com / @yahoo.com"
                          className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs text-white focus:border-indigo-400 focus:outline-none"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-xs text-zinc-300">Parolă</span>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pr-10 pl-3.5 text-xs text-white focus:border-indigo-400 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                          >
                            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </label>

                      {authError && (
                        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs text-rose-200">
                          {authError}
                        </div>
                      )}

                      <button
                        type="submit"
                        className="w-full rounded-xl bg-indigo-500 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-400"
                      >
                        {authMode === 'login' ? 'Autentificare în Atlas Labs' : 'Creează Contul'}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FOOTER MINIMALIST ATLAS LABS */}
      <footer className="border-t border-white/[0.07] bg-black/60 py-10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-6 text-xs text-zinc-500">
          <AtlasLogo size={26} />
          <div className="flex flex-wrap gap-6">
            <button type="button" onClick={() => setActiveTab('home')} className="hover:text-white">
              Acasă
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className="hover:text-white"
            >
              Produsul Aura v2.0
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pricing')}
              className="hover:text-white"
            >
              Prețuri ($20 / $50)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('login')}
              className="hover:text-white"
            >
              Cont Client
            </button>
          </div>
          <div>© {new Date().getFullYear()} Atlas Labs Inc. Toate drepturile rezervate.</div>
        </div>
      </footer>

      {/* MODAL OAUTH SOCIAL (GOOGLE / ICLOUD / YAHOO) */}
      {socialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-zinc-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl border border-white/10 bg-black/40">
                {socialModal.icon}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Conectare cu {socialModal.label}
                </h3>
                <p className="text-xs text-zinc-400">
                  Autentificare rapidă în portalul Atlas Labs
                </p>
              </div>
            </div>
            <form onSubmit={handleSocialConfirm} className="space-y-3.5">
              <label className="block">
                <span className="mb-1 block text-xs text-zinc-300">Numele tău</span>
                <input
                  type="text"
                  required
                  value={socialName}
                  onChange={(e) => setSocialName(e.target.value)}
                  placeholder="ex: Daniel Tăranu"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-xs text-white focus:border-indigo-400 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-zinc-300">
                  Email {socialModal.label}
                </span>
                <input
                  type="email"
                  required
                  value={socialEmail}
                  onChange={(e) => setSocialEmail(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-xs text-white focus:border-indigo-400 focus:outline-none"
                />
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSocialModal(null)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs text-zinc-300"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-500 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-400"
                >
                  Continuă cu {socialModal.label}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CHECKOUT & GENERARE CHEIE 5x5 */}
      {checkoutPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-zinc-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="grid size-9 place-items-center rounded-xl bg-indigo-500/20 text-indigo-400">
                  <Lock size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Previzualizare plan — {checkoutPlan.name}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Generează un cod demonstrativ. Nu se procesează nicio plată și codul nu activează o licență.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCheckoutPlan(null)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCompleteCheckout} className="space-y-4">
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-black/40 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`rounded-lg py-2 font-semibold ${
                    billingCycle === 'monthly' ? 'bg-indigo-500 text-white' : 'text-zinc-400'
                  }`}
                >
                  Lunar (${checkoutPlan.monthlyPrice} / lună)
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('yearly')}
                  className={`rounded-lg py-2 font-semibold ${
                    billingCycle === 'yearly' ? 'bg-indigo-500 text-white' : 'text-zinc-400'
                  }`}
                >
                  Anual (${checkoutPlan.yearlyTotal} / an)
                </button>
              </div>

              <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3.5 text-xs">
                <div className="flex justify-between text-zinc-300">
                  <span>Plan selectat:</span>
                  <strong>{checkoutPlan.name}</strong>
                </div>
                <div className="mt-1 flex justify-between border-t border-white/10 pt-1.5 text-sm font-bold text-white">
                  <span>Preț afișat:</span>
                  <span>
                    {billingCycle === 'yearly'
                      ? `$${checkoutPlan.yearlyTotal}.00 USD / an ($${checkoutPlan.monthlyPrice} × 12)`
                      : `$${checkoutPlan.monthlyPrice}.00 USD / lună`}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-3.5 text-xs leading-relaxed text-amber-100/85">
                Pentru siguranța ta, acest preview nu cere și nu stochează date de card. Conectarea unui procesator de plăți este necesară înainte de lansarea achizițiilor reale.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCheckoutPlan(null)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs text-zinc-300"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={processingPayment}
                  className="rounded-xl bg-indigo-500 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-400"
                >
                  {processingPayment
                    ? 'Se pregătește…'
                    : 'Generează cod demonstrativ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
