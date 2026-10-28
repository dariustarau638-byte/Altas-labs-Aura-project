import { clipboard, desktopCapturer, screen } from 'electron';
import { getSettings, updateSettings } from './settingsStore.js';

/**
 * External connectors for Aura:
 * 1. Google Gmail (`/gmail`)
 * 2. Google Drive (`/drive`)
 * 3. Google Calendar (`/calendar`)
 * 4. Notion (`/notion`)
 * 5. GitHub (`/github`)
 * 6. Screen Capture & Vision AI (`/screen`)
 * 7. Smart Clipboard Assistant (`/clipboard`)
 */

const DEMO_GMAIL_MESSAGES = [
  {
    id: 'msg-pitch-seed',
    from: 'Andrew Collins (Venture Partners) <andrew@vp-fund.com>',
    subject: 'Follow-up on Seed Investment — Aura AI Desktop',
    date: 'Today, 10:15',
    unread: true,
    snippet:
      'Hi! We tested the Aura prototype and loved how smoothly the companion opens. Can we schedule a call Thursday at 3 PM for the term sheet?',
    body: `Hi!\n\nWe tested the Aura prototype on our laptops and were thoroughly impressed by the responsive floating widget, especially the hybrid architecture (Local Ollama + Cloud fallback for machines without dedicated GPUs).\n\nWe would like to discuss next steps for the $500,000 Seed financing round:\n1. Pricing structure for Aura Pro ($15/month) and Aura Ultra ($50/month);\n2. Roadmap for Google Workspace, Notion, and GitHub connectors;\n3. Availability for a call this Thursday at 3:00 PM.\n\nBest regards,\nAndrew Collins — Partner @ Venture Partners`,
  },
  {
    id: 'msg-client-feedback',
    from: 'Elena Daniels <elena@techstudio.com>',
    subject: 'Aura Ultra licenses for Product Team (10 seats)',
    date: 'Yesterday, 18:40',
    unread: true,
    snippet:
      'Hello! We would like an annual quote for 10 Aura Ultra licenses ($480/yr). Fast local file search and Google Drive sync are essential for our workflow.',
    body: `Hello,\n\nWe are a team of 10 designers and engineers looking for a unified desktop AI assistant to rapidly inspect local files, Notion, GitHub, and Google Drive without context-switching.\n\nCould you send us an invoice quote for 10 annual Aura Ultra licenses and billing details?\n\nThanks,\nElena Daniels`,
  },
  {
    id: 'msg-stripe-payout',
    from: 'Stripe Billing <notifications@stripe.com>',
    subject: 'New subscriber summary for Aura Pro & Ultra — Current Week',
    date: 'Oct 15, 09:00',
    unread: false,
    snippet:
      'You have 34 new subscribers on Aura Pro and Aura Ultra plans. Updated Monthly Recurring Revenue (MRR): +$4,820.',
    body: `Automated Stripe Billing Report:\n- New Aura Pro subscribers ($15/mo): 26\n- New Aura Ultra subscribers ($50/mo): 8\n- Total MRR: $6,450\n- Retention rate after 7-day trial: 94.2%`,
  },
];

const DEMO_GDRIVE_FILES = [
  {
    id: 'gdrive-pitch-deck',
    name: 'Aura-AI-Pitch-Deck-2026.pptx',
    typeLabel: 'Google Slides',
    mimeType: 'application/vnd.google-apps.presentation',
    modifiedTime: 'Today, 11:30',
    webViewLink: 'https://drive.google.com',
    summary:
      'Seed Investor presentation: Problem, hybrid Ollama + Cloud architecture (OpenAI, Claude, Gemini), productivity connectors, and Pro ($15/mo) / Ultra ($50/mo) tiers.',
  },
  {
    id: 'gdrive-okrs-q4',
    name: 'Q4-Product-Roadmap-Startup.docx',
    typeLabel: 'Google Docs',
    mimeType: 'application/vnd.google-apps.document',
    modifiedTime: 'Yesterday, 16:20',
    webViewLink: 'https://drive.google.com',
    summary:
      'Aura AI Q4 OKRs: 1. Windows installer release; 2. Vision AI (/screen) & Smart Clipboard (/clipboard); 3. Google Calendar, Notion, and GitHub connectors; 4. 1,000 active Pro & Ultra seats.',
  },
  {
    id: 'gdrive-financials',
    name: 'Financial-Model-ARR-2026-2027.xlsx',
    typeLabel: 'Google Sheets',
    mimeType: 'application/vnd.google-apps.spreadsheet',
    modifiedTime: 'Oct 14, 2026',
    webViewLink: 'https://drive.google.com',
    summary:
      'SaaS financial model: 7-day Free Trial (28% conversion), Aura Pro ($15/mo or $144/yr), Aura Ultra ($50/mo or $480/yr). Estimated gross margin: 89%.',
  },
];

