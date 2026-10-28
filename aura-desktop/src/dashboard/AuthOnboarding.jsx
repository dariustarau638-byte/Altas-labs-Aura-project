import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MessageSquare,
  Palette,
  Sparkles,
  User,
  Volume2,
  Wand2,
} from 'lucide-react';
import {
  LANGUAGES,
  PERSONALITIES,
  RESPONSE_LENGTHS,
  THEMES,
  getPersonality,
  getTheme,
} from '../../shared/settings.js';
import Orb from '../widget/components/Orb.jsx';

const SOCIAL_PROVIDERS = [
  {
    id: 'google',
    label: 'Google',
    fullLabel: 'Continue with Google',
    domain: 'gmail.com',
    accent: 'hover:border-zinc-700 hover:bg-surface-2',
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
    fullLabel: 'Continue with iCloud',
    domain: 'icloud.com',
    accent: 'hover:border-zinc-700 hover:bg-surface-2',
    icon: (
      <svg viewBox="0 0 24 24" className="size-4 shrink-0 fill-white">
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
      </svg>
    ),
  },
  {
    id: 'yahoo',
    label: 'Yahoo',
    fullLabel: 'Continue with Yahoo',
    domain: 'yahoo.com',
    accent: 'hover:border-zinc-700 hover:bg-surface-2',
    icon: (
      <svg viewBox="0 0 24 24" className="size-4 shrink-0 fill-zinc-300">
        <path
          fill="currentColor"
          d="M3.2 4.5h4.1l3.4 6.7 3.4-6.7H18l-5.5 10.3v4.7H8.8v-4.7L3.2 4.5zm15.2 9.2h3.1l-.5 3.6h-2.1l-.5-3.6zm.2 4.6h2.7v2.5h-2.7v-2.5z"
        />
      </svg>
    ),
  },
];

const STEPS = [
  { id: 0, title: 'Authentication', subtitle: 'Sign in to Aura' },
  { id: 1, title: 'Identity', subtitle: 'How you want to be called' },
  { id: 2, title: 'Behavior', subtitle: 'Assistant personality' },
  { id: 3, title: 'Visual Theme', subtitle: 'Theme, colors & companion' },
];

