import React, { useState, useEffect, useCallback } from 'react';
import {
  Clipboard,
  Search,
  Copy,
  Trash2,
  Code,
  Link,
  Type,
  Palette,
  Check,
  ShieldCheck,
  X,
} from 'lucide-react';
import { aura } from '../lib/bridge.js';

export function ClipboardMemorySection() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const loadHistory = useCallback(async (q = '') => {
    try {
      const list = await aura.clipboardMemory.list(q);
      if (Array.isArray(list)) setItems(list);
    } catch {}
  }, []);

  useEffect(() => {
    loadHistory(search);
  }, [search, loadHistory]);

  const handleCopy = async (item) => {
    try {
      await aura.clipboardMemory.copy(item.id);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handleDelete = async (id) => {
    try {
      await aura.clipboardMemory.remove(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handleClearAll = async () => {
    try {
      await aura.clipboardMemory.clear();
      setItems([]);
      setFeedback({ type: 'success', text: 'Clipboard memory cleared.' });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const getTypeIcon = (type) => {
    if (type === 'code') return Code;
    if (type === 'url') return Link;
    if (type === 'color') return Palette;
    return Type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-[#e4e4e7]">
              Contextual AI Memory & Clipboard
            </h2>
            <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-400">
              <ShieldCheck className="h-3 w-3" />
              <span>On-Device Storage</span>
            </span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-400">
            Pieces-style background workflow memory. Automatically indexes copied code, snippets, and links.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <button
              onClick={handleClearAll}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-[#121214] px-2.5 py-1.5 text-xs text-zinc-400 hover:border-red-500/40 hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear History</span>
            </button>
          )}

          {/* Search */}
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search snippets..."
              className="w-full rounded-lg border border-zinc-800 bg-[#121214] py-1.5 pl-8 pr-3 text-xs text-zinc-200 outline-none focus:border-zinc-700 placeholder-zinc-500"
            />
          </div>
        </div>
      </header>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`flex items-center justify-between rounded-lg border px-3.5 py-2 text-xs font-medium ${
            feedback.type === 'error'
              ? 'border-red-500/30 bg-red-500/10 text-red-300'
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
          }`}
        >
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="text-zinc-400 hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Items List */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-[#0c0c0e] p-12 text-center text-zinc-500 text-xs">
          <Clipboard className="mb-2 h-8 w-8 text-zinc-600" />
          <p className="font-medium text-zinc-400">No clipboard items captured yet.</p>
          <p className="mt-1 text-zinc-600 max-w-sm">
            Copy code, URLs, or notes in any desktop app, and they will automatically appear here with language tagging.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const Icon = getTypeIcon(item.type);
            const isCopied = copiedId === item.id;
            return (
              <div
                key={item.id}
                className="group relative rounded-xl border border-zinc-800/80 bg-[#121214] p-3.5 transition-colors hover:border-zinc-700"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded border border-zinc-800 bg-[#161619] text-zinc-400">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="font-semibold text-xs text-[#e4e4e7]">{item.title}</span>
                    <span className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                      {item.type.toUpperCase()}{item.language ? ` · ${item.language}` : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-zinc-500">
                      {new Date(item.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    <button
                      onClick={() => handleCopy(item)}
                      className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium transition-colors ${
                        isCopied
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                          : 'border-zinc-700 bg-zinc-800 text-zinc-200 hover:border-zinc-600 hover:text-white'
                      }`}
                    >
                      {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      <span>{isCopied ? 'Copied' : 'Copy'}</span>
                    </button>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="rounded p-1 text-zinc-500 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Snippet Content Box */}
                <pre className="mt-2.5 max-h-36 overflow-x-auto rounded-lg bg-[#09090b] p-3 font-mono text-[11px] text-zinc-300 leading-relaxed border border-zinc-800/60">
                  {item.content}
                </pre>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