const DEMO_CALENDAR_EVENTS = [
  {
    id: 'cal-1',
    title: 'Product Sync — Aura Ultra & Vision AI Launch',
    time: 'Today · 11:00 AM – 11:45 AM',
    attendees: 'Core Team (4 attendees)',
    location: 'Google Meet',
    description:
      'Review final features prior to public rollout: Vision AI Screen Capture (/screen), Clipboard Assistant (/clipboard), and new Pro/Ultra tiers.',
  },
  {
    id: 'cal-2',
    title: 'Seed Term Sheet Discussion — Venture Partners',
    time: 'Today · 3:00 PM – 4:00 PM',
    attendees: 'Andrew Collins, Aura Founder',
    location: 'Zoom / Boardroom',
    description:
      'Presenting conversion metrics from 7-day trial to Aura Pro ($144/yr) and Aura Ultra ($480/yr) with live connector demos.',
  },
  {
    id: 'cal-3',
    title: 'Enterprise Onboarding — TechStudio (10 Ultra seats)',
    time: 'Tomorrow · 10:30 AM – 11:15 AM',
    attendees: 'Elena Daniels + TechStudio team',
    location: 'Google Meet',
    description:
      'Setting up Cloud keys (Claude Sonnet 4 + Gemini 2.5 Flash) and syncing team Notion workspace.',
  },
];

const DEMO_NOTION_PAGES = [
  {
    id: 'notion-1',
    title: 'Aura 2.0 Product Roadmap — Q4 2026',
    workspace: 'Aura HQ Workspace',
    updatedAt: 'Updated 40 min ago',
    url: 'https://www.notion.so',
    content:
      'Current priorities:\n- [x] Dynamic notch with smooth expansion\n- [x] Hybrid Cloud AI (ChatGPT, Claude, Gemini) + Local Ollama\n- [x] Screen Capture Vision AI (/screen) + Smart Clipboard (/clipboard)\n- [ ] Product Hunt & Hacker News release',
  },
  {
    id: 'notion-2',
    title: 'Architecture & Security — Product Licensing System',
    workspace: 'Aura HQ Workspace',
    updatedAt: 'Updated yesterday',
    url: 'https://www.notion.so',
    content:
      'Licensing specifications:\n- Master Founder Key (AURA-MASTER-FOUNDER-9999) grants permanent unlocked access across all tiers.\n- Customer product keys (AURA-PRO-XXXX-XXXX & AURA-ULTRA-XXXX-XXXX) are single-activation keys verified against the local registry.',
  },
  {
    id: 'notion-3',
    title: 'B2B Sales Playbook & Outreach Templates',
    workspace: 'Aura HQ Workspace',
    updatedAt: 'Updated 3 days ago',
    url: 'https://www.notion.so',
    content:
      'Email reply templates for leads evaluating the 7-day trial. Core value proposition: lightning fast desktop performance even on lightweight laptops via Cloud AI.',
  },
];

