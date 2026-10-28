/**
 * Settings Schema – Single source of truth used by both the main process (validation,
 * persistence) and the UI (Dashboard, widget, and browser mock).
 */

export const MASTER_LICENSE_KEY = 'K9M4X-7Q2WP-V8R3N-J6T5C-B2H8F';

export const THEMES = [
  {
    id: 'obsidian',
    label: 'Obsidian Emerald',
    accent: { 300: '#6ee7b7', 400: '#34d399', 500: '#10b981', 600: '#059669' },
    orb: ['#10b981', '#3f3f46', '#34d399', '#18181b'],
    glass: ['18 18 20', '12 12 14'],
  },
  {
    id: 'graphite',
    label: 'Monochrome Zinc',
    accent: { 300: '#f4f4f5', 400: '#d4d4d8', 500: '#a1a1aa', 600: '#71717a' },
    orb: ['#d4d4d8', '#3f3f46', '#e4e4e7', '#18181b'],
    glass: ['18 18 20', '12 12 14'],
  },
  {
    id: 'ocean',
    label: 'Cobalt Steel',
    accent: { 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb' },
    orb: ['#3b82f6', '#3f3f46', '#60a5fa', '#18181b'],
    glass: ['18 18 20', '12 12 14'],
  },
  {
    id: 'forest',
    label: 'Signal Teal',
    accent: { 300: '#5eead4', 400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488' },
    orb: ['#14b8a6', '#3f3f46', '#2dd4bf', '#18181b'],
    glass: ['18 18 20', '12 12 14'],
  },
  {
    id: 'aurora',
    label: 'Crimson Rose',
    accent: { 300: '#fda4af', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48' },
    orb: ['#f43f5e', '#3f3f46', '#fb7185', '#18181b'],
    glass: ['18 18 20', '12 12 14'],
  },
  {
    id: 'sunset',
    label: 'Copper Amber',
    accent: { 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706' },
    orb: ['#f59e0b', '#3f3f46', '#fbbf24', '#18181b'],
    glass: ['18 18 20', '12 12 14'],
  },
];

export const PERSONALITIES = [
  {
    id: 'friendly',
    label: 'Friendly',
    emoji: '😊',
    desc: 'Warm, natural, and encouraging.',
    prompt: 'Be warm, friendly and encouraging. Use a natural, conversational tone.',
    sample: 'Hi! Sure, I can help you with that right away. Let me know what you need and we will work through it together.',
  },
  {
    id: 'professional',
    label: 'Professional',
    emoji: '💼',
    desc: 'Precise, polite, and executive.',
    prompt: 'Be professional, precise and polite. Use a formal, well-structured tone without slang.',
    sample: 'Hello. I am ready to assist you with your report. Please specify the topic and target audience.',
  },
  {
    id: 'concise',
    label: 'Concise',
    emoji: '⚡',
    desc: 'Direct to the point, zero fluff.',
    prompt: 'Be extremely concise. Answer directly, with no preamble, filler or repetition.',
    sample: 'Understood. What is the scope and deadline?',
  },
  {
    id: 'creative',
    label: 'Creative',
    emoji: '✨',
    desc: 'Original ideas and fresh perspectives.',
    prompt: 'Be creative and insightful. Offer original ideas, vivid metaphors and unexpected alternatives.',
    sample: 'We can structure this in three compelling acts: current context, strategic opportunity, and execution plan.',
  },
  {
    id: 'mentor',
    label: 'Mentor',
    emoji: '🧭',
    desc: 'Patient, step-by-step guidance.',
    prompt: 'Act as a patient mentor. Explain step by step, give context and check understanding.',
    sample: 'Let us take this step by step: first we will outline the objective, then organize each section clearly.',
  },
];

export const LANGUAGES = [
  { id: 'auto', label: 'Automatic' },
  { id: 'en', label: 'English' },
  { id: 'es', label: 'Spanish' },
  { id: 'fr', label: 'French' },
  { id: 'de', label: 'German' },
];

export const RESPONSE_LENGTHS = [
  { id: 'short', label: 'Concise' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'detailed', label: 'Detailed' },
];

export const AI_PROVIDERS = [
  {
    id: 'ollama',
    label: 'Ollama (Local on PC)',
    shortLabel: 'Local',
    badge: 'Local',
    desc: 'Run AI models directly on your CPU/GPU with zero cost, complete privacy, and no internet required.',
    description: 'Run AI models directly on your CPU/GPU with zero cost, complete privacy, and no internet required.',
    models: [],
  },
  {
    id: 'openai',
    label: 'OpenAI (ChatGPT)',
    shortLabel: 'ChatGPT',
    badge: 'Cloud',
    desc: 'Connect GPT-4o, GPT-4o mini, or o3-mini via your OpenAI API key.',
    description: 'Use GPT-4o and GPT-4o mini via your OpenAI API key (ideal for lower-spec PCs).',
    docsUrl: 'https://platform.openai.com/api-keys',
    models: [
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast & Cost-Effective)' },
      { id: 'gpt-4o', label: 'GPT-4o (Multimodal Flagship)' },
      { id: 'o3-mini', label: 'o3-mini (Advanced Reasoning)' },
    ],
  },
  {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    shortLabel: 'Claude',
    badge: 'Cloud',
    desc: 'Connect Claude Sonnet 4 or Claude 3.5 Haiku via your Anthropic API key.',
    description: 'Connect Claude Sonnet 4 or Claude 3.5 Haiku for advanced writing and coding.',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    models: [
      { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (Recommended)' },
      { id: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku (Ultra-Fast)' },
    ],
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    shortLabel: 'Gemini',
    badge: 'Cloud',
    desc: 'Run Gemini 4 Argon, Gemini 3.8 Pro, or Gemini 3.8 Flash via Google AI Studio.',
    description: 'Run Gemini 4 Argon (1M tokens), Gemini 3.8 Pro, or Gemini 3.8 Flash via Google AI Studio.',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    models: [
      { id: 'gemini-4-argon', label: 'Gemini 4 Argon (1M Context Flagship · Code & Reasoning)' },
      { id: 'gemini-3.8-pro', label: 'Gemini 3.8 Pro (Deep Multimodal Reasoning)' },
      { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash (High Speed · Agentic & Vision)' },
      { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite (Maximum Speed · 1M)' },
      { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite (Lightweight)' },
    ],
  },
];

export const PLANS = [
  {
    id: 'free',
    name: 'Free Trial (7 Days)',
    badge: '1-Week Trial',
    trialDays: 7,
    monthlyPrice: 0,
    yearlyPrice: 0,
    yearlyFullPrice: 0,
    yearlyTotal: 0,
    yearlySavings: 0,
    maxDevices: 1,
    desc: 'Try Aura free for 7 days. Upgrade anytime to Pro ($20/mo or $240/yr) or Max / Ultra ($50/mo or $600/yr).',
    features: [
      'Full access for 7 days (1-week trial period)',
      'Conversations with local models (Ollama) or your own Cloud keys',
      'Minimalist floating top-notch companion with adaptive expansion',
      'Basic local file search on 1 PC',
    ],
  },
  {
    id: 'pro',
    name: 'Aura Pro',
    badge: 'Most Popular',
    popular: true,
    monthlyPrice: 20, // $20 / month
    yearlyPrice: 240, // $240 / year ($20 x 12 months)
    yearlyFullPrice: 240,
    yearlyTotal: 240,
    yearlySavings: 0,
    maxDevices: 3,
    desc: 'For power users and professionals: full Cloud AI integrations, Gmail, Google Drive, Vision AI, and document intelligence.',
    features: [
      'Permanent access with continuous updates',
      'Integrated Google Gmail, Drive, Calendar, Notion & GitHub connectors',
      'Seamless switching between Local (Ollama) ↔ Cloud (ChatGPT, Claude, Gemini)',
      'SSD Visual Recall (/timeline) & Local PC Actions (/action)',
      'Voice dictation & license for up to 3 devices (PC / Laptop)',
    ],
  },
  {
    id: 'team',
    name: 'Aura Max / Ultra',
    badge: 'Maximum Power',
    monthlyPrice: 50, // $50 / month
    yearlyPrice: 600, // $600 / year ($50 x 12 months)
    yearlyFullPrice: 600,
    yearlyTotal: 600,
    yearlySavings: 0,
    maxDevices: 10,
    desc: 'The complete Aura experience: real-time Desktop Control (Co-Pilot), unlimited local automations, and multi-cloud fallback routing.',
    features: [
      'Everything in Aura Pro at maximum capacity with zero limits',
      'Cursor Co-Pilot (Ctrl+Shift+A) & real-time Desktop Control (/control)',
      'Native Windows automation and on-screen visual reasoning',
      'Shared AI server clusters + multi-cloud fallback routing',
      'Up to 10 authorized machines + priority VIP technical support',
    ],
  },
];

export const DEFAULT_SETTINGS = {
  version: 1,
  appearance: {
    theme: 'obsidian',
    opacity: 0.9,
  },
  assistant: {
    name: 'Aura',
    personality: 'professional',
    language: 'en',
    responseLength: 'balanced',
    creativity: 0.7,
    customInstructions: '',
  },
  voice: {
    enabled: true,
    autoSpeak: false,
    voiceURI: '',
    rate: 1.0,
    pitch: 1.0,
    volume: 0.9,
  },
  behavior: {
    expandOnHover: true,
    hoverDelay: 180,
    collapseDelay: 650,
  },
  ai: {
    provider: 'ollama', // 'ollama' | 'openai' | 'anthropic' | 'gemini'
    autoFallbackToCloud: true,
    model: '',
    openaiKey: '',
    openaiModel: 'gpt-4o-mini',
    anthropicKey: '',
    anthropicModel: 'claude-sonnet-4-20250514',
    geminiKey: '',
    geminiModel: 'gemini-4-argon',
  },
  connectors: {
    gmail: {
      connected: false,
      email: '',
      accessToken: '',
      mode: 'demo',
      lastSync: '',
    },
    gdrive: {
      connected: false,
      email: '',
      accessToken: '',
      mode: 'demo',
      lastSync: '',
    },
    gcalendar: {
      connected: false,
      email: '',
      accessToken: '',
      mode: 'demo',
      lastSync: '',
    },
    notion: {
      connected: false,
      workspace: '',
      accessToken: '',
      mode: 'demo',
      lastSync: '',
    },
    github: {
      connected: false,
      username: '',
      accessToken: '',
      mode: 'demo',
      lastSync: '',
    },
  },
  memory: {
    enabled: true,
    autoSaveChats: true,
    facts: [
      'Founder and creator of the Aura AI Desktop Companion',
      'Prefers clear, structured, and action-oriented responses',
    ],
  },
  privacy: {
    allowFileAccess: true,
    indexContent: true,
    blockSensitiveFiles: true,
    localOnlyMode: false,
    allowedRoots: [],
    excludedPatterns: '.env, .git, node_modules, *.pem, *.key, id_rsa',
  },
  account: {
    authenticated: false,
    authProvider: 'email', // 'email' | 'google' | 'icloud' | 'yahoo'
    onboardingCompleted: false,
    userNickname: '',
    name: 'Aura User',
    email: '',
    plan: 'free',
    billingCycle: 'yearly',
    licenseKey: '',
    isMasterKey: false,
    licenseStatus: 'trialing',
    trialEndsAt: '2026-10-24',
    renewsAt: '2027-10-17',
    cardLast4: '',
    cardBrand: '',
    cardExp: '',
    cardholderName: '',
    invoices: [],
    consumedKeys: [],
  },
  widgetState: {
    x: null,
    y: null,
    anchor: { h: 'center', v: 'top' },
    companionStyle: 'notch',
  },
};

// ---------------- Validation ----------------

const ENUMS = {
  'appearance.theme': THEMES.map((t) => t.id),
  'assistant.personality': PERSONALITIES.map((p) => p.id),
  'assistant.language': LANGUAGES.map((l) => l.id),
  'assistant.responseLength': RESPONSE_LENGTHS.map((r) => r.id),
  'ai.provider': AI_PROVIDERS.map((p) => p.id),
  'ai.geminiModel': AI_PROVIDERS.find((p) => p.id === 'gemini').models.map((m) => m.id),
  'connectors.gmail.mode': ['demo', 'oauth'],
  'connectors.gdrive.mode': ['demo', 'oauth'],
  'connectors.gcalendar.mode': ['demo', 'oauth'],
  'connectors.notion.mode': ['demo', 'oauth'],
  'connectors.github.mode': ['demo', 'oauth'],
  'account.authProvider': ['email', 'google', 'icloud', 'yahoo'],
  'account.plan': PLANS.map((p) => p.id),
  'account.billingCycle': ['monthly', 'yearly'],
  'account.licenseStatus': ['active', 'trialing', 'past_due', 'canceled'],
  'widgetState.anchor.h': ['left', 'right'],
  'widgetState.anchor.v': ['top', 'bottom'],
  'widgetState.companionStyle': ['orb', 'pet', 'notch'],
};
const RANGES = {
  'appearance.opacity': [0.6, 1],
  'assistant.creativity': [0, 1.5],
  'voice.rate': [0.5, 2.0],
  'voice.pitch': [0.5, 1.5],
  'voice.volume': [0.1, 1.0],
  'behavior.hoverDelay': [0, 1500],
  'behavior.collapseDelay': [150, 5000],
};
const MAX_LENGTH = {
  'assistant.name': 24,
  'assistant.customInstructions': 2000,
  'voice.voiceURI': 250,
  'ai.model': 200,
  'ai.openaiKey': 300,
  'ai.openaiModel': 100,
  'ai.anthropicKey': 300,
  'ai.anthropicModel': 100,
  'ai.geminiKey': 300,
  'ai.geminiModel': 100,
  'connectors.gmail.email': 120,
  'connectors.gmail.accessToken': 2048,
  'connectors.gmail.lastSync': 64,
  'connectors.gdrive.email': 120,
  'connectors.gdrive.accessToken': 2048,
  'connectors.gdrive.lastSync': 64,
  'connectors.gcalendar.email': 120,
  'connectors.gcalendar.accessToken': 2048,
  'connectors.gcalendar.lastSync': 64,
  'connectors.notion.workspace': 120,
  'connectors.notion.accessToken': 2048,
  'connectors.notion.lastSync': 64,
  'connectors.github.username': 120,
  'connectors.github.accessToken': 2048,
  'connectors.github.lastSync': 64,
  'privacy.excludedPatterns': 500,
  'account.userNickname': 50,
  'account.name': 80,
  'account.email': 120,
  'account.licenseKey': 64,
  'account.trialEndsAt': 32,
  'account.renewsAt': 32,
  'account.cardLast4': 4,
  'account.cardBrand': 24,
  'account.cardExp': 10,
  'account.cardholderName': 100,
};
const NULLABLE_INT = new Set(['widgetState.x', 'widgetState.y']);
const STRING_ARRAY_PATHS = new Set([
  'privacy.allowedRoots',
  'account.consumedKeys',
  'memory.facts',
]);
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function sanitizeValue(path, value, fallback) {
  if (path === 'account.invoices') {
    return Array.isArray(value) ? value.slice(0, 50) : fallback;
  }
  if (STRING_ARRAY_PATHS.has(path)) {
    if (!Array.isArray(value)) return fallback;
    return value
      .filter((item) => typeof item === 'string' && item.trim().length > 0)
      .map((item) => item.trim().slice(0, 400))
      .slice(0, 200);
  }
  if (NULLABLE_INT.has(path)) return Number.isFinite(value) ? Math.round(value) : null;
  if (ENUMS[path]) return ENUMS[path].includes(value) ? value : fallback;
  if (typeof fallback === 'boolean') return typeof value === 'boolean' ? value : fallback;
  if (typeof fallback === 'number') {
    if (!Number.isFinite(value)) return fallback;
    const [min, max] = RANGES[path] ?? [-Infinity, Infinity];
    return Math.min(max, Math.max(min, value));
  }
  if (typeof fallback === 'string') {
    return typeof value === 'string' ? value.slice(0, MAX_LENGTH[path] ?? 500) : fallback;
  }
  return fallback;
}

export function sanitizeSettings(input, defaults = DEFAULT_SETTINGS, prefix = '') {
  const out = {};
  for (const [key, fallback] of Object.entries(defaults)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const value = input?.[key];
    out[key] = isPlainObject(fallback)
      ? sanitizeSettings(isPlainObject(value) ? value : {}, fallback, path)
      : sanitizeValue(path, value, fallback);
  }
  return out;
}

export function deepMerge(base, patch) {
  if (!isPlainObject(base) || !isPlainObject(patch)) return patch === undefined ? base : patch;
  const out = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (UNSAFE_KEYS.has(key)) continue;
    out[key] = isPlainObject(value) && isPlainObject(base[key]) ? deepMerge(base[key], value) : value;
  }
  return out;
}

export const getTheme = (id) => THEMES.find((t) => t.id === id) ?? THEMES[0];
export const getPersonality = (id) => PERSONALITIES.find((p) => p.id === id) ?? PERSONALITIES[0];
export const getPlan = (id) => PLANS.find((p) => p.id === id) ?? PLANS[0];
export const getAiProvider = (id) => AI_PROVIDERS.find((p) => p.id === id) ?? AI_PROVIDERS[0];
export const displayName = (settings) => settings?.assistant?.name?.trim() || DEFAULT_SETTINGS.assistant.name;