export default function AuthOnboarding({ settings, onUpdate }) {
  const { account, assistant, appearance, behavior, voice } = settings;

  const [step, setStep] = useState(account?.authenticated ? 1 : 0);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'
  const [authProvider, setAuthProvider] = useState(account?.authProvider || 'email');
  const [email, setEmail] = useState(account?.email || '');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState(
    account?.name && account.name !== 'Aura User' ? account.name : '',
  );
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [socialModal, setSocialModal] = useState(null);
  const [socialEmailInput, setSocialEmailInput] = useState('');
  const [socialNameInput, setSocialNameInput] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Step 1
  const [nickname, setNickname] = useState(
    account?.userNickname || fullName.split(' ')[0] || '',
  );
  const [assistantName, setAssistantName] = useState(assistant?.name || 'Aura');
  const [language, setLanguage] = useState(assistant?.language || 'en');

  // Step 2
  const [personality, setPersonality] = useState(assistant?.personality || 'friendly');
  const [responseLength, setResponseLength] = useState(assistant?.responseLength || 'balanced');
  const [creativity, setCreativity] = useState(assistant?.creativity ?? 0.7);
  const [customInstructions, setCustomInstructions] = useState(assistant?.customInstructions || '');
  const [voiceEnabled, setVoiceEnabled] = useState(voice?.enabled ?? true);

  // Step 3
  const [themeId, setThemeId] = useState(appearance?.theme || 'obsidian');
  const [opacity, setOpacity] = useState(appearance?.opacity ?? 0.9);
  const [expandOnHover, setExpandOnHover] = useState(behavior?.expandOnHover ?? true);

  const [mousePos, setMousePos] = useState({ x: 50, y: 30 });

  const activeTheme = getTheme(themeId);
  const activePersonality = getPersonality(personality);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!email.trim() || !email.includes('@')) {
      setAuthError('Please enter a valid email address.');
      return;
    }
    if (password.length < 4) {
      setAuthError('Password must be at least 4 characters long.');
      return;
    }
    if (authMode === 'signup' && !fullName.trim()) {
      setAuthError('Please enter your name to create an account.');
      return;
    }

    setIsAuthenticating(true);
    await new Promise((r) => setTimeout(r, 650));
    const derivedName =
      fullName.trim() ||
      email
        .split('@')[0]
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());

    setFullName(derivedName);
    if (!nickname) setNickname(derivedName.split(' ')[0]);
    setAuthProvider('email');

    await onUpdate({
      account: {
        authenticated: true,
        authProvider: 'email',
        name: derivedName,
        email: email.trim(),
      },
    });
    setIsAuthenticating(false);
    setStep(1);
  };

  const openSocialFlow = (provider) => {
    setAuthError('');
    setSocialModal(provider);
    setSocialEmailInput(
      email && email.endsWith(`@${provider.domain}`) ? email : `user@${provider.domain}`,
    );
    setSocialNameInput(fullName || '');
  };

  const confirmSocialLogin = async (e) => {
    e.preventDefault();
    if (!socialModal) return;
    setIsAuthenticating(true);
    await new Promise((r) => setTimeout(r, 700));

    const finalEmail = socialEmailInput.trim() || `user@${socialModal.domain}`;
    const derivedName =
      socialNameInput.trim() ||
      finalEmail
        .split('@')[0]
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());

    setEmail(finalEmail);
    setFullName(derivedName);
    if (!nickname) setNickname(derivedName.split(' ')[0]);
    setAuthProvider(socialModal.id);

    await onUpdate({
      account: {
        authenticated: true,
        authProvider: socialModal.id,
        name: derivedName,
        email: finalEmail,
      },
      ...(socialModal.id === 'google'
        ? {
            connectors: {
              gmail: { connected: true, email: finalEmail, lastSync: new Date().toISOString() },
              gdrive: { connected: true, email: finalEmail, lastSync: new Date().toISOString() },
              gcalendar: { connected: true, email: finalEmail, lastSync: new Date().toISOString() },
            },
          }
        : {}),
    });

    setIsAuthenticating(false);
    setSocialModal(null);
    setStep(1);
  };

  const handleSelectThemeLive = (newThemeId) => {
    setThemeId(newThemeId);
    onUpdate({ appearance: { theme: newThemeId } });
  };

  const handleFinishOnboarding = async () => {
    const finalNickname = nickname.trim() || fullName.split(' ')[0] || 'Friend';
    const existingFacts = Array.isArray(settings.memory?.facts) ? settings.memory.facts : [];
    const nicknameFact = `User prefers to be addressed as "${finalNickname}"`;
    const mergedFacts = [
      nicknameFact,
      ...existingFacts.filter((f) => !f.startsWith('User prefers to be addressed')),
    ];

    await onUpdate({
      account: {
        authenticated: true,
        authProvider,
        onboardingCompleted: true,
        userNickname: finalNickname,
        name: fullName.trim() || finalNickname,
        email: email.trim() || account.email,
      },
      assistant: {
        name: assistantName.trim() || 'Aura',
        language,
        personality,
        responseLength,
        creativity,
        customInstructions,
      },
      appearance: {
        theme: themeId,
        opacity,
      },
      behavior: {
        expandOnHover,
      },
      voice: {
        enabled: voiceEnabled,
      },
      memory: {
        facts: mergedFacts,
      },
    });
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      className="relative flex h-full w-full items-center justify-center overflow-y-auto bg-canvas p-6 select-none"
    >
      <div className="relative z-10 grid w-full max-w-4xl grid-cols-1 overflow-hidden card border-line lg:grid-cols-12">
        {/* Left Column: Live Preview & Progress Stepper */}
        <div className="relative flex flex-col justify-between border-b border-line bg-surface-2/40 p-6 lg:col-span-5 lg:border-r lg:border-b-0">
          <div>
            {/* Brand & Interactive Orb */}
            <div className="flex items-center gap-3">
              <div className="cursor-pointer">
                <Orb size={38} online />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-semibold tracking-tight text-zinc-100">
                    {assistantName || 'Aura'}
                  </span>
                  <span className="badge badge-accent text-[10px]">
                    v2.0 AI
                  </span>
                </div>
                <p className="text-xs text-zinc-500">Desktop Companion &amp; Visual Co-Pilot</p>
              </div>
            </div>

            {/* Stepper */}
            <div className="mt-6 space-y-2">
              {STEPS.map((s) => {
                const isDone = step > s.id;
                const isCurrent = step === s.id;
                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-3 rounded-md border px-3 py-2 transition-colors ${
                      isCurrent
                        ? 'border-zinc-700 bg-surface-2 text-zinc-100'
                        : isDone
                          ? 'border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-300'
                          : 'border-line/40 bg-transparent text-zinc-500'
                    }`}
                  >
                    <div
                      className={`grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${
                        isCurrent
                          ? 'bg-zinc-100 text-zinc-950'
                          : isDone
                            ? 'bg-emerald-500 text-zinc-950'
                            : 'bg-surface-3 text-zinc-500 border border-line'
                      }`}
                    >
                      {isDone ? <Check size={11} /> : s.id + 1}
                    </div>
                    <div>
                      <div className="text-xs font-medium">{s.title}</div>
                      <div className="text-[11px] text-zinc-500">{s.subtitle}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Assistant Preview */}
          <div className="mt-6 card p-3.5 bg-surface border-line">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Orb size={20} online />
                <span className="text-xs font-semibold text-zinc-200">
                  {assistantName || 'Aura'} · {activePersonality.emoji} {activePersonality.label}
                </span>
              </div>
              <span className="badge text-[10px]">
                {activeTheme.label}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-zinc-300">
              "Hello{nickname ? `, ${nickname}` : ''}! I am{' '}
              <strong className="text-zinc-100">{assistantName || 'Aura'}</strong>.{' '}
              {activePersonality.sample}"
            </p>
          </div>
        </div>

        {/* Right Column: Step Content */}
        <div className="flex flex-col justify-between p-6 sm:p-7 lg:col-span-7">
          <AnimatePresence mode="wait">
            {/* STEP 0: LOGIN / SIGN UP */}
            {step === 0 && (
              <motion.div
                key="step-auth"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h1 className="text-[18px] font-semibold tracking-tight text-zinc-50">
                      {authMode === 'login' ? 'Welcome back to Aura!' : 'Create your Aura account'}
                    </h1>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      Connect quickly with Google, iCloud, Yahoo, or your email address.
                    </p>
                  </div>

                  {/* Toggle */}
                  <div className="segmented">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('login');
                        setAuthError('');
                      }}
                      data-active={authMode === 'login'}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('signup');
                        setAuthError('');
                      }}
                      data-active={authMode === 'signup'}
                    >
                      Sign Up
                    </button>
                  </div>
                </div>

                {/* Social Login Buttons */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {SOCIAL_PROVIDERS.map((prov) => (
                    <button
                      key={prov.id}
                      type="button"
                      onClick={() => openSocialFlow(prov)}
                      className={`btn btn-sm w-full h-9 justify-center gap-2 text-xs font-medium text-zinc-200 ${prov.accent}`}
                    >
                      {prov.icon}
                      <span>{prov.fullLabel}</span>
                    </button>
                  ))}
                </div>

                <div className="relative flex items-center py-1">
                  <div className="flex-grow border-t border-line" />
                  <span className="mx-3 shrink-0 text-[10.5px] uppercase tracking-wider text-zinc-500">
                    or with email and password
                  </span>
                  <div className="flex-grow border-t border-line" />
                </div>

                <form onSubmit={handleEmailAuth} className="space-y-3">
                  {authMode === 'signup' && (
                    <label className="block">
                      <span className="field-label">Your Name</span>
                      <div className="relative">
                        <User
                          size={14}
                          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-500"
                        />
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Alex Miller"
                          className="input pl-9 text-xs"
                        />
                      </div>
                    </label>
                  )}

                  <label className="block">
                    <span className="field-label">Email Address</span>
                    <div className="relative">
                      <Mail
                        size={14}
                        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-500"
                      />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@gmail.com / @icloud.com / @yahoo.com"
                        className="input pl-9 text-xs"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="field-label">Password</span>
                    <div className="relative">
                      <Lock
                        size={14}
                        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-500"
                      />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="input pr-9 pl-9 text-xs font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </label>

                  {authError && (
                    <div className="rounded-md border border-red-500/25 bg-red-500/[0.08] px-3 py-2 text-xs text-red-300">
                      {authError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isAuthenticating}
                    className="btn btn-primary w-full h-9 text-xs"
                  >
                    <span>
                      {isAuthenticating
                        ? 'Connecting account…'
                        : authMode === 'login'
                          ? 'Sign In & Configure Aura'
                          : 'Create Account & Start Setup'}
                    </span>
                    <ArrowRight size={14} />
                  </button>
                </form>
              </motion.div>
            )}

            {/* STEP 1: IDENTITY */}
            {step === 1 && (
              <motion.div
                key="step-identity"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                <div>
                  <span className="badge badge-accent text-[11px] mb-2">
                    <Sparkles size={11} /> Step 1 of 3 · Identity
                  </span>
                  <h2 className="mt-1 text-[18px] font-semibold tracking-tight text-zinc-50">
                    What should Aura call you?
                  </h2>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Aura will adapt greetings, memory, and interactions using your preferred name or nickname.
                  </p>
                </div>

                <div className="space-y-3.5">
                  <label className="block">
                    <span className="field-label">
                      How should the assistant address you? (First name or nickname)
                    </span>
                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="e.g. Alex, Sam, Captain, Boss..."
                      className="input text-xs"
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-zinc-500">Quick suggestions:</span>
                      {[
                        fullName.split(' ')[0] || 'Alex',
                        'Boss',
                        'Founder',
                        'Captain',
                        'Friend',
                      ]
                        .filter((v, idx, arr) => v && arr.indexOf(v) === idx)
                        .map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => setNickname(sug)}
                            className={`badge text-[11px] cursor-pointer transition-colors ${
                              nickname === sug
                                ? 'badge-accent'
                                : 'hover:text-zinc-100 hover:border-zinc-700'
                            }`}
                          >
                            {sug}
                          </button>
                        ))}
                    </div>
                  </label>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="field-label">
                        Your Assistant's Name
                      </span>
                      <input
                        type="text"
                        value={assistantName}
                        onChange={(e) => setAssistantName(e.target.value)}
                        placeholder="Aura"
                        className="input text-xs"
                      />
                    </label>

                    <label className="block">
                      <span className="field-label">
                        Conversation Language
                      </span>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="input text-xs"
                      >
                        {LANGUAGES.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setStep(0)}
                    className="btn btn-ghost btn-sm"
                  >
                    <ArrowLeft size={13} /> Back to Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="btn btn-primary btn-sm"
                  >
                    <span>Continue to Behavior</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: BEHAVIOR */}
            {step === 2 && (
              <motion.div
                key="step-behavior"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.15 }}
                className="space-y-3.5"
              >
                <div>
                  <span className="badge badge-accent text-[11px] mb-2">
                    <Wand2 size={11} /> Step 2 of 3 · Behavior &amp; Style
                  </span>
                  <h2 className="mt-1 text-[18px] font-semibold tracking-tight text-zinc-50">
                    How would you like {assistantName || 'Aura'} to behave?
                  </h2>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Choose the tone, response length, and creativity level.
                  </p>
                </div>

                {/* Personality Cards */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {PERSONALITIES.map((p) => {
                    const active = personality === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPersonality(p.id)}
                        className={`flex items-start gap-2.5 rounded-md border p-2.5 text-left transition-colors ${
                          active
                            ? 'border-zinc-700 bg-surface-2 text-zinc-100'
                            : 'border-line bg-surface text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        <span className="text-base shrink-0">{p.emoji}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-zinc-100">{p.label}</div>
                          <div className="text-[11px] text-zinc-500 leading-snug">{p.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Length & Voice */}
                <div className="space-y-2.5">
                  <div className="card p-3 bg-surface flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-300 shrink-0">
                      <MessageSquare size={13} className="text-zinc-400" /> Response Length
                    </div>
                    <div className="segmented">
                      {RESPONSE_LENGTHS.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setResponseLength(r.id)}
                          data-active={responseLength === r.id}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="card p-3 bg-surface">
                    <div className="mb-2 flex items-center justify-between text-xs font-medium text-zinc-300">
                      <span className="inline-flex items-center gap-1.5">
                        <Volume2 size={13} className="text-zinc-400" /> Voice &amp; Creativity (
                        {creativity.toFixed(1)})
                      </span>
                      <button
                        type="button"
                        onClick={() => setVoiceEnabled((v) => !v)}
                        className={`badge text-[10px] ${
                          voiceEnabled
                            ? 'badge-success'
                            : ''
                        }`}
                      >
                        {voiceEnabled ? 'Voice ON' : 'Voice OFF'}
                      </button>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.4"
                      step="0.1"
                      value={creativity}
                      onChange={(e) => setCreativity(parseFloat(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>
                </div>

                <label className="block">
                  <span className="field-label">
                    Special guidelines or instructions (optional)
                  </span>
                  <input
                    type="text"
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="e.g. Always provide concise code examples in TypeScript and keep answers direct."
                    className="input text-xs"
                  />
                </label>

                <div className="flex items-center justify-between pt-2 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="btn btn-ghost btn-sm"
                  >
                    <ArrowLeft size={13} /> Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="btn btn-primary btn-sm"
                  >
                    <span>Continue to Visual Theme</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: APPEARANCE */}
            {step === 3 && (
              <motion.div
                key="step-appearance"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                <div>
                  <span className="badge badge-accent text-[11px] mb-2">
                    <Palette size={11} /> Step 3 of 3 · Design &amp; Appearance
                  </span>
                  <h2 className="mt-1 text-[18px] font-semibold tracking-tight text-zinc-50">
                    How would you like {assistantName || 'Aura'} to look on desktop?
                  </h2>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Choose the Orb color palette and floating companion window transparency.
                  </p>
                </div>

                {/* Theme Selector */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {THEMES.map((t) => {
                    const selected = themeId === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleSelectThemeLive(t.id)}
                        className={`flex items-center gap-2.5 rounded-md border p-2 text-left transition-colors ${
                          selected
                            ? 'border-zinc-700 bg-surface-2 text-zinc-100'
                            : 'border-line bg-surface text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        <span
                          className="size-5 shrink-0 rounded-full border border-white/10"
                          style={{
                            background: `linear-gradient(135deg, ${t.orb[0]}, ${t.orb[1]})`,
                          }}
                        />
                        <div className="min-w-0">
                          <div className="truncate text-xs font-medium text-zinc-200">{t.label}</div>
                          <div className="text-[10px] text-zinc-500">
                            {selected ? 'Active Now' : 'Select'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Opacity & Expand on hover */}
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div className="card p-3 bg-surface">
                    <div className="mb-2 flex items-center justify-between text-xs text-zinc-300">
                      <span>Glass Transparency</span>
                      <span className="font-mono text-zinc-200 tabular-nums">{Math.round(opacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.65"
                      max="1"
                      step="0.05"
                      value={opacity}
                      onChange={(e) => setOpacity(parseFloat(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  <div className="card p-3 bg-surface flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-zinc-200">Expand on Hover</div>
                      <div className="text-[11px] text-zinc-500">
                        Opens when cursor approaches the notch or orb
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setExpandOnHover((v) => !v)}
                      className={`badge text-xs cursor-pointer ${
                        expandOnHover
                          ? 'badge-success'
                          : ''
                      }`}
                    >
                      {expandOnHover ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="btn btn-ghost btn-sm"
                  >
                    <ArrowLeft size={13} /> Back
                  </button>
                  <button
                    type="button"
                    onClick={handleFinishOnboarding}
                    className="btn btn-primary btn-sm"
                  >
                    <Sparkles size={13} />
                    <span>Complete &amp; Launch {assistantName || 'Aura'}</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Interactive OAuth Modal */}
      <AnimatePresence>
        {socialModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="card w-full max-w-md border-line-strong p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-line bg-surface-2 text-zinc-300">
                  {socialModal.icon}
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-zinc-100">
                    Sign in with {socialModal.label}
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Select or enter your {socialModal.label} credentials for Aura Desktop
                  </p>
                </div>
              </div>

              <form onSubmit={confirmSocialLogin} className="space-y-3">
                <label className="block">
                  <span className="field-label">
                    Name associated with {socialModal.label}
                  </span>
                  <input
                    type="text"
                    required
                    value={socialNameInput}
                    onChange={(e) => setSocialNameInput(e.target.value)}
                    placeholder="e.g. Alex Miller"
                    className="input text-xs"
                  />
                </label>

                <label className="block">
                  <span className="field-label">
                    {socialModal.label} Address (@{socialModal.domain})
                  </span>
                  <input
                    type="email"
                    required
                    value={socialEmailInput}
                    onChange={(e) => setSocialEmailInput(e.target.value)}
                    placeholder={`user@${socialModal.domain}`}
                    className="input text-xs"
                  />
                </label>

                <div className="flex justify-end gap-2 pt-2 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setSocialModal(null)}
                    className="btn btn-ghost btn-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAuthenticating}
                    className="btn btn-primary btn-sm flex items-center gap-1.5"
                  >
                    {socialModal.icon}
                    <span>
                      {isAuthenticating
                        ? 'Authorizing…'
                        : `Authorize ${socialModal.label} Account`}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