const DEMO_GITHUB_ITEMS = [
  {
    id: 'gh-1',
    repo: 'aura-ai/aura-desktop-companion',
    type: 'Pull Request #42 (Open)',
    title: 'feat: Vision Screen Capture (/screen) + Multi-Provider Cloud AI',
    updatedAt: '15 min ago',
    url: 'https://github.com',
    summary:
      'Adds native desktop capture via Electron desktopCapturer, multimodal Vision AI analysis with GPT-4o / Claude / Gemini, and Calendar/Notion/GitHub integrations.',
  },
  {
    id: 'gh-2',
    repo: 'aura-ai/aura-desktop-companion',
    type: 'Issue #39 (In Progress)',
    title: 'Optimize auto-fallback latency between Local Ollama and Gemini 2.5 Flash',
    updatedAt: '3 hours ago',
    url: 'https://github.com',
    summary:
      'When running on a laptop without a dedicated GPU and Ollama does not respond within 1.2s, seamlessly fallback to the configured Cloud key.',
  },
  {
    id: 'gh-3',
    repo: 'aura-ai/license-server',
    type: 'Pull Request #18 (Merged)',
    title: 'security: Enforce single-activation for customer license keys',
    updatedAt: 'Yesterday',
    url: 'https://github.com',
    summary:
      'Validates Pro and Ultra keys at checkout and records activation in registry, preserving master key for founder testing.',
  },
];

const VALID_SERVICES = ['gmail', 'gdrive', 'gcalendar', 'notion', 'github'];

/**
 * Connects an external service (Gmail, Google Drive, Google Calendar, Notion, GitHub).
 */
export async function connectGoogleService(arg1, arg2 = {}) {
  const payload =
    typeof arg1 === 'string' ? { service: arg1, ...arg2 } : { ...(arg1 || {}) };
  const { service, email, workspace, username, accessToken } = payload;

  if (!VALID_SERVICES.includes(service)) {
    throw new Error(`Unknown service: ${service}`);
  }

  const token = String(accessToken ?? '').trim();
  const mode = token ? 'oauth' : 'demo';
  const defaultEmail = getSettings().account?.email || 'user@example.com';
  const lastSync = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  let patch = {
    connected: true,
    accessToken: token,
    mode,
    lastSync,
  };

  if (service === 'notion') {
    patch.workspace = String(workspace || email || 'Aura HQ Workspace').trim();
  } else if (service === 'github') {
    patch.username = String(username || email || 'aura-user').trim();
  } else {
    let resolvedEmail = String(email || defaultEmail).trim();
    if (mode === 'oauth') {
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const profile = await res.json();
          if (profile?.email) resolvedEmail = profile.email;
        }
      } catch {
        // preserve input
      }
    }
    patch.email = resolvedEmail;
  }

  const next = updateSettings({
    connectors: {
      [service]: patch,
    },
  });

  return next.connectors;
}

export function disconnectGoogleService(service) {
  if (!VALID_SERVICES.includes(service)) return getSettings().connectors;
  const next = updateSettings({
    connectors: {
      [service]: {
        connected: false,
        accessToken: '',
        lastSync: '',
      },
    },
  });
  return next.connectors;
}

