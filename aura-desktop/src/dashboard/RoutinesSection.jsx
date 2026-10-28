import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Play,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Calendar,
  Terminal,
  Activity,
  X,
} from 'lucide-react';
import { aura } from '../lib/bridge.js';

export function RoutinesSection() {
  const [routines, setRoutines] = useState([]);
  const [runningId, setRunningId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRoutine, setNewRoutine] = useState({
    name: '',
    description: '',
    trigger: 'interval',
    intervalMinutes: 120,
    timeOfDay: '09:00',
    tools: ['sys_health_overview'],
  });

  const loadRoutines = useCallback(async () => {
    try {
      const list = await aura.routines.list();
      if (Array.isArray(list)) setRoutines(list);
    } catch {}
  }, []);

  useEffect(() => {
    loadRoutines();
  }, [loadRoutines]);

  const handleToggle = async (routine) => {
    const updated = !routine.enabled;
    try {
      await aura.routines.toggle(routine.id, updated);
      setRoutines((prev) => prev.map((r) => (r.id === routine.id ? { ...r, enabled: updated } : r)));
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handleRunNow = async (id) => {
    setRunningId(id);
    setFeedback(null);
    try {
      const res = await aura.routines.run(id);
      setFeedback({
        type: 'success',
        text: `Routine "${res.name}" executed successfully (${res.lastResult?.successfulSteps ?? 0} steps passed).`,
      });
      loadRoutines();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Execution failed.' });
    } finally {
      setRunningId(null);
    }
  };

  const handleSaveRoutine = async (e) => {
    e.preventDefault();
    if (!newRoutine.name.trim()) return;
    try {
      await aura.routines.save(newRoutine);
      setIsModalOpen(false);
      setNewRoutine({
        name: '',
        description: '',
        trigger: 'interval',
        intervalMinutes: 120,
        timeOfDay: '09:00',
        tools: ['sys_health_overview'],
      });
      setFeedback({ type: 'success', text: 'New routine saved and scheduled.' });
      loadRoutines();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handleDelete = async (id) => {
    try {
      await aura.routines.delete(id);
      setRoutines((prev) => prev.filter((r) => r.id !== id));
      setFeedback({ type: 'success', text: 'Routine deleted.' });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-[#e4e4e7]">
              Jarvis Scheduled Routines
            </h2>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-400">
              Active Scheduler
            </span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-400">
            Automated background workflows for morning briefings, workspace cleanup, and health telemetry.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-700 hover:text-white"
        >
          <Plus className="h-3.5 w-3.5 text-zinc-400" />
          <span>New Routine</span>
        </button>
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

      {/* Routines Grid */}
      <div className="grid gap-3.5 sm:grid-cols-2">
        {routines.map((routine) => {
          const isRunning = runningId === routine.id;
          return (
            <div
              key={routine.id}
              className={`flex flex-col justify-between rounded-xl border p-4 transition-colors ${
                routine.enabled
                  ? 'border-zinc-800/80 bg-[#121214] hover:border-zinc-700'
                  : 'border-zinc-900 bg-[#0c0c0e] opacity-75'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-[#161619] text-zinc-300">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-[#e4e4e7]">{routine.name}</h3>
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                        <span>{routine.trigger === 'timeOfDay' ? `Daily at ${routine.timeOfDay}` : routine.trigger === 'interval' ? `Every ${routine.intervalMinutes}m` : 'Manual Trigger'}</span>
                        <span>•</span>
                        <span>{routine.tools?.length || 0} tools</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggle(routine)}
                    className="text-zinc-400 hover:text-white"
                    title={routine.enabled ? 'Pause Routine' : 'Enable Routine'}
                  >
                    {routine.enabled ? (
                      <ToggleRight className="h-6 w-6 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="h-6 w-6 text-zinc-600" />
                    )}
                  </button>
                </div>

                <p className="mt-2.5 text-xs leading-relaxed text-zinc-400">
                  {routine.description}
                </p>

                {/* Steps pills */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(routine.tools || []).map((toolId) => (
                    <span
                      key={toolId}
                      className="rounded border border-zinc-800/80 bg-zinc-900/90 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400"
                    >
                      {toolId}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-4 flex items-center justify-between border-t border-zinc-800/50 pt-3 text-[11px]">
                <span className="text-zinc-500">
                  {routine.lastRunAt
                    ? `Last run: ${new Date(routine.lastRunAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
                    : 'Never run'}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDelete(routine.id)}
                    className="rounded p-1 text-zinc-500 hover:text-red-400"
                    title="Delete Routine"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>

                  <button
                    onClick={() => handleRunNow(routine.id)}
                    disabled={isRunning}
                    className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-200 hover:border-zinc-600 hover:bg-zinc-700 disabled:opacity-50"
                  >
                    <Play className="h-3 w-3 text-emerald-400" />
                    <span>{isRunning ? 'Running...' : 'Run Now'}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Routine Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#09090b] p-5 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-semibold text-[#e4e4e7]">Create Jarvis Routine</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRoutine} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-zinc-400">Routine Name</label>
                <input
                  type="text"
                  required
                  value={newRoutine.name}
                  onChange={(e) => setNewRoutine({ ...newRoutine, name: e.target.value })}
                  placeholder="e.g. End of Day Git & Cache Clean"
                  className="mt-1 w-full rounded-md border border-zinc-800 bg-[#121214] px-3 py-1.5 text-zinc-200 outline-none focus:border-zinc-700"
                />
              </div>

              <div>
                <label className="block text-zinc-400">Description</label>
                <textarea
                  rows={2}
                  value={newRoutine.description}
                  onChange={(e) => setNewRoutine({ ...newRoutine, description: e.target.value })}
                  placeholder="Describe what tasks this routine handles..."
                  className="mt-1 w-full rounded-md border border-zinc-800 bg-[#121214] px-3 py-1.5 text-zinc-200 outline-none focus:border-zinc-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400">Trigger Type</label>
                  <select
                    value={newRoutine.trigger}
                    onChange={(e) => setNewRoutine({ ...newRoutine, trigger: e.target.value })}
                    className="mt-1 w-full rounded-md border border-zinc-800 bg-[#121214] px-2.5 py-1.5 text-zinc-200 outline-none"
                  >
                    <option value="interval">Recurring Interval</option>
                    <option value="timeOfDay">Daily Time</option>
                    <option value="manual">Manual Only</option>
                  </select>
                </div>

                {newRoutine.trigger === 'timeOfDay' ? (
                  <div>
                    <label className="block text-zinc-400">Time (HH:MM)</label>
                    <input
                      type="time"
                      value={newRoutine.timeOfDay}
                      onChange={(e) => setNewRoutine({ ...newRoutine, timeOfDay: e.target.value })}
                      className="mt-1 w-full rounded-md border border-zinc-800 bg-[#121214] px-3 py-1.5 text-zinc-200 outline-none"
                    />
                  </div>
                ) : newRoutine.trigger === 'interval' ? (
                  <div>
                    <label className="block text-zinc-400">Minutes Interval</label>
                    <input
                      type="number"
                      min={5}
                      value={newRoutine.intervalMinutes}
                      onChange={(e) => setNewRoutine({ ...newRoutine, intervalMinutes: Number(e.target.value) })}
                      className="mt-1 w-full rounded-md border border-zinc-800 bg-[#121214] px-3 py-1.5 text-zinc-200 outline-none"
                    />
                  </div>
                ) : null}
              </div>

              <div className="mt-5 flex justify-end gap-2 border-t border-zinc-800 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-md border border-zinc-800 px-3 py-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-zinc-200 px-3.5 py-1.5 font-medium text-black hover:bg-white"
                >
                  Save Routine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
