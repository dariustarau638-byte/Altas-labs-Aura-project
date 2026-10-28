import { useEffect, useRef } from 'react';
import {
  Calendar,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  ExternalLink,
  File,
  Folder,
  Mail,
  MousePointerClick,
  ShieldCheck,
  Sparkles,
  Volume2,
  VolumeX,
  XCircle,
  Zap,
} from 'lucide-react';
import { aura } from '../../lib/bridge.js';
import Orb from './Orb.jsx';

const QUICK_ACTIONS = [
  { icon: Zap, label: 'PC Automations', prompt: '/action', immediate: true },
  { icon: Clock, label: 'Visual Timeline (SSD)', prompt: '/timeline', immediate: true },
  {
    icon: MousePointerClick,
    label: 'Desktop Control (Co-Pilot)',
    prompt: '/control Open Notepad and write an executive summary',
    immediate: true,
  },
  { icon: Camera, label: 'Analyze Screen', prompt: '/screen', immediate: true },
  { icon: ClipboardCheck, label: 'Clipboard Assistant', prompt: '/clipboard', immediate: true },
  { icon: Mail, label: 'Gmail Inbox', prompt: '/gmail', immediate: true },
  { icon: Calendar, label: 'Google Calendar', prompt: '/calendar', immediate: true },
];