/** 1. Gmail: List or search emails. */
export async function fetchGmailMessages(options = {}) {
  const query = typeof options === 'string' ? options : options?.query ?? '';
  const cfg = getSettings().connectors?.gmail;
  if (!cfg?.connected) {
    throw new Error(
      'Gmail connector is not enabled. Connect it with 1 click from Control Center → Connectors & Cloud.',
    );
  }

  const q = String(query ?? '').trim().toLowerCase();
  const account = cfg.email || getSettings().account?.email || 'user@example.com';

  if (cfg.mode === 'oauth' && cfg.accessToken) {
    const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
    url.searchParams.set('maxResults', '6');
    if (q) url.searchParams.set('q', q);

    const listRes = await fetch(url, {
      headers: { Authorization: `Bearer ${cfg.accessToken}` },
      signal: AbortSignal.timeout(7000),
    });
    if (!listRes.ok) {
      throw new Error(`Gmail API error (${listRes.status}). Verify OAuth token.`);
    }
    const listData = await listRes.json();
    const messages = [];
    for (const m of (listData.messages ?? []).slice(0, 5)) {
      const detailRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${cfg.accessToken}` } },
      );
      if (!detailRes.ok) continue;
      const d = await detailRes.json();
      const headers = d.payload?.headers ?? [];
      const getH = (name) => headers.find((h) => h.name === name)?.value || '';
      messages.push({
        id: d.id,
        from: getH('From'),
        subject: getH('Subject') || '(No Subject)',
        date: getH('Date'),
        unread: true,
        snippet: d.snippet || '',
        body: d.snippet || '',
      });
    }
    return { mode: 'oauth', account, messages };
  }

  const messages = !q
    ? DEMO_GMAIL_MESSAGES
    : DEMO_GMAIL_MESSAGES.filter(
        (m) =>
          m.subject.toLowerCase().includes(q) ||
          m.from.toLowerCase().includes(q) ||
          m.body.toLowerCase().includes(q),
      );
  return { mode: 'demo', account, messages };
}

/** 2. Google Drive: Search or list files. */
export async function searchGoogleDrive(options = {}) {
  const query = typeof options === 'string' ? options : options?.query ?? '';
  const cfg = getSettings().connectors?.gdrive;
  if (!cfg?.connected) {
    throw new Error(
      'Google Drive connector is not enabled. Connect it with 1 click from Control Center → Connectors & Cloud.',
    );
  }

  const q = String(query ?? '').trim().toLowerCase();
  const account = cfg.email || getSettings().account?.email || 'user@example.com';

  if (cfg.mode === 'oauth' && cfg.accessToken) {
    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('pageSize', '8');
    url.searchParams.set('fields', 'files(id,name,mimeType,modifiedTime,webViewLink)');
    if (q) {
      const safe = q.replace(/'/g, "\\'");
      url.searchParams.set('q', `name contains '${safe}' and trashed = false`);
    } else {
      url.searchParams.set('q', 'trashed = false');
    }

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${cfg.accessToken}` },
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) {
      throw new Error(`Google Drive API error (${res.status}). Verify OAuth token.`);
    }
    const data = await res.json();
    const files = (data.files ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      typeLabel: f.mimeType?.split('.').pop() || 'Document',
      modifiedTime: f.modifiedTime?.slice(0, 10) || '',
      webViewLink: f.webViewLink || 'https://drive.google.com',
      summary: `Google Drive file: ${f.name} (${f.mimeType})`,
    }));
    return { mode: 'oauth', account, files };
  }

  const files = !q
    ? DEMO_GDRIVE_FILES
    : DEMO_GDRIVE_FILES.filter(
        (f) => f.name.toLowerCase().includes(q) || f.summary.toLowerCase().includes(q),
      );
  return { mode: 'demo', account, files };
}

