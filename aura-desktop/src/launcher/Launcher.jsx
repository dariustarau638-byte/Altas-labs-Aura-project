import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Search,
  Command,
  Terminal,
  Cpu,
  Volume2,
  Folder,
  Globe,
  Camera,
  Play,
  Clock,
  Sparkles,
  Clipboard,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  X,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { aura } from '../lib/bridge.js';

export function Launcher() {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'tools' | 'routines' | 'clipboard' | 'ai'
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [tools, setTools] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [clipboardItems, setClipboardItems] = useState([]);
  const [executionResult, setExecutionResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(null);
  const [screenSnapshot, setScreenSnapshot] = useState(null);

  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Focus input whenever launcher window opens
  useEffect(() => {
    inputRef.current?.focus();
    const off = aura.launcher?.onFocused?.(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
      loadData();
    });
    return () => off?.();
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [tList, rList, cList] = await Promise.all([
        aura.jarvis?.tools ? aura.jarvis.tools() : [],
        aura.routines?.list ? aura.routines.list() : [],
        aura.clipboardMemory?.list ? aura.clipboardMemory.list() : [],
      ]);
      if (Array.isArray(tList)) setTools(tList);
      if (Array.isArray(rList)) setRoutines(rList);
      if (Array.isArray(cList)) setClipboardItems(cList);
    } catch {}
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Inline Math calculation
  const mathResult = useMemo(() => {
    const q = query.trim();
    if (!q || !/^[\d\s+\-*/().%^]+$/.test(q) || !/\d/.test(q) || !/[+\-*/^%]/.test(q)) {
      return null;
    }
    try {
      // Safe mathematical evaluation using basic arithmetic
      const sanitized = q.replace(/\^/g, '**');
      const val = Function(`'use strict'; return (${sanitized})`)();
      if (Number.isFinite(val)) {
        return {
          expression: q,
          result: typeof val === 'number' ? Number(val.toFixed(4)).toLocaleString('en-US') : String(val),
        };
      }
    } catch {}
    return null;
  }, [query]);

  // Combined searchable item list
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items = [];

    // Math result priority
    if (mathResult) {
      items.push({
        id: 'math-calc',
        type: 'math',
        title: `= ${mathResult.result}`,
        subtitle: `Calculate "${mathResult.expression}"`,
        icon: Sparkles,
        badge: 'Math',
        payload: mathResult.result,
      });
    }

    // 1. Jarvis System Tools
    if (activeTab === 'all' || activeTab === 'tools') {
      for (const t of tools) {
        if (!q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)) {
          items.push({
            id: `tool-${t.id}`,
            type: 'tool',
            title: t.name,
            subtitle: t.description,
            category: t.category,
            risk: t.risk,
            icon: t.category.includes('Health') ? Cpu : t.category.includes('Audio') ? Volume2 : t.category.includes('File') ? Folder : t.category.includes('Net') ? Globe : t.category.includes('Vision') ? Camera : Terminal,
            payload: t,
          });
        }
      }
    }

    // 2. Scheduled Routines
    if (activeTab === 'all' || activeTab === 'routines') {
      for (const r of routines) {
        if (!q || r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)) {
          items.push({
            id: `routine-${r.id}`,
            type: 'routine',
            title: r.name,
            subtitle: r.description,
            category: 'Automated Routine',
            badge: r.trigger === 'timeOfDay' ? r.timeOfDay : r.trigger === 'interval' ? `Every ${r.intervalMinutes}m` : 'Manual',
            icon: Clock,
            payload: r,
          });
        }
      }
    }

    // 3. Pieces-style Contextual Clipboard Memory
    if (activeTab === 'all' || activeTab === 'clipboard') {
      for (const c of clipboardItems) {
        if (!q || c.content.toLowerCase().includes(q) || (c.title && c.title.toLowerCase().includes(q))) {
          items.push({
            id: `clip-${c.id}`,
            type: 'clipboard',
            title: c.title || c.content.slice(0, 48),
            subtitle: `${c.type.toUpperCase()}${c.language ? ` (${c.language})` : ''} · ${c.charCount} chars`,
            badge: c.type,
            icon: Clipboard,
            payload: c,
          });
        }
      }
    }

    // 4. Fallback: Ask AI directly
    if (q && (activeTab === 'all' || activeTab === 'ai')) {
      items.push({
        id: 'ai-prompt',
        type: 'ai',
        title: `Ask Aura: "${query}"`,
        subtitle: screenSnapshot ? 'Context includes active desktop screen snapshot' : 'Press Enter to submit natural language prompt',
        badge: 'AI Assistant',
        icon: Sparkles,
        payload: { query, screenSnapshot },
      });
    }

    return items;
  }, [query, activeTab, mathResult, tools, routines, clipboardItems, screenSnapshot]);

  // Keep selection bounded
  useEffect(() => {
    setSelectedIndex((prev) => Math.min(Math.max(0, prev), Math.max(0, filteredItems.length - 1)));
  }, [filteredItems.length]);

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIndex];
    if (el) {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const handleCaptureScreen = async () => {
    try {
      const snap = await aura.connectors?.captureScreen?.();
      if (snap?.dataUrl) {
        setScreenSnapshot(snap.dataUrl);
      }
    } catch {}
  };

  const executeItem = async (item) => {
    if (!item) return;
    setIsRunning(true);
    setExecutionResult(null);

    try {
      if (item.type === 'math') {
        await aura.connectors?.writeClipboard?.(item.payload);
        setExecutionResult({ success: true, message: `Copied "${item.payload}" to clipboard.` });
        setTimeout(() => aura.launcher?.hide?.(), 700);
      } else if (item.type === 'tool') {
        const res = await aura.jarvis?.executeTool?.(item.payload.id);
        if (res?.blockedByGate) {
          setPendingApproval({
            toolId: item.payload.id,
            name: item.payload.name,
            description: item.payload.description,
          });
        } else {
          setExecutionResult({
            success: res?.success !== false,
            message: res?.message || `Executed "${item.payload.name}".`,
          });
        }
      } else if (item.type === 'routine') {
        const res = await aura.routines?.run?.(item.payload.id);
        setExecutionResult({
          success: true,
          message: `Completed "${item.payload.name}" (${res?.lastResult?.successfulSteps ?? 0} steps passed).`,
        });
        loadData();
      } else if (item.type === 'clipboard') {
        await aura.clipboardMemory?.copy?.(item.payload.id);
        setExecutionResult({ success: true, message: 'Snippet copied back to clipboard.' });
        setTimeout(() => aura.launcher?.hide?.(), 600);
      } else if (item.type === 'ai') {
        // Open Companion widget with this prompt
        aura.app?.openDashboard?.();
        aura.launcher?.hide?.();
      }
    } catch (err) {
      setExecutionResult({ success: false, message: err.message || 'Execution failed.' });
    } finally {
      setIsRunning(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      aura.launcher?.hide?.();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      executeItem(filteredItems[selectedIndex]);
    }
  };

  return (
    <div
      className="flex h-screen w-screen flex-col overflow-hidden rounded-2xl border border-zinc-800/80 bg-[#09090b] text-[#e4e4e7] shadow-2xl backdrop-blur-xl"
      onKeyDown={handleKeyDown}
    >
      {/* Top Search Bar */}
      <div className="flex items-center gap-3 border-b border-zinc-800/60 px-4 py-3.5">
        <Search className="h-4 w-4 shrink-0 text-zinc-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a command, tool, routine, or calculation..."
          className="h-7 w-full bg-transparent text-sm text-[#e4e4e7] placeholder-zinc-500 outline-none"
        />

        {/* Screen Context Attachment Pill */}
        <button
          onClick={handleCaptureScreen}
          title="Attach on-demand Screen Context"
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors ${
            screenSnapshot
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
              : 'border-zinc-800 bg-[#121214] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
          }`}
        >
          <Camera className="h-3.5 w-3.5" />
          <span>{screenSnapshot ? 'Screen Attached' : 'Attach Screen'}</span>
          {screenSnapshot && (
            <X
              className="h-3 w-3 hover:text-white"
              onClick={(e) => {
                e.stopPropagation();
                setScreenSnapshot(null);
              }}
            />
          )}
        </button>

        <button
          onClick={() => aura.launcher?.hide?.()}
          className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-zinc-800/40 px-3 py-1.5 text-xs">
        {[
          { id: 'all', label: 'All' },
          { id: 'tools', label: `Tools (${tools.length})` },
          { id: 'routines', label: `Routines (${routines.length})` },
          { id: 'clipboard', label: `Clipboard (${clipboardItems.length})` },
          { id: 'ai', label: 'Ask AI' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Live Result Feedback Banner */}
      {executionResult && (
        <div
          className={`flex items-center justify-between border-b px-4 py-2 text-xs font-medium ${
            executionResult.success
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-red-500/30 bg-red-500/10 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {executionResult.success ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
            )}
            <span>{executionResult.message}</span>
          </div>
          <button onClick={() => setExecutionResult(null)} className="text-zinc-400 hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Human-in-the-Loop Security Gate Modal */}
      {pendingApproval && (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <div className="flex-1">
              <div className="font-semibold text-amber-300">Authorization Required (Security Gate)</div>
              <p className="mt-0.5 text-zinc-300">
                Action <strong className="text-white">"{pendingApproval.name}"</strong> is classified as high-privilege.
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  onClick={() => {
                    executeItem(filteredItems.find((i) => i.id === `tool-${pendingApproval.toolId}`));
                    setPendingApproval(null);
                  }}
                  className="rounded bg-amber-500 px-2.5 py-1 font-semibold text-black hover:bg-amber-400"
                >
                  Authorize Once
                </button>
                <button
                  onClick={() => setPendingApproval(null)}
                  className="rounded border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-zinc-300 hover:bg-zinc-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results List */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredItems.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center text-zinc-500 text-xs">
            <Command className="mb-2 h-7 w-7 text-zinc-600" />
            <p>No commands matching "{query}".</p>
            <p className="mt-1 text-zinc-600">Type any math expression or press Enter to ask Aura AI.</p>
          </div>
        ) : (
          filteredItems.map((item, idx) => {
            const Icon = item.icon || Terminal;
            const isSelected = idx === selectedIndex;
            return (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedIndex(idx);
                  executeItem(item);
                }}
                className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors ${
                  isSelected
                    ? 'bg-zinc-800/90 text-zinc-100 ring-1 ring-zinc-700/60'
                    : 'text-zinc-300 hover:bg-[#121214] hover:text-zinc-100'
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
                      isSelected
                        ? 'border-zinc-600 bg-zinc-700 text-zinc-100'
                        : 'border-zinc-800/70 bg-[#161619] text-zinc-400'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-[#e4e4e7]">{item.title}</span>
                      {item.badge && (
                        <span className="rounded bg-zinc-800/80 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                          {item.badge}
                        </span>
                      )}
                      {item.risk === 'DANGEROUS' && (
                        <span className="rounded border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-red-300">
                          Gate
                        </span>
                      )}
                    </div>
                    {item.subtitle && (
                      <p className="truncate text-[11px] text-zinc-500">{item.subtitle}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.category && (
                    <span className="hidden text-[10px] text-zinc-500 sm:inline">{item.category}</span>
                  )}
                  {isSelected && (
                    <span className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
                      ↵ Run
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Hotkey Legend */}
      <div className="flex items-center justify-between border-t border-zinc-800/60 bg-[#0d0d0f] px-3.5 py-2 text-[11px] text-zinc-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-zinc-800 bg-zinc-900 px-1 py-0.5 font-mono text-[10px]">↑↓</kbd>
            <span>Navigate</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-zinc-800 bg-zinc-900 px-1 py-0.5 font-mono text-[10px]">↵</kbd>
            <span>Execute</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-zinc-800 bg-zinc-900 px-1 py-0.5 font-mono text-[10px]">Esc</kbd>
            <span>Dismiss</span>
          </span>
        </div>
        <div className="flex items-center gap-1 text-zinc-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
          <span className="font-mono text-[10px]">Jarvis Engine Active</span>
        </div>
      </div>
    </div>
  );
}
