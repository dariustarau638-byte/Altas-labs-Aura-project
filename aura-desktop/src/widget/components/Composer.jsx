import { useLayoutEffect } from 'react';
import { ArrowUp, Camera, Mic, MicOff, MousePointerClick, Square, X } from 'lucide-react';

const MAX_HEIGHT = 120;

export default function Composer({
  inputRef,
  value,
  onChange,
  onSend,
  onStop,
  streaming,
  canDictate,
  listening,
  onToggleDictation,
  onFocus,
  onBlur,
  controlMode = false,
  controlBusy = false,
  onExitControlMode,
  onStopControl,
  onAttachScreen,
  screenAttached = false,
}) {
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [value, inputRef]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="shrink-0 border-t border-zinc-800/60 bg-[#121214] p-3">
      {controlMode && (
        <div className="control-chip mb-2 flex items-center justify-between gap-2 rounded-md border border-aura-500/25 bg-aura-500/10 px-2.5 py-1.5 text-[11px] text-aura-200">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="relative grid size-4 shrink-0 place-items-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-aura-400/30" />
              <MousePointerClick size={12} className="relative text-aura-300" />
            </span>
            <span className="truncate">
              {controlBusy ? (
                <strong className="font-semibold text-zinc-100">Aura is controlling the mouse… (Esc aborts)</strong>
              ) : (
                <>
                  <strong className="font-semibold text-zinc-100">Mouse Control Mode</strong> — tell me what to do
                </>
              )}
            </span>
          </span>
          {controlBusy ? (
            <button
              type="button"
              onClick={onStopControl}
              className="btn btn-sm btn-danger h-5 rounded px-2 text-[10px]"
            >
              Stop
            </button>
          ) : (
            <button
              type="button"
              title="Exit Mouse Control Mode"
              onClick={onExitControlMode}
              className="grid size-5 shrink-0 place-items-center rounded text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
            >
              <X size={12} />
            </button>
          )}
        </div>
      )}
      <div
        className={`flex items-end gap-1.5 rounded-lg border bg-[#09090b] py-1.5 pr-1.5 pl-3 transition-colors ${
          controlMode
            ? 'border-aura-500/50 focus-within:border-aura-400'
            : 'border-zinc-800/80 focus-within:border-zinc-700'
        }`}
      >
        <textarea
          ref={inputRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={
            listening
              ? 'Listening… speak now'
              : controlMode
                ? 'e.g. open Notepad and type Hello…'
                : 'Ask anything or /search <file>…'
          }
          className="scroll-thin max-h-[120px] flex-1 resize-none bg-transparent py-1 text-[13px] text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
        />
        {onAttachScreen && !streaming && (
          <button
            type="button"
            title={screenAttached ? 'Screen context attached' : 'Capture & attach screen context'}
            onClick={onAttachScreen}
            className={`grid size-7 shrink-0 place-items-center rounded-md border transition-colors ${
              screenAttached
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                : 'border-transparent text-zinc-400 hover:border-zinc-800 hover:bg-zinc-800/60 hover:text-zinc-200'
            }`}
          >
            <Camera size={14} />
          </button>
        )}
        {canDictate && !streaming && (
          <button
            type="button"
            title={listening ? 'Stop dictation' : 'Voice dictation (Speech-to-Text)'}
            onClick={onToggleDictation}
            className={`grid size-7 shrink-0 place-items-center rounded-md border transition-colors ${
              listening
                ? 'animate-pulse border-red-500/40 bg-red-500/15 text-red-300'
                : 'border-transparent text-zinc-400 hover:border-zinc-800 hover:bg-zinc-800/60 hover:text-zinc-200'
            }`}
          >
            {listening ? <MicOff size={14} /> : <Mic size={14} />}
          </button>
        )}
        {streaming ? (
          <button
            type="button"
            title="Stop"
            onClick={onStop}
            className="grid size-7 shrink-0 place-items-center rounded-md border border-zinc-700/60 bg-zinc-800 text-zinc-200 transition-colors hover:bg-zinc-700"
          >
            <Square size={11} fill="currentColor" />
          </button>
        ) : (
          <button
            type="button"
            title="Send (Enter)"
            onClick={onSend}
            disabled={!value.trim()}
            className="grid size-7 shrink-0 place-items-center rounded-md border transition-colors enabled:border-zinc-200 enabled:bg-zinc-100 enabled:text-zinc-950 enabled:hover:border-white enabled:hover:bg-white disabled:cursor-not-allowed disabled:border-zinc-800/60 disabled:bg-zinc-900 disabled:text-zinc-600"
          >
            <ArrowUp size={14} />
          </button>
        )}
      </div>
      <div className="mt-1.5 px-1 font-mono text-[10px] text-zinc-500">
        Enter sends · Shift+Enter newline · Ctrl+Shift+Space toggles
      </div>
    </div>
  );
}