/** 3. Google Calendar: List scheduled meetings and events. */
export async function fetchCalendarEvents(options = {}) {
  const query = typeof options === 'string' ? options : options?.query ?? '';
  const cfg = getSettings().connectors?.gcalendar;
  if (!cfg?.connected) {
    throw new Error(
      'Google Calendar connector is not enabled. Connect it with 1 click from Control Center → Connectors & Cloud.',
    );
  }

  const q = String(query ?? '').trim().toLowerCase();
  const account = cfg.email || getSettings().account?.email || 'user@example.com';

  if (cfg.mode === 'oauth' && cfg.accessToken) {
    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    url.searchParams.set('maxResults', '6');
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');
    url.searchParams.set('timeMin', new Date().toISOString());
    if (q) url.searchParams.set('q', q);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${cfg.accessToken}` },
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) {
      throw new Error(`Google Calendar API error (${res.status}). Verify OAuth token.`);
    }
    const data = await res.json();
    const events = (data.items ?? []).map((ev) => ({
      id: ev.id,
      title: ev.summary || '(Untitled Event)',
      time: ev.start?.dateTime?.slice(0, 16).replace('T', ' ') || ev.start?.date || 'Today',
      attendees: `${(ev.attendees ?? []).length || 1} attendees`,
      location: ev.location || ev.hangoutLink || 'Google Meet',
      description: ev.description || 'Event synchronized from Google Calendar.',
    }));
    return { mode: 'oauth', account, events };
  }

  const events = !q
    ? DEMO_CALENDAR_EVENTS
    : DEMO_CALENDAR_EVENTS.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.attendees.toLowerCase().includes(q),
      );
  return { mode: 'demo', account, events };
}

/** 4. Notion: Search workspace pages. */
export async function searchNotionPages(options = {}) {
  const query = typeof options === 'string' ? options : options?.query ?? '';
  const cfg = getSettings().connectors?.notion;
  if (!cfg?.connected) {
    throw new Error(
      'Notion connector is not enabled. Connect it with 1 click from Control Center → Connectors & Cloud.',
    );
  }

  const q = String(query ?? '').trim().toLowerCase();
  const workspace = cfg.workspace || 'Aura HQ Workspace';

  if (cfg.mode === 'oauth' && cfg.accessToken) {
    const res = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.accessToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...(q ? { query: q } : {}),
        page_size: 6,
      }),
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) {
      throw new Error(`Notion API error (${res.status}). Verify Integration Token.`);
    }
    const data = await res.json();
    const pages = (data.results ?? []).map((p) => {
      const titleProp = Object.values(p.properties ?? {}).find((pr) => pr?.type === 'title');
      const title = titleProp?.title?.[0]?.plain_text || p.object || 'Notion Page';
      return {
        id: p.id,
        title,
        workspace,
        updatedAt: p.last_edited_time?.slice(0, 10) || 'Recent',
        url: p.url || 'https://www.notion.so',
        content: `Notion page: ${title} (ID: ${p.id})`,
      };
    });
    return { mode: 'oauth', workspace, pages };
  }

  const pages = !q
    ? DEMO_NOTION_PAGES
    : DEMO_NOTION_PAGES.filter(
        (p) => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q),
      );
  return { mode: 'demo', workspace, pages };
}

/** 5. GitHub: List PRs, Issues, and repositories. */
export async function fetchGithubItems(options = {}) {
  const query = typeof options === 'string' ? options : options?.query ?? '';
  const cfg = getSettings().connectors?.github;
  if (!cfg?.connected) {
    throw new Error(
      'GitHub connector is not enabled. Connect it with 1 click from Control Center → Connectors & Cloud.',
    );
  }

  const q = String(query ?? '').trim().toLowerCase();
  const username = cfg.username || 'aura-user';

  if (cfg.mode === 'oauth' && cfg.accessToken) {
    const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=6', {
      headers: {
        Authorization: `Bearer ${cfg.accessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Aura-Desktop-Companion',
      },
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) {
      throw new Error(`GitHub API error (${res.status}). Verify Personal Access Token.`);
    }
    const repos = await res.json();
    const items = (repos ?? []).map((r) => ({
      id: String(r.id),
      repo: r.full_name,
      type: r.private ? 'Private Repo' : 'Public Repo',
      title: r.description || r.name,
      updatedAt: r.updated_at?.slice(0, 10) || 'Recent',
      url: r.html_url,
      summary: `Repository ${r.full_name} — Language: ${r.language || 'N/A'}, ⭐ ${r.stargazers_count}. Description: ${r.description || 'No description'}.`,
    }));
    return { mode: 'oauth', username, items };
  }

  const items = !q
    ? DEMO_GITHUB_ITEMS
    : DEMO_GITHUB_ITEMS.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.repo.toLowerCase().includes(q) ||
          i.summary.toLowerCase().includes(q),
      );
  return { mode: 'demo', username, items };
}

/** 6. Desktop Screenshot for Vision AI */
export async function captureDesktopScreen() {
  const primary = screen.getPrimaryDisplay();
  const { width, height } = primary.size;
  const targetWidth = Math.min(1280, width || 1280);
  const targetHeight = Math.round((targetWidth * (height || 720)) / (width || 1280));

  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: targetWidth, height: targetHeight },
  });

  const source = sources[0];
  if (!source || source.thumbnail.isEmpty()) {
    throw new Error('Could not capture screen. Verify display permissions.');
  }

  const dataUrl = source.thumbnail.toDataURL();
  return {
    name: source.name || 'Primary Display',
    width: targetWidth,
    height: targetHeight,
    timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    dataUrl,
  };
}

/** 7. Smart Clipboard Assistant */
export function readSystemClipboard() {
  const text = clipboard.readText() || '';
  return {
    text: text.slice(0, 10000),
    length: text.length,
    isEmpty: text.trim().length === 0,
  };
}

export function writeSystemClipboard(text) {
  clipboard.writeText(String(text ?? ''));
  return true;
}
