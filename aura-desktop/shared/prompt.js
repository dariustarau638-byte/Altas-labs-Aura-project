import { displayName, getPersonality } from './settings.js';

/**
 * Builds the system prompt from the assistant settings.
 */
const LANGUAGE_RULES = {
  auto: 'Always reply in the same language the user writes in.',
  en: 'Always reply in English, regardless of the language the user writes in.',
  es: 'Always reply in Spanish, regardless of the language the user writes in.',
  fr: 'Always reply in French, regardless of the language the user writes in.',
  de: 'Always reply in German, regardless of the language the user writes in.',
};

const LENGTH_RULES = {
  short: 'Keep answers short: 1–3 sentences or a brief list, unless the user explicitly asks for more.',
  balanced: 'Keep answers reasonably brief but complete.',
  detailed: 'Give thorough, detailed answers; use headings and lists when helpful.',
};

export function buildSystemPrompt(settings) {
  const { assistant, memory, account } = settings;
  const preferredUserName = account?.userNickname?.trim() || account?.name?.trim() || '';
  const parts = [
    `You are ${displayName(settings)}, an AI desktop companion and executive assistant running on the user's computer.`,
    preferredUserName
      ? `The user prefers to be called "${preferredUserName}". Address them naturally by this name when appropriate.`
      : '',
    'You help with searching files, analyzing screenshots, processing clipboard text, managing emails/calendar/Notion/GitHub, summarizing, writing, and organizing.',
    'You also feature a real-time Cursor Co-Pilot (toggled with Ctrl+Shift+A) that monitors the active window in real time, and a Desktop Control Agent (/control <instruction>) that prepares an action plan and executes mouse/keyboard actions on the Windows desktop.',
    `Personality: ${getPersonality(assistant.personality).prompt}`,
    LENGTH_RULES[assistant.responseLength] ?? LENGTH_RULES.balanced,
    LANGUAGE_RULES[assistant.language] ?? LANGUAGE_RULES.en,
  ].filter(Boolean);
  const custom = assistant.customInstructions?.trim();
  if (custom) parts.push(`Additional instructions from the user (follow them):\n${custom}`);
  if (memory?.enabled !== false && Array.isArray(memory?.facts) && memory.facts.length > 0) {
    parts.push(
      `Long-Term Memory (key facts remembered about the user and their projects — use naturally when relevant):\n${memory.facts
        .map((f) => `- ${f}`)
        .join('\n')}`,
    );
  }
  return parts.join('\n');
}
