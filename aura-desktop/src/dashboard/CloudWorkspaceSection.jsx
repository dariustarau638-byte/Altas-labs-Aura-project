import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  AppWindow,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  HardDrive,
  KeyRound,
  Loader2,
  LockKeyhole,
  MonitorUp,
  Power,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { aura } from '../lib/bridge.js';

export default function CloudWorkspaceSection() {
  const [status, setStatus] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setBusy('status');
    const result = await aura.cloudWorkspace.status();
    setBusy('');
    if (!result.ok) { setError(result.error); return; }
    setStatus(result.data);
    if (result.data.notice) setNotice(result.data.notice);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const run = async (action, label) => {
    setBusy(label);
    setError('');
    setNotice('');
    const result = await action();
    setBusy('');
    if (!result.ok) { setError(result.error); return null; }
    setNotice(label === 'create' ? 'Cloud machine created successfully.' : 'Done.');
    await refresh();
    return result.data;
  };

  const saveKey = async (event) => {
    event.preventDefault();
    const result = await run(() => aura.cloudWorkspace.saveKey(apiKey), 'key');
    if (result) setApiKey('');
  };

  const sandbox = status?.sandbox;
  const active = sandbox && ['started', 'starting', 'resuming'].includes(String(sandbox.state).toLowerCase());

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-[11px] font-medium text-zinc-300">
            <MonitorUp size={13} className="text-zinc-400" />
            <span>Isolated Sandbox Environment</span>
          </div>
          <h1 className="text-[18px] font-semibold tracking-tight text-zinc-50">Aura Cloud Workspace</h1>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-zinc-400">
            A remote cloud Windows workstation for code and design. Your local projects remain completely decoupled from the cloud instance.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={busy !== ''}
          className="btn btn-sm"
        >
          <RefreshCw size={13} className={busy === 'status' ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="card p-4">
          <div className="flex items-start gap-3">
            <div className="grid size-8 shrink-0 place-items-center rounded-md border border-line bg-surface-2 text-zinc-300">
              <AppWindow size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="section-title">Cloud Machine</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-zinc-400">
                Isolated Windows VM with zero access to files on this PC. Stop the machine after your session to conserve cloud resources.
              </p>
            </div>
          </div>

          {sandbox ? (
            <div className="card-raised mt-4 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[13px] font-medium text-zinc-200">{sandbox.name || 'Aura Windows VM'}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400">
                    <span className={`dot ${active ? 'dot-success' : 'dot-warning'}`} />
                    <span>{sandbox.state || 'Status Available'}</span>
                  </div>
                </div>
                <span className="badge font-mono text-[10px] text-zinc-400">{sandbox.id}</span>
              </div>
              <div className="mt-3.5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => run(() => aura.cloudWorkspace.openTerminal(), 'terminal')}
                  disabled={busy !== ''}
                  className="btn btn-sm btn-primary"
                >
                  {busy === 'terminal' ? <Loader2 size={13} className="animate-spin" /> : <ExternalLink size={13} />}
                  <span>Open Cloud Terminal</span>
                </button>
                <button
                  type="button"
                  onClick={() => run(() => aura.cloudWorkspace.stop(), 'stop')}
                  disabled={busy !== '' || !active}
                  className="btn btn-sm"
                >
                  <Power size={13} />
                  <span>Stop VM</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!window.confirm('Permanently delete this cloud VM and its files? This action cannot be undone.')) return;
                    await run(() => aura.cloudWorkspace.delete(), 'delete');
                  }}
                  disabled={busy !== ''}
                  className="btn btn-sm btn-danger"
                >
                  <Trash2 size={13} />
                  <span>Delete VM</span>
                </button>
              </div>
              <p className="mt-3 text-xs text-zinc-500">
                The terminal session is authenticated and private. Do not share the link with untrusted parties.
              </p>
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-line bg-canvas p-4">
              <div className="flex items-center gap-2 text-[13px] font-medium text-zinc-200">
                <HardDrive size={15} className="text-zinc-400" />
                <span>No Cloud Machine Created</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                Provisioning spins up a dedicated Windows cloud sandbox. Aura schedules automatic shutdown after 60 minutes of inactivity; verify provider rates before proceeding.
              </p>
              <button
                type="button"
                onClick={() => run(() => aura.cloudWorkspace.create(), 'create')}
                disabled={busy !== '' || !status?.encryptedKeySaved}
                className="btn btn-sm btn-primary mt-3.5"
              >
                {busy === 'create' ? <Loader2 size={13} className="animate-spin" /> : <MonitorUp size={13} />}
                <span>Create Windows VM</span>
              </button>
            </div>
          )}

          {(notice || error) && (
            <div
              role={error ? 'alert' : 'status'}
              className={`mt-3.5 rounded-md border px-3 py-2 text-xs ${
                error
                  ? 'border-red-500/25 bg-red-500/[0.08] text-red-200'
                  : 'border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-200'
              }`}
            >
              {error || notice}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <section className="card p-4">
            <div className="flex items-center gap-2">
              <LockKeyhole size={15} className="text-zinc-300" />
              <h2 className="section-title">Daytona Connection</h2>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
              Your API key is encrypted locally by Windows DPAPI and stored exclusively on this PC.
            </p>
            {status?.encryptedKeySaved ? (
              <div className="card-raised mt-3.5 flex items-center justify-between p-3">
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-300">
                  <CheckCircle2 size={15} />
                  <span>Key saved securely</span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!window.confirm('Remove locally saved Daytona key? Active VMs will not be deleted.')) return;
                    await run(() => aura.cloudWorkspace.removeKey(), 'remove-key');
                  }}
                  className="btn btn-sm btn-ghost text-xs text-zinc-400 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            ) : (
              <form onSubmit={saveKey} className="mt-3.5 space-y-2">
                <label htmlFor="daytona-key" className="field-label">Daytona API Key</label>
                <div className="flex gap-2">
                  <div className="relative min-w-0 flex-1">
                    <KeyRound size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      id="daytona-key"
                      type={showKey ? 'text' : 'password'}
                      autoComplete="off"
                      value={apiKey}
                      onChange={(event) => setApiKey(event.target.value)}
                      placeholder="Paste API key"
                      className="input pl-8 pr-8 text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      aria-label={showKey ? 'Hide key' : 'Show key'}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-200"
                    >
                      {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={!apiKey.trim() || busy !== ''}
                    className="btn btn-sm btn-primary shrink-0"
                  >
                    {busy === 'key' ? <Loader2 size={13} className="animate-spin" /> : 'Save'}
                  </button>
                </div>
                <a
                  href="https://app.daytona.io"
                  onClick={(event) => { event.preventDefault(); aura.connectors.openExternal('https://app.daytona.io'); }}
                  className="inline-flex items-center gap-1 pt-1 text-xs text-zinc-400 hover:text-zinc-200"
                >
                  <span>Open Daytona</span>
                  <ExternalLink size={12} />
                </a>
              </form>
            )}
          </section>

          <section className="card p-4 border-amber-500/25 bg-amber-500/[0.03]">
            <div className="flex gap-2.5">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-amber-400" />
              <div>
                <h2 className="text-xs font-semibold text-amber-200">Security Boundary</h2>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                  The sandbox VM does not receive files from your local disk. To work on a repository, clone or upload it explicitly to the cloud instance.
                </p>
              </div>
            </div>
            <p className="mt-3 border-t border-line pt-3 text-xs leading-relaxed text-zinc-500">
              This stage connects the VM and interactive terminal. Automated AI task execution and remote sync run independently.
            </p>
            <div className="mt-2.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-zinc-500">
              <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-400" />
              <span>Windows VM provisioning may require specialized workspace tiers in Daytona.</span>
            </div>
          </section>
        </aside>
      </div>

      <section className="card p-4">
        <h2 className="section-title">Cloud Workspace Reference</h2>
        <p className="mt-1 text-xs text-zinc-400">
          Engineered for cloud development: clear sandbox status, isolated remote filesystems, and dedicated runtime instances.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <a
            href="https://coder.com/docs/user-guides/workspace-management"
            onClick={(event) => { event.preventDefault(); aura.connectors.openExternal('https://coder.com/docs/user-guides/workspace-management'); }}
            className="btn btn-sm"
          >
            <ExternalLink size={12} />
            <span>Coder · Workspace Management</span>
          </a>
          <a
            href="https://www.daytona.io/docs/en/sandboxes/"
            onClick={(event) => { event.preventDefault(); aura.connectors.openExternal('https://www.daytona.io/docs/en/sandboxes/'); }}
            className="btn btn-sm"
          >
            <ExternalLink size={12} />
            <span>Daytona · Isolated Sandboxes</span>
          </a>
        </div>
      </section>
    </div>
  );
}
