import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Wrench,
  Search,
  Play,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Cpu,
  Volume2,
  Folder,
  Globe,
  Camera,
  Terminal,
  Activity,
  X,
  Code,
  Laptop,
} from 'lucide-react';
import { aura } from '../lib/bridge.js';

export function SystemToolsSection() {
  const [tools, setTools] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [runningId, setRunningId] = useState(null);
  const [activeOutput, setActiveOutput] = useState(null);
  const [pendingGate, setPendingGate] = useState(null);

  const loadTools = useCallback(async () => {
    try {
      const list = await aura.jarvis.tools();
      if (Array.isArray(list)) setTools(list);
    } catch {}
  }, []);

  useEffect(() => {
    loadTools();
  }, [loadTools]);

  const categories = useMemo(() => {
    const set = new Set(['All']);
    tools.forEach((t) => set.add(t.category));
    return Array.from(set);
  }, [tools]);

  const filteredTools = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tools.filter((tool) => {
      const matchCat = selectedCategory === 'All' || tool.category === selectedCategory;
      const matchQuery =
        !q ||
        tool.name.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        tool.id.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [tools, search, selectedCategory]);

  const handleExecute = async (tool) => {
    setRunningId(tool.id);
    setActiveOutput(null);
    try {
      const res = await aura.jarvis.executeTool(tool.id);
      if (res?.blockedByGate) {
        setPendingGate({
          toolId: tool.id,
          name: tool.name,
          description: tool.description,
        });
      } else {
        setActiveOutput({
          toolName: tool.name,
          success: res?.success !== false,
          result: res,
        });
      }
    } catch (err) {
      setActiveOutput({
        toolName: tool.name,
        success: false,
        result: { error: err.message },
      });
    } finally {
      setRunningId(null);
    }
  };

  const getCategoryIcon = (category) => {
    if (category.includes('Health')) return Cpu;
    if (category.includes('Audio')) return Volume2;
    if (category.includes('File')) return Folder;
    if (category.includes('Net')) return Globe;
    if (category.includes('Vision') || category.includes('Screen')) return Camera;
    if (category.includes('Developer')) return Code;
    if (category.includes('Application')) return Laptop;
    return Terminal;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-[#e4e4e7]">
              Jarvis System Tools Registry
            </h2>
            <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 font-mono text-[10px] text-zinc-300">
              {tools.length} Tools
            </span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-400">
            Native OS-level execution tools for processes, network diagnostics, files, audio, and hardware.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tools or commands..."
            className="w-full rounded-lg border border-zinc-800 bg-[#121214] py-1.5 pl-8 pr-3 text-xs text-zinc-200 outline-none focus:border-zinc-700 placeholder-zinc-500"
          />
        </div>
      </header>

      {/* Category Pills */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`rounded-md px-2.5 py-1 transition-colors ${
              selectedCategory === cat
                ? 'bg-zinc-800 font-medium text-white ring-1 ring-zinc-700'
                : 'text-zinc-400 hover:bg-[#121214] hover:text-zinc-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Security Gate Prompt */}
      {pendingGate && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div className="flex-1">
              <h4 className="font-semibold text-amber-300">Security Gate Intercept</h4>
              <p className="mt-0.5 text-zinc-300">
                Action <strong className="text-white">"{pendingGate.name}"</strong> is classified as high-privilege / destructive. Confirm execution:
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => {
                    handleExecute(tools.find((t) => t.id === pendingGate.toolId));
                    setPendingGate(null);
                  }}
                  className="rounded bg-amber-500 px-3 py-1 font-semibold text-black hover:bg-amber-400"
                >
                  Authorize Execution
                </button>
                <button
                  onClick={() => setPendingGate(null)}
                  className="rounded border border-zinc-700 bg-zinc-800 px-3 py-1 text-zinc-300 hover:bg-zinc-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Execution Output Drawer */}
      {activeOutput && (
        <div className="rounded-xl border border-zinc-800/80 bg-[#121214] p-4 text-xs">
          <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
            <div className="flex items-center gap-2">
              {activeOutput.success ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-400" />
              )}
              <span className="font-semibold text-[#e4e4e7]">
                Output: {activeOutput.toolName}
              </span>
            </div>
            <button
              onClick={() => setActiveOutput(null)}
              className="text-zinc-500 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <pre className="mt-2.5 max-h-48 overflow-y-auto rounded bg-[#09090b] p-3 font-mono text-[11px] text-zinc-300 leading-relaxed">
            {JSON.stringify(activeOutput.result, null, 2)}
          </pre>
        </div>
      )}

      {/* Tools Table / Pro-Density List */}
      <div className="overflow-hidden rounded-xl border border-zinc-800/80 bg-[#121214]">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-800/70 bg-[#0d0d0f] text-zinc-400">
              <th className="py-2.5 pl-4 pr-3 font-medium">Tool Name</th>
              <th className="px-3 py-2.5 font-medium hidden sm:table-cell">Category</th>
              <th className="px-3 py-2.5 font-medium hidden md:table-cell">Description</th>
              <th className="px-3 py-2.5 font-medium">Risk Level</th>
              <th className="py-2.5 pl-3 pr-4 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/40 text-zinc-300">
            {filteredTools.map((tool) => {
              const Icon = getCategoryIcon(tool.category);
              const isRunning = runningId === tool.id;
              return (
                <tr key={tool.id} className="hover:bg-zinc-800/40 transition-colors">
                  <td className="py-2.5 pl-4 pr-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-zinc-800 bg-[#161619] text-zinc-400">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div className="font-medium text-[#e4e4e7]">{tool.name}</div>
                        <div className="font-mono text-[10px] text-zinc-500">{tool.id}</div>
                      </div>
                    </div>
                  </td>

                  <td className="px-3 py-2.5 text-zinc-400 hidden sm:table-cell">
                    <span className="rounded bg-zinc-900 px-2 py-0.5 text-[11px]">
                      {tool.category}
                    </span>
                  </td>

                  <td className="px-3 py-2.5 text-zinc-400 max-w-xs truncate hidden md:table-cell">
                    {tool.description}
                  </td>

                  <td className="px-3 py-2.5">
                    {tool.risk === 'SAFE' ? (
                      <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                        Safe
                      </span>
                    ) : tool.risk === 'CAUTION' ? (
                      <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                        Caution
                      </span>
                    ) : (
                      <span className="rounded border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
                        Gate Required
                      </span>
                    )}
                  </td>

                  <td className="py-2.5 pl-3 pr-4 text-right">
                    <button
                      onClick={() => handleExecute(tool)}
                      disabled={isRunning}
                      className="inline-flex items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-200 hover:border-zinc-600 hover:bg-zinc-700 disabled:opacity-50"
                    >
                      <Play className="h-3 w-3 text-emerald-400" />
                      <span>{isRunning ? 'Running...' : 'Run'}</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