function EmptyState({ userNickname, onPick, onSendImmediate }) {
  const cleanName =
    userNickname && userNickname !== 'Aura User'
      ? userNickname.trim()
      : '';
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-5 text-center">
      <Orb size={52} />
      <div>
        <div className="text-[14px] font-semibold tracking-tight text-zinc-100">
          {cleanName ? `Hello, ${cleanName}! How can I help you today?` : 'How can I help you today?'}
        </div>
        <div className="mt-1 text-[11px] text-zinc-500">
          Mouse Control · PC Automations · Visual SSD Timeline · Desktop Co-Pilot
        </div>
      </div>
      <div className="grid w-full grid-cols-2 gap-1.5">
        {QUICK_ACTIONS.map(({ icon: Icon, label, prompt, immediate }) => (
          <button
            key={label}
            type="button"
            onClick={() =>
              immediate && onSendImmediate ? onSendImmediate(prompt) : onPick(prompt)
            }
            className="card-interactive flex items-center gap-2 rounded-lg border border-zinc-800/70 bg-[#161619] px-2.5 py-2 text-left text-[11px] font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white"
          >
            <Icon size={13} className="shrink-0 text-aura-400" />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function FileResults({ results, onAnalyzeFile }) {
  return (
    <ul className="mt-2 space-y-1.5">
      {results.map((r) => (
        <li
          key={r.path}
          className="card-interactive rounded-lg border border-zinc-800/60 bg-[#121214] p-2 transition-colors hover:border-zinc-700"
        >
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              title={`Open in Explorer: ${r.path}`}
              onClick={() => aura.files.reveal(r.path)}
              className="flex min-w-0 flex-1 items-center gap-2 text-left text-xs text-zinc-300 hover:text-white"
            >
              {r.isDir ? (
                <Folder size={13} className="shrink-0 text-amber-400" />
              ) : (
                <File size={13} className="shrink-0 text-zinc-400" />
              )}
              <span className="truncate font-medium">{r.name}</span>
            </button>

            {!r.isDir && r.canReadText && onAnalyzeFile && (
              <button
                type="button"
                title="Inspect and summarize this file with AI"
                onClick={() => onAnalyzeFile(r.path)}
                className="btn btn-sm inline-flex h-5 shrink-0 items-center gap-1 rounded bg-aura-500/15 px-2 text-[10px] font-medium text-aura-300 transition-colors hover:bg-aura-500/25"
              >
                <Sparkles size={10} /> Summarize
              </button>
            )}
          </div>
          {r.preview && (
            <div className="mt-1 truncate pl-5 font-mono text-[10px] text-zinc-500">"{r.preview}"</div>
          )}
        </li>
      ))}
    </ul>
  );
}

function GmailResults({ items, onAnalyzeContext }) {
  return (
    <ul className="mt-2 space-y-1.5">
      {items.map((m) => (
        <li
          key={m.id}
          className="card-interactive rounded-lg border border-zinc-800/60 bg-[#121214] p-2.5 transition-colors hover:border-zinc-700"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                {m.unread && <span className="size-1.5 shrink-0 rounded-full bg-aura-400" />}
                <span className="truncate text-xs font-semibold text-zinc-100">{m.subject}</span>
              </div>
              <div className="mt-0.5 truncate font-mono text-[10px] text-zinc-500">
                From: {m.from} · {m.date}
              </div>
            </div>
            {onAnalyzeContext && (
              <button
                type="button"
                onClick={() =>
                  onAnalyzeContext({
                    userVisible: `📧 Summarize email "${m.subject}" and draft a reply proposal.`,
                    contextBlock: `--- Gmail Email ---\nFrom: ${m.from}\nSubject: ${m.subject}\nDate: ${m.date}\nContent:\n${m.body || m.snippet}`,
                  })
                }
                className="btn btn-sm inline-flex h-5 shrink-0 items-center gap-1 rounded bg-aura-500/15 px-2 text-[10px] font-medium text-aura-300 transition-colors hover:bg-aura-500/25"
              >
                <Sparkles size={10} /> Reply
              </button>
            )}
          </div>
          {m.snippet && (
            <div className="mt-1 line-clamp-2 text-[11px] text-zinc-400">{m.snippet}</div>
          )}
        </li>
      ))}
    </ul>
  );
}

function GdriveResults({ files, onAnalyzeContext }) {
  return (
    <ul className="mt-2 space-y-1.5">
      {files.map((f) => (
        <li
          key={f.id}
          className="card-interactive rounded-lg border border-zinc-800/60 bg-[#121214] p-2.5 transition-colors hover:border-zinc-700"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-zinc-100">{f.name}</div>
              <div className="mt-0.5 font-mono text-[10px] text-zinc-500">
                {f.typeLabel} · {f.modifiedTime}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {f.webViewLink && (
                <button
                  type="button"
                  title="Open in Google Drive"
                  onClick={() => aura.connectors.openExternal(f.webViewLink)}
                  className="inline-flex items-center gap-1 rounded border border-zinc-800 bg-zinc-800/50 px-1.5 py-0.5 text-[10px] text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                >
                  <ExternalLink size={10} />
                </button>
              )}
              {onAnalyzeContext && (
                <button
                  type="button"
                  onClick={() =>
                    onAnalyzeContext({
                      userVisible: `☁️ Analyze Google Drive document "${f.name}" and extract key highlights.`,
                      contextBlock: `--- Google Drive Document ---\nTitle: ${f.name}\nType: ${f.typeLabel}\nLast Modified: ${f.modifiedTime}\nContent / Summary:\n${f.summary}`,
                    })
                  }
                  className="btn btn-sm inline-flex h-5 items-center gap-1 rounded bg-aura-500/15 px-2 text-[10px] font-medium text-aura-300 transition-colors hover:bg-aura-500/25"
                >
                  <Sparkles size={10} /> Analyze
                </button>
              )}
            </div>
          </div>
          {f.summary && (
            <div className="mt-1 line-clamp-2 text-[11px] text-zinc-400">{f.summary}</div>
          )}
        </li>
      ))}
    </ul>
  );
}

function CalendarResults({ events, onAnalyzeContext }) {
  return (
    <ul className="mt-2 space-y-1.5">
      {events.map((ev) => (
        <li
          key={ev.id}
          className="card-interactive rounded-lg border border-zinc-800/60 bg-[#121214] p-2.5 transition-colors hover:border-zinc-700"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-zinc-100">{ev.title}</div>
              <div className="mt-0.5 font-mono text-[10px] text-aura-400">
                {ev.time} · {ev.location}
              </div>
              <div className="text-[10px] text-zinc-500">{ev.attendees}</div>
            </div>
            {onAnalyzeContext && (
              <button
                type="button"
                onClick={() =>
                  onAnalyzeContext({
                    userVisible: `📅 Prepare a briefing and structured agenda for meeting "${ev.title}".`,
                    contextBlock: `--- Google Calendar Event ---\nTitle: ${ev.title}\nTime: ${ev.time}\nLocation: ${ev.location}\nAttendees: ${ev.attendees}\nDescription:\n${ev.description}`,
                  })
                }
                className="btn btn-sm inline-flex h-5 shrink-0 items-center gap-1 rounded bg-aura-500/15 px-2 text-[10px] font-medium text-aura-300 transition-colors hover:bg-aura-500/25"
              >
                <Sparkles size={10} /> Briefing
              </button>
            )}
          </div>
          {ev.description && (
            <div className="mt-1 line-clamp-2 text-[11px] text-zinc-400">{ev.description}</div>
          )}
        </li>
      ))}
    </ul>
  );
}

function NotionResults({ pages, onAnalyzeContext }) {
  return (
    <ul className="mt-2 space-y-1.5">
      {pages.map((p) => (
        <li
          key={p.id}
          className="card-interactive rounded-lg border border-zinc-800/60 bg-[#121214] p-2.5 transition-colors hover:border-zinc-700"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-zinc-100">{p.title}</div>
              <div className="mt-0.5 font-mono text-[10px] text-zinc-500">
                {p.workspace} · {p.updatedAt}
              </div>
            </div>
            {onAnalyzeContext && (
              <button
                type="button"
                onClick={() =>
                  onAnalyzeContext({
                    userVisible: `📓 Summarize Notion page "${p.title}" and propose next action steps.`,
                    contextBlock: `--- Notion Page ---\nTitle: ${p.title}\nWorkspace: ${p.workspace}\nContent:\n${p.content}`,
                  })
                }
                className="btn btn-sm inline-flex h-5 shrink-0 items-center gap-1 rounded bg-aura-500/15 px-2 text-[10px] font-medium text-aura-300 transition-colors hover:bg-aura-500/25"
              >
                <Sparkles size={10} /> Analyze
              </button>
            )}
          </div>
          {p.content && (
            <div className="mt-1 line-clamp-2 text-[11px] text-zinc-400">{p.content}</div>
          )}
        </li>
      ))}
    </ul>
  );
}

function GithubResults({ items, onAnalyzeContext }) {
  return (
    <ul className="mt-2 space-y-1.5">
      {items.map((item) => (
        <li
          key={item.id}
          className="card-interactive rounded-lg border border-zinc-800/60 bg-[#121214] p-2.5 transition-colors hover:border-zinc-700"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-zinc-100">{item.title}</div>
              <div className="mt-0.5 font-mono text-[10px] text-zinc-500">
                {item.repo} · <span className="text-aura-400">{item.type}</span>
              </div>
            </div>
            {onAnalyzeContext && (
              <button
                type="button"
                onClick={() =>
                  onAnalyzeContext({
                    userVisible: `🐙 Perform technical review of "${item.title}" in ${item.repo} and provide actionable review notes.`,
                    contextBlock: `--- GitHub (${item.repo}) ---\nType: ${item.type}\nTitle: ${item.title}\nDetails:\n${item.summary}`,
                  })
                }
                className="btn btn-sm inline-flex h-5 shrink-0 items-center gap-1 rounded bg-aura-500/15 px-2 text-[10px] font-medium text-aura-300 transition-colors hover:bg-aura-500/25"
              >
                <Sparkles size={10} /> Code Review
              </button>
            )}
          </div>
          {item.summary && (
            <div className="mt-1 line-clamp-2 text-[11px] text-zinc-400">{item.summary}</div>
          )}
        </li>
      ))}
    </ul>
  );
}

function ClipboardCard({ text, onAnalyzeContext }) {
  const actions = [
    { label: '✨ Professional Rewrite', task: 'Rewrite this clipboard snippet in a clear, professional, and executive tone:' },
    { label: '🌍 Translate to English', task: 'Translate this clipboard snippet into clean, natural English:' },
    { label: '✅ Fix Grammar', task: 'Fix grammatical, punctuation, and style errors in this clipboard text and return the polished version:' },
    { label: '📝 Summarize / Explain', task: 'Summarize and clearly explain the key points or code in this clipboard text:' },
  ];

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-zinc-800/60 bg-[#121214] p-2.5">
      <div className="line-clamp-3 rounded-md border border-zinc-800/80 bg-[#09090b] p-2 font-mono text-[11px] text-zinc-300">
        {text}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={() =>
              onAnalyzeContext?.({
                userVisible: `📋 ${a.label}`,
                contextBlock: `${a.task}\n\n--- Clipboard Text ---\n${text}`,
              })
            }
            className="card-interactive rounded-md border border-zinc-800/70 bg-[#161619] px-2 py-1.5 text-left text-[10px] font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white"
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function DesktopControlCard({ plan, msgId, onApprove, onReject }) {
  const isAwaiting = plan.status === 'awaiting_approval';
  const isExecuting = plan.status === 'executing';
  const isCompleted = plan.status === 'completed';
  const isRejected = plan.status === 'rejected';

  return (
    <div className="mt-2.5 space-y-2.5 rounded-lg border border-aura-500/30 bg-[#121214] p-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-zinc-800/60 pb-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <ShieldCheck size={13} className="shrink-0 text-aura-400" />
          <span className="truncate text-[11px] font-medium text-zinc-100">
            Window: {typeof plan.activeWindow === 'string' ? plan.activeWindow : plan.activeWindow?.title || 'Desktop Windows'}
          </span>
        </div>
        {(plan.cursor || plan.cursorStart) && (
          <span className="shrink-0 rounded border border-zinc-800 bg-zinc-800/40 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
            X:{(plan.cursor || plan.cursorStart).x} Y:{(plan.cursor || plan.cursorStart).y}
          </span>
        )}
      </div>

      {/* Steps */}
      <ul className="space-y-1.5">
        {(plan.steps || []).map((step, idx) => (
          <li
            key={step.id || idx}
            className="flex items-start gap-2 rounded-md border border-zinc-800/60 bg-[#161619] px-2.5 py-1.5 text-[11px]"
          >
            <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded bg-zinc-800 font-mono text-[9px] font-bold text-zinc-300">
              {idx + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-zinc-200">{step.label}</div>
              <div className="truncate text-[10px] text-zinc-500">{step.detail}</div>
            </div>
            {(step.done || step.status === 'done') && <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-emerald-400" />}
          </li>
        ))}
      </ul>

      {/* Mandatory Approval Banner */}
      {isAwaiting && (
        <div className="space-y-2 pt-1">
          <div className="rounded-md border border-amber-500/25 bg-amber-500/10 px-2.5 py-1.5 text-[10px] text-amber-200">
            🔒 <strong>Mandatory confirmation:</strong> Aura will not move your cursor or type until you approve below.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onApprove?.(msgId, plan.id)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-zinc-100 px-3 py-1.5 text-[11px] font-semibold text-zinc-950 transition-colors hover:bg-white"
            >
              <CheckCircle2 size={12} /> Approve &amp; Execute on Desktop
            </button>
            <button
              type="button"
              onClick={() => onReject?.(msgId, plan.id)}
              className="btn-ghost flex items-center justify-center gap-1 rounded-md border border-zinc-800 px-2.5 py-1.5 text-[11px] font-medium text-zinc-400 transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
            >
              <XCircle size={12} /> Reject
            </button>
          </div>
        </div>
      )}

      {isExecuting && (
        <div className="flex items-center gap-2 rounded-md border border-aura-500/25 bg-aura-500/10 px-2.5 py-1.5 text-[11px] font-medium text-aura-300">
          <span className="size-1.5 animate-pulse rounded-full bg-aura-400" />
          ⚡ Aura is controlling the desktop in real time...
        </div>
      )}

      {isCompleted && (
        <div className="flex items-center gap-1.5 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-medium text-emerald-300">
          <CheckCircle2 size={13} /> Executed successfully with your approval!
        </div>
      )}

      {isRejected && (
        <div className="flex items-center gap-1.5 rounded-md border border-zinc-800/60 bg-zinc-800/20 px-2.5 py-1.5 text-[11px] text-zinc-400">
          <XCircle size={13} /> Plan rejected — no action taken on desktop.
        </div>
      )}
    </div>
  );
}

function LocalActionsCard({ catalog = [], onExecuteLocalAction }) {
  return (
    <div className="mt-2.5 grid grid-cols-1 gap-1.5">
      {catalog.map((act) => (
        <div
          key={act.id}
          className="card-interactive flex items-center justify-between gap-2 rounded-lg border border-zinc-800/60 bg-[#121214] px-2.5 py-2 transition-colors hover:border-zinc-700"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-[11px] font-medium text-zinc-200">{act.title}</span>
              <span className="rounded border border-zinc-800 bg-zinc-800/40 px-1.5 py-0.5 font-mono text-[9px] text-zinc-400">
                {act.category}
              </span>
            </div>
            <div className="truncate text-[10px] text-zinc-500">{act.description}</div>
          </div>
          <button
            type="button"
            onClick={() => onExecuteLocalAction?.(act.id, act.title)}
            className="btn btn-sm inline-flex h-5 shrink-0 items-center gap-1 rounded bg-aura-500/15 px-2 text-[10px] font-medium text-aura-300 transition-colors hover:bg-aura-500/25"
          >
            <Zap size={10} /> Execute
          </button>
        </div>
      ))}
    </div>
  );
}

function TimelineResultsCard({ items = [], onAnalyzeContext, onCaptureMomentNow }) {
  return (
    <div className="mt-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-zinc-500">
          🔒 100% Stored Locally on SSD
        </span>
        {onCaptureMomentNow && (
          <button
            type="button"
            onClick={onCaptureMomentNow}
            className="btn btn-sm inline-flex h-5 items-center gap-1 rounded bg-aura-500/15 px-2 text-[10px] font-medium text-aura-300 transition-colors hover:bg-aura-500/25"
          >
            <Camera size={10} /> Capture Moment Now
          </button>
        )}
      </div>

      <ul className="space-y-2">
        {items.map((snap) => (
          <li
            key={snap.id}
            className="overflow-hidden rounded-lg border border-zinc-800/60 bg-[#121214] p-2.5"
          >
            {snap.imageDataUrl && (
              <div className="mb-2 overflow-hidden rounded-md border border-zinc-800/60">
                <img
                  src={snap.imageDataUrl}
                  alt={snap.windowTitle}
                  className="max-h-28 w-full object-cover"
                />
              </div>
            )}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold text-zinc-100">{snap.windowTitle}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-zinc-500">
                  <span className="text-aura-400">{snap.timeLabel}</span>
                  <span>·</span>
                  <span>{snap.relativeTime}</span>
                  <span>·</span>
                  <span className="rounded border border-zinc-800 bg-zinc-800/40 px-1.5 py-0.5 text-[9px] text-zinc-400">
                    {snap.category}
                  </span>
                </div>
              </div>
              {onAnalyzeContext && (
                <button
                  type="button"
                  onClick={() =>
                    onAnalyzeContext({
                      userVisible: `🕒 Analyze visual timeline moment from ${snap.timeLabel} ("${snap.windowTitle}") and explain what was open.`,
                      contextBlock: `--- Local SSD Visual Timeline Moment ---\nTime: ${snap.timeLabel} (${snap.relativeTime})\nWindow: ${snap.windowTitle} (${snap.processName})\nCategory: ${snap.category}\nCaptured Clipboard: ${snap.clipboardSnippet || 'N/A'}`,
                      imageDataUrl: snap.imageDataUrl || undefined,
                    })
                  }
                  className="btn btn-sm inline-flex h-5 shrink-0 items-center gap-1 rounded bg-aura-500/15 px-2 text-[10px] font-medium text-aura-300 transition-colors hover:bg-aura-500/25"
                >
                  <Sparkles size={10} /> Analyze
                </button>
              )}
            </div>
            {snap.clipboardSnippet && (
              <div className="mt-1.5 truncate rounded-md border border-zinc-800/60 bg-[#09090b] px-2 py-1 font-mono text-[10px] text-zinc-400">
                📋 {snap.clipboardSnippet}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Message({
  msg,
  onAnalyzeFile,
  onAnalyzeContext,
  onExecuteLocalAction,
  onCaptureMomentNow,
  onApproveDesktopPlan,
  onRejectDesktopPlan,
  speakingId,
  onToggleSpeak,
  voiceEnabled,
}) {
  const isUser = msg.role === 'user';
  const isSpeaking = speakingId === msg.id;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`group relative max-w-[88%] rounded-[10px] px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words border ${
          isUser
            ? 'border-zinc-700/60 bg-[#1c1c20] text-zinc-100'
            : msg.error
              ? 'border-red-500/25 bg-red-500/10 text-red-200'
              : 'border-zinc-800/60 bg-[#161619] text-zinc-200'
        }`}
      >
        {msg.imageDataUrl && (
          <div className="mb-2 overflow-hidden rounded-md border border-zinc-800/60">
            <img
              src={msg.imageDataUrl}
              alt="Screen capture"
              className="max-h-36 w-full object-cover"
            />
          </div>
        )}

        {msg.pending && !msg.content ? (
          <span className="typing" aria-label="Thinking">
            <span />
            <span />
            <span />
          </span>
        ) : (
          msg.content
        )}

        {msg.results?.length > 0 && (
          <FileResults results={msg.results} onAnalyzeFile={onAnalyzeFile} />
        )}
        {msg.gmailResults?.length > 0 && (
          <GmailResults items={msg.gmailResults} onAnalyzeContext={onAnalyzeContext} />
        )}
        {msg.gdriveResults?.length > 0 && (
          <GdriveResults files={msg.gdriveResults} onAnalyzeContext={onAnalyzeContext} />
        )}
        {msg.calendarResults?.length > 0 && (
          <CalendarResults events={msg.calendarResults} onAnalyzeContext={onAnalyzeContext} />
        )}
        {msg.notionResults?.length > 0 && (
          <NotionResults pages={msg.notionResults} onAnalyzeContext={onAnalyzeContext} />
        )}
        {msg.githubResults?.length > 0 && (
          <GithubResults items={msg.githubResults} onAnalyzeContext={onAnalyzeContext} />
        )}
        {msg.clipboardData && (
          <ClipboardCard text={msg.clipboardData} onAnalyzeContext={onAnalyzeContext} />
        )}
        {msg.localActionsCatalog?.length > 0 && (
          <LocalActionsCard
            catalog={msg.localActionsCatalog}
            onExecuteLocalAction={onExecuteLocalAction}
          />
        )}
        {msg.timelineResults?.length > 0 && (
          <TimelineResultsCard
            items={msg.timelineResults}
            onAnalyzeContext={onAnalyzeContext}
            onCaptureMomentNow={onCaptureMomentNow}
          />
        )}
        {msg.desktopPlan && (
          <DesktopControlCard
            plan={msg.desktopPlan}
            msgId={msg.id}
            onApprove={onApproveDesktopPlan}
            onReject={onRejectDesktopPlan}
          />
        )}

        {/* TTS on assistant messages */}
        {!isUser && !msg.pending && msg.content && voiceEnabled !== false && onToggleSpeak && (
          <div className="mt-1.5 flex justify-end">
            <button
              type="button"
              onClick={() => onToggleSpeak(msg.content, msg.id)}
              title={isSpeaking ? 'Stop speaking' : 'Listen to response'}
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] transition-colors ${
                isSpeaking
                  ? 'border border-aura-500/30 bg-aura-500/20 text-aura-300'
                  : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
              }`}
            >
              {isSpeaking ? (
                <>
                  <VolumeX size={11} /> Stop
                </>
              ) : (
                <>
                  <Volume2 size={11} /> Listen
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MessageList({
  messages,
  userNickname,
  onPickPrompt,
  onSendImmediate,
  onAnalyzeFile,
  onAnalyzeContext,
  onExecuteLocalAction,
  onCaptureMomentNow,
  onApproveDesktopPlan,
  onRejectDesktopPlan,
  speakingId,
  onToggleSpeak,
  voiceEnabled,
}) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  if (!messages.length) {
    return (
      <EmptyState
        userNickname={userNickname}
        onPick={onPickPrompt}
        onSendImmediate={onSendImmediate}
      />
    );
  }

  return (
    <div className="scroll-thin h-full space-y-3 overflow-y-auto px-4 py-4">
      {messages.map((m) => (
        <Message
          key={m.id}
          msg={m}
          onAnalyzeFile={onAnalyzeFile}
          onAnalyzeContext={onAnalyzeContext}
          onExecuteLocalAction={onExecuteLocalAction}
          onCaptureMomentNow={onCaptureMomentNow}
          onApproveDesktopPlan={onApproveDesktopPlan}
          onRejectDesktopPlan={onRejectDesktopPlan}
          speakingId={speakingId}
          onToggleSpeak={onToggleSpeak}
          voiceEnabled={voiceEnabled}
        />
      ))}
      <div ref={endRef} />
    </div>
  );
}
