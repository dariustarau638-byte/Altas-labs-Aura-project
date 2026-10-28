import { useCallback, useEffect, useState } from 'react';
import {
  Camera,
  Check,
  Clock,
  Copy,
  Globe,
  KeyRound,
  MousePointerClick,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react';
import { aura } from '../lib/bridge.js';
import { useSettings } from '../lib/useSettings.js';

export default function AuraV2Section() {
  const { settings, update } = useSettings();
  const [remoteStatus, setRemoteStatus] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copilotStatus, setCopilotStatus] = useState({ active: false });
  const [actionsCatalog, setActionsCatalog] = useState([]);
  const [actionResult, setActionResult] = useState('');
  const [runningActionId, setRunningActionId] = useState('');

  const [timelineQuery, setTimelineQuery] = useState('');
  const [timelineData, setTimelineData] = useState({
    totalStored: 0,
    autoRecording: true,
    results: [],
    explanation: '',
  });
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  const refreshAll = useCallback(async () => {
    try {
      const [cp, cat, tl] = await Promise.all([
        aura.copilot.status(),
        aura.actions.catalog(),
        aura.timeline.search(''),
      ]);
      if (cp) setCopilotStatus(cp);
      if (Array.isArray(cat)) setActionsCatalog(cat);
      if (tl) setTimelineData(tl);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refreshAll();
    const fetchRemote = async () => {
      try {
        const res = await fetch('http://localhost:5190/api/status');
        if (res.ok) {
          const data = await res.json();
          setRemoteStatus(data);
        }
      } catch {}
    };
    fetchRemote();
    const t = setInterval(fetchRemote, 3500);
    return () => clearInterval(t);
  }, [refreshAll]);

  const handleCopyLink = () => {
    const link = remoteStatus?.tunnel?.directLink || remoteStatus?.networkIps?.[0]?.url;
    if (link) {
      navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleToggleCopilot = async () => {
    const next = await aura.copilot.toggle();
    if (next) setCopilotStatus(next);
  };

  const handleRunAction = async (act) => {
    setRunningActionId(act.id);
    setActionResult('');
    try {
      const res = await aura.actions.execute(act.id);
      setActionResult(res.summary || '✅ Automation executed successfully.');
    } catch (err) {
      setActionResult(`❌ Error: ${err.message}`);
    } finally {
      setRunningActionId('');
    }
  };

  const handleSearchTimeline = async (e) => {
    e?.preventDefault();
    setLoadingTimeline(true);
    try {
      const res = await aura.timeline.search(timelineQuery);
      if (res) setTimelineData(res);
    } finally {
      setLoadingTimeline(false);
    }
  };

  const handleCaptureNow = async () => {
    setLoadingTimeline(true);
    try {
      await aura.timeline.capture({ reason: 'dashboard' });
      const res = await aura.timeline.search(timelineQuery);
      if (res) setTimelineData(res);
    } finally {
      setLoadingTimeline(false);
    }
  };

  const handleDeleteSnapshot = async (id) => {
    await aura.timeline.delete(id);
    const res = await aura.timeline.search(timelineQuery);
    if (res) setTimelineData(res);
  };

  const handleClearTimeline = async () => {
    await aura.timeline.clear();
    setTimelineData((prev) => ({ ...prev, totalStored: 0, results: [] }));
  };

  const isTunnelActive = remoteStatus?.tunnel?.status === 'active';

  return (
    <div className="space-y-4">
      {/* 0. Aura Mobile Companion & Global Internet Control (4G / 5G / Any Wi-Fi) */}
      <section className="card p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="grid size-8 shrink-0 place-items-center rounded-md border border-line bg-surface-2 text-zinc-300">
              <Smartphone size={16} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="section-title">
                  Aura Mobile Companion &amp; Global Remote Control (4G / 5G / Any Wi-Fi)
                </h3>
                <span className={`badge ${isTunnelActive ? 'badge-success' : 'badge-accent'}`}>
                  <span className={`dot ${isTunnelActive ? 'dot-success' : ''}`} />
                  {isTunnelActive ? 'Global Online (Cloudflare)' : 'Local Wi-Fi Active'}
                </span>
              </div>
              <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-zinc-400">
                Control your PC from your phone anywhere in the world, even on cellular data. Stream your desktop in real time, launch coding sessions in VS Code, and approve desktop actions with a single tap.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyLink}
            className="btn btn-sm shrink-0"
          >
            {copiedLink ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            <span>{copiedLink ? 'Link Copied!' : 'Copy Mobile Link'}</span>
          </button>
        </div>

        {/* Mobile Connection Details */}
        <div className="mt-4 grid grid-cols-1 gap-2.5 md:grid-cols-3">
          {/* Card Global Link */}
          <div className="card-raised flex flex-col justify-between p-3">
            <div>
              <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-zinc-300">
                <Globe size={13} className="text-zinc-400" />
                <span>Global Internet Link (4G/5G)</span>
              </div>
              <div className="truncate font-mono text-xs text-zinc-200 select-all">
                {remoteStatus?.tunnel?.directLink || remoteStatus?.tunnel?.publicUrl || 'Generating secure tunnel...'}
              </div>
            </div>
            <div className="mt-2 text-[11px] text-zinc-500">
              Encrypted end-to-end with TLS 1.3 via Cloudflare Edge.
            </div>
          </div>

          {/* Card PIN Securitate */}
          <div className="card-raised flex flex-col justify-between p-3">
            <div>
              <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-zinc-300">
                <KeyRound size={13} className="text-zinc-400" />
                <span>PC Security PIN</span>
              </div>
              <div className="font-mono text-base font-semibold tracking-wider text-zinc-100 tabular-nums">
                {remoteStatus?.tunnel?.pin || '742918'}
              </div>
            </div>
            <div className="mt-2 text-[11px] text-zinc-500">
              Prevents unauthorized remote access.
            </div>
          </div>

          {/* Card Local Wi-Fi */}
          <div className="card-raised flex flex-col justify-between p-3">
            <div>
              <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-zinc-300">
                <QrCode size={13} className="text-zinc-400" />
                <span>Local Wi-Fi Network</span>
              </div>
              <div className="truncate font-mono text-xs text-zinc-300">
                {remoteStatus?.networkIps?.[0]?.url || 'http://localhost:5190'}
              </div>
            </div>
            <div className="mt-2 text-[11px] text-zinc-500">
              Lowest latency within your local wireless network.
            </div>
          </div>
        </div>

        {/* QR Code */}
        {remoteStatus?.tunnel?.qrCodeUrl && (
          <div className="mt-3 flex items-center gap-3.5 rounded-lg border border-line bg-surface-2 p-3">
            <img
              src={remoteStatus.tunnel.qrCodeUrl}
              alt="Aura Mobile QR Code"
              className="size-16 shrink-0 rounded-md bg-white p-1"
            />
            <div>
              <div className="text-[13px] font-medium text-zinc-200">Scan with your mobile camera</div>
              <div className="mt-0.5 text-xs leading-relaxed text-zinc-400">
                Open your iPhone or Android camera to launch Aura Mobile instantly with your security PIN pre-filled.
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 1. Mouse Control & Desktop Co-Pilot */}
      <section className="card p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="grid size-8 shrink-0 place-items-center rounded-md border border-line bg-surface-2 text-zinc-300">
              <MousePointerClick size={16} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="section-title">
                  1. Mouse Control &amp; Real-Time Desktop Co-Pilot
                </h3>
                <span className="badge">
                  v2.0 Live Control
                </span>
              </div>
              <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-zinc-400">
                Aura can move your cursor, click, and type upon request. Every action creates a safe execution plan first and requires your approval. Press <strong className="font-medium text-zinc-200">Esc</strong> at any time to abort immediately.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleCopilot}
              className={`btn btn-sm ${
                copilotStatus.active ? 'btn-accent' : 'btn-primary'
              }`}
            >
              <MousePointerClick size={13} />
              <span>{copilotStatus.active ? 'Mouse Control ACTIVE (Ctrl+Shift+A)' : 'Enable Mouse Control (Ctrl+Shift+A)'}</span>
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <div className="card-raised p-3">
            <div className="text-[11px] text-zinc-500">Control Status</div>
            <div className="mt-1 flex items-center gap-2 text-[13px] font-medium text-zinc-200">
              <span
                className={`dot ${
                  copilotStatus.active ? 'dot-success' : ''
                }`}
              />
              <span className="truncate">{copilotStatus.active ? 'Active at cursor' : 'Inactive'}</span>
            </div>
            <div className="mt-1 truncate text-xs text-zinc-500">
              Window: <code className="font-mono text-zinc-300">{copilotStatus.activeWindowTitle || 'Desktop'}</code>
            </div>
          </div>

          <div className="card-raised p-3">
            <div className="text-[11px] text-zinc-500">Quick Command</div>
            <div className="mt-1 font-mono text-[13px] font-medium text-zinc-200">/control &lt;action&gt;</div>
            <div className="mt-1 text-xs text-zinc-500">
              or toggle the mode in companion and type naturally
            </div>
          </div>

          <div className="card-raised p-3">
            <div className="text-[11px] text-zinc-500">Safety &amp; Abort</div>
            <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-300">
              Mandatory confirmation before clicks or typing. Press Esc to abort instantly.
            </div>
          </div>
        </div>
      </section>

      {/* 2. Secure Local Actions Automation System */}
      <section className="card p-4">
        <div className="flex items-start gap-3">
          <div className="grid size-8 shrink-0 place-items-center rounded-md border border-line bg-surface-2 text-zinc-300">
            <Zap size={16} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="section-title">
                2. Secure Local Automation System (Local Actions)
              </h3>
              <span className="badge">
                Command: /action
              </span>
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-zinc-400">
              Execute vetted scripts locally on your PC: intelligent Downloads folder organization by file type,
              temporary file cleanup (<code className="font-mono text-zinc-300">%TEMP%</code>), master audio controls,
              CPU/RAM diagnostics, and system theme switching.
            </p>
          </div>
        </div>

        {actionResult && (
          <div className="mt-3.5 whitespace-pre-wrap rounded-md border border-line bg-surface-2 p-3 font-mono text-xs text-zinc-200">
            {actionResult}
          </div>
        )}

        <div className="mt-3.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {actionsCatalog.map((act) => (
            <div
              key={act.id}
              className="card-raised card-interactive flex items-center justify-between gap-3 p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-xs font-medium text-zinc-200">{act.title}</span>
                  <span className="badge text-[10px] py-0 px-1.5 h-4">
                    {act.category}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">{act.description}</p>
              </div>
              <button
                type="button"
                disabled={runningActionId === act.id}
                onClick={() => handleRunAction(act)}
                className="btn btn-sm shrink-0"
              >
                <Zap size={12} />
                <span>{runningActionId === act.id ? 'Running...' : 'Execute'}</span>
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Intelligent Visual Timeline & Recall on SSD */}
      <section className="card p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="grid size-8 shrink-0 place-items-center rounded-md border border-line bg-surface-2 text-zinc-300">
              <Clock size={16} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="section-title">
                  3. Intelligent Visual Timeline on SSD (Visual Timeline &amp; Recall)
                </h3>
                <span className="badge badge-success">
                  <ShieldCheck size={11} />
                  <span>100% Local on SSD ({timelineData.totalStored} snapshots)</span>
                </span>
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-zinc-400">
                Periodically indexes screen snapshots entirely on your local SSD. Ask in natural language in chat:{' '}
                <em className="text-zinc-200 not-italic font-medium">"Hey Aura, where did I see that design 10 minutes ago?"</em> or{' '}
                <em className="text-zinc-200 not-italic font-medium">"Show me the terminal snippet I had open earlier"</em> (or type{' '}
                <code className="font-mono text-zinc-300">/timeline</code>).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCaptureNow}
              disabled={loadingTimeline}
              className="btn btn-sm btn-primary"
            >
              <Camera size={13} />
              <span>Capture Snapshot Now</span>
            </button>
            {timelineData.totalStored > 0 && (
              <button
                type="button"
                onClick={handleClearTimeline}
                className="btn btn-sm btn-danger"
              >
                <Trash2 size={13} />
                <span>Clear SSD History</span>
              </button>
            )}
          </div>
        </div>

        {/* Natural Language Search */}
        <form onSubmit={handleSearchTimeline} className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={timelineQuery}
              onChange={(e) => setTimelineQuery(e.target.value)}
              placeholder='Search in natural language: e.g. "code open 10 minutes ago", "browser", "document"...'
              className="input pl-8 text-xs"
            />
          </div>
          <button
            type="submit"
            disabled={loadingTimeline}
            className="btn btn-sm shrink-0"
          >
            <Sparkles size={13} />
            <span>Search Moment</span>
          </button>
        </form>

        {/* Gallery */}
        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {(timelineData.results || []).map((snap) => (
            <div
              key={snap.id}
              className="card-raised card-interactive flex flex-col justify-between overflow-hidden p-3"
            >
              <div>
                {snap.imageDataUrl && (
                  <div className="mb-2.5 overflow-hidden rounded-md border border-line bg-black">
                    <img
                      src={snap.imageDataUrl}
                      alt={snap.windowTitle}
                      className="h-28 w-full object-cover"
                    />
                  </div>
                )}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-zinc-200">{snap.windowTitle}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500">
                      <span className="font-mono text-zinc-300">{snap.timeLabel}</span>
                      <span>·</span>
                      <span>{snap.relativeTime}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteSnapshot(snap.id)}
                    title="Delete this snapshot from SSD"
                    className="btn btn-sm btn-icon btn-ghost text-zinc-500 hover:text-red-300"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <div className="mt-2.5 flex items-center justify-between text-[11px]">
                <span className="badge text-[10px] py-0 px-1.5 h-4">
                  {snap.category}
                </span>
                <span className="font-mono text-zinc-500">{snap.processName}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
