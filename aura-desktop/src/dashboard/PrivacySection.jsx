import { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Database,
  ExternalLink,
  FileSearch,
  FileText,
  Folder,
  FolderPlus,
  Lock,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { aura } from '../lib/bridge.js';

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const val = bytes / 1024 ** i;
  return `${val.toFixed(i >= 3 ? 1 : 0)} ${units[i]}`;
}

export default function PrivacySection({ settings, onUpdateSettings }) {
  const { privacy } = settings;
  const [stats, setStats] = useState(null);
  const [indexing, setIndexing] = useState(false);
  const [testQuery, setTestQuery] = useState('');
  const [testResults, setTestResults] = useState([]);
  const [previewFile, setPreviewFile] = useState(null); // { name, path, content }
  const [feedback, setFeedback] = useState(null);

  const loadStats = useCallback(async () => {
    try {
      const s = await aura.files.indexStats();
      setStats(s);
    } catch {}
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats, privacy.allowFileAccess, privacy.indexContent]);

  const handleReindex = async () => {
    setIndexing(true);
    try {
      const s = await aura.files.reindex();
      setStats(s);
      setFeedback({
        type: 'success',
        text: `Indexing complete: ${s.totalFiles} files and ${s.textFilesIndexed} text documents indexed.`,
      });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setIndexing(false);
    }
  };

  const handleAddFolder = async () => {
    const s = await aura.files.pickFolder();
    if (s) {
      setStats(s);
      setFeedback({ type: 'success', text: 'Folder added to sandbox and indexed.' });
    }
  };

  const handleRemoveRoot = async (folderPath) => {
    const s = await aura.files.removeRoot(folderPath);
    setStats(s);
    setFeedback({ type: 'success', text: `Folder "${folderPath}" removed.` });
  };

  const handleResetRoots = async () => {
    const s = await aura.files.resetRoots();
    setStats(s);
    setFeedback({
      type: 'success',
      text: 'Allowed directories reset to Documents, Desktop, and Downloads.',
    });
  };

  const handleTestSearch = async (e) => {
    e?.preventDefault();
    if (!testQuery.trim()) return;
    try {
      const res = await aura.files.search(testQuery);
      setTestResults(res);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handleInspectFile = async (filePath) => {
    try {
      const data = await aura.files.read(filePath);
      setPreviewFile(data);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const patchPrivacy = (values) => {
    onUpdateSettings({ privacy: values });
  };

  const roots = stats?.roots ?? [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight text-zinc-50">
            Privacy &amp; Local File Access
          </h1>
          <p className="mt-1 text-[13px] leading-relaxed text-zinc-400">
            Control which directories the Aura companion can inspect and manage your local document index.
          </p>
        </div>

        <div className="badge badge-success py-1 px-2.5">
          <ShieldCheck size={13} />
          <span>100% Local Processing · Zero Cloud Uploads</span>
        </div>
      </header>

      {feedback && (
        <div
          className={`flex items-center justify-between rounded-md border px-3 py-2 text-xs ${
            feedback.type === 'error'
              ? 'border-red-500/25 bg-red-500/[0.08] text-red-200'
              : 'border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-200'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-zinc-400 hover:text-zinc-200"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. Privacy Policies & Security Shield */}
      <section className="card p-4">
        <div className="mb-3.5 flex items-center gap-2.5">
          <div className="grid size-8 shrink-0 place-items-center rounded-md border border-line bg-surface-2 text-zinc-300">
            <Lock size={16} />
          </div>
          <div>
            <h2 className="section-title">Permissions &amp; Security Shield</h2>
            <p className="text-xs text-zinc-400">
              All search and summarization runs locally on your PC within the bounds defined below.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
          <label className="card-raised card-interactive flex cursor-pointer items-center justify-between gap-3 p-3">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-zinc-200">
                Allow local file access
              </div>
              <div className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">
                Enables <code className="font-mono text-zinc-300">/search</code> and{' '}
                <code className="font-mono text-zinc-300">/summarize</code> commands in the companion widget.
              </div>
            </div>
            <input
              type="checkbox"
              checked={privacy.allowFileAccess}
              onChange={(e) => patchPrivacy({ allowFileAccess: e.target.checked })}
              className="size-4 shrink-0 rounded accent-emerald-500"
            />
          </label>

          <label className="card-raised card-interactive flex cursor-pointer items-center justify-between gap-3 p-3">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-zinc-200">
                Index text file contents
              </div>
              <div className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">
                Searches inside document contents (`.md`, `.txt`, source code) in addition to filenames.
              </div>
            </div>
            <input
              type="checkbox"
              checked={privacy.indexContent}
              onChange={(e) => patchPrivacy({ indexContent: e.target.checked })}
              className="size-4 shrink-0 rounded accent-emerald-500"
            />
          </label>

          <label className="card-raised card-interactive flex cursor-pointer items-center justify-between gap-3 p-3">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-zinc-200">
                Block sensitive files automatically
              </div>
              <div className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">
                Restricts reading `.env`, `.pem`, `.key`, `.pfx`, `id_rsa`, and `.kdbx` secret files.
              </div>
            </div>
            <input
              type="checkbox"
              checked={privacy.blockSensitiveFiles}
              onChange={(e) => patchPrivacy({ blockSensitiveFiles: e.target.checked })}
              className="size-4 shrink-0 rounded accent-emerald-500"
            />
          </label>

          <label className="card-raised card-interactive flex cursor-pointer items-center justify-between gap-3 p-3">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-zinc-200">
                Strict Local-Only Mode (Zero Telemetry)
              </div>
              <div className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">
                Guarantees that no conversation snippet or indexed file leaves localhost.
              </div>
            </div>
            <input
              type="checkbox"
              checked={privacy.localOnlyMode}
              onChange={(e) => patchPrivacy({ localOnlyMode: e.target.checked })}
              className="size-4 shrink-0 rounded accent-emerald-500"
            />
          </label>
        </div>

        {/* Custom Exclusions */}
        <div className="mt-3.5">
          <label className="field-label">
            Excluded folders and file patterns (comma-separated)
          </label>
          <input
            type="text"
            value={privacy.excludedPatterns}
            onChange={(e) => patchPrivacy({ excludedPatterns: e.target.value })}
            placeholder=".env, .git, node_modules, *.pem, *.key"
            className="input font-mono text-xs"
          />
        </div>
      </section>

      {/* 2. Allowed Folders Sandbox & Local Index Stats */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Allowed directories */}
        <section className="card p-4 lg:col-span-7">
          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="grid size-8 shrink-0 place-items-center rounded-md border border-line bg-surface-2 text-zinc-300">
                <Folder size={16} />
              </div>
              <div>
                <h2 className="section-title">Authorized Directories (Sandbox)</h2>
                <p className="text-xs text-zinc-400">
                  Aura is strictly permitted to scan and read ONLY within these directories.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleResetRoots}
                title="Reset to default directories"
                className="btn btn-sm"
              >
                <RotateCcw size={12} />
                <span>Defaults</span>
              </button>
              <button
                type="button"
                onClick={handleAddFolder}
                className="btn btn-sm btn-primary"
              >
                <FolderPlus size={13} />
                <span>Add Folder</span>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            {roots.map((dir) => (
              <div
                key={dir}
                className="card-raised flex items-center justify-between gap-3 p-2.5"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Folder size={14} className="shrink-0 text-zinc-400" />
                  <span className="truncate font-mono text-xs text-zinc-300" title={dir}>
                    {dir}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    title="Open in Explorer"
                    onClick={() => aura.files.reveal(dir)}
                    className="btn btn-sm btn-icon btn-ghost text-zinc-400 hover:text-zinc-200"
                  >
                    <ExternalLink size={13} />
                  </button>
                  {roots.length > 1 && (
                    <button
                      type="button"
                      title="Remove access to this folder"
                      onClick={() => handleRemoveRoot(dir)}
                      className="btn btn-sm btn-icon btn-ghost text-zinc-400 hover:text-red-300"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Local Index Statistics */}
        <section className="card p-4 lg:col-span-5">
          <div className="mb-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="grid size-8 shrink-0 place-items-center rounded-md border border-line bg-surface-2 text-zinc-300">
                <Database size={16} />
              </div>
              <div>
                <h2 className="section-title">Local Document Index</h2>
                <p className="text-xs text-zinc-500">
                  {stats?.lastIndexedAt
                    ? `Updated at ${new Date(stats.lastIndexedAt).toLocaleTimeString('en-US')}`
                    : 'Not indexed yet'}
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={indexing || !privacy.allowFileAccess}
              onClick={handleReindex}
              className="btn btn-sm"
            >
              <RefreshCw size={13} className={indexing ? 'animate-spin' : ''} />
              <span>{indexing ? 'Scanning…' : 'Reindex'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="card-raised p-2.5">
              <div className="text-[11px] text-zinc-500">Files Indexed</div>
              <div className="mt-0.5 font-mono text-base font-semibold text-zinc-100 tabular-nums">
                {stats?.totalFiles ?? 0}
              </div>
            </div>
            <div className="card-raised p-2.5">
              <div className="text-[11px] text-zinc-500">Subdirectories</div>
              <div className="mt-0.5 font-mono text-base font-semibold text-zinc-100 tabular-nums">
                {stats?.totalDirs ?? 0}
              </div>
            </div>
            <div className="card-raised p-2.5">
              <div className="text-[11px] text-zinc-500">Text Documents</div>
              <div className="mt-0.5 font-mono text-base font-semibold text-zinc-100 tabular-nums">
                {stats?.textFilesIndexed ?? 0}
              </div>
            </div>
            <div className="card-raised p-2.5">
              <div className="text-[11px] text-zinc-500">Scanned Size</div>
              <div className="mt-0.5 font-mono text-base font-semibold text-zinc-100 tabular-nums">
                {formatBytes(stats?.totalBytes ?? 0)}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* 3. Search Tester & Inspector */}
      <section className="card p-4">
        <div className="mb-3.5 flex items-center gap-2.5">
          <div className="grid size-8 shrink-0 place-items-center rounded-md border border-line bg-surface-2 text-zinc-300">
            <FileSearch size={16} />
          </div>
          <div>
            <h2 className="section-title">
              Test Search &amp; File Inspector
            </h2>
            <p className="text-xs text-zinc-400">
              Verify what Aura discovers in your authorized directories (or use{' '}
              <code className="font-mono text-zinc-300">/search &lt;term&gt;</code> or{' '}
              <code className="font-mono text-zinc-300">/summarize &lt;file&gt;</code> in companion).
            </p>
          </div>
        </div>

        <form onSubmit={handleTestSearch} className="flex gap-2">
          <input
            type="text"
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            placeholder="Search by file name or text inside a document…"
            className="input flex-1 text-xs"
          />
          <button
            type="submit"
            disabled={!privacy.allowFileAccess}
            className="btn btn-sm btn-primary shrink-0"
          >
            Search Local
          </button>
        </form>

        {testResults.length > 0 && (
          <div className="mt-3.5 grid grid-cols-1 gap-2 md:grid-cols-2">
            {testResults.map((r) => (
              <div
                key={r.path}
                className="card-raised flex flex-col justify-between p-3 text-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium text-zinc-200">{r.name}</span>
                    <span className="badge text-[10px] py-0 px-1.5 h-4">
                      {r.matchedBy === 'content' ? 'Found in content' : 'Found by name'}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate font-mono text-[10px] text-zinc-500">
                    {r.path}
                  </div>
                  {r.preview && (
                    <div className="mt-1.5 rounded border border-line bg-canvas p-2 font-mono text-[11px] text-zinc-400">
                      "{r.preview}"
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => aura.files.reveal(r.path)}
                    className="btn btn-sm"
                  >
                    Show in Explorer
                  </button>
                  {r.canReadText && (
                    <button
                      type="button"
                      onClick={() => handleInspectFile(r.path)}
                      className="btn btn-sm btn-accent"
                    >
                      <FileText size={12} />
                      <span>Preview Text</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {previewFile && (
          <div className="card-raised mt-3.5 border-zinc-700 p-3.5">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-medium text-zinc-200">
                AI-Inspected Content: <span className="font-mono text-zinc-100">{previewFile.name}</span> (
                {formatBytes(previewFile.size)})
              </span>
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="btn btn-sm btn-ghost text-zinc-400 hover:text-zinc-200"
              >
                Close ✕
              </button>
            </div>
            <pre className="scroll-thin max-h-48 overflow-auto rounded border border-line bg-canvas p-3 font-mono text-[11px] whitespace-pre-wrap text-zinc-300">
              {previewFile.content}
            </pre>
          </div>
        )}
      </section>
    </div>
  );
}
