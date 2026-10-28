import {
  Camera,
  History,
  LayoutDashboard,
  Minus,
  MousePointerClick,
  Pin,
  PinOff,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { getPersonality } from '../../../shared/settings.js';
import Orb from './Orb.jsx';

function IconButton({ title, onClick, active, children }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`grid size-7 place-items-center rounded-md border transition-colors ${
        active
          ? 'border-aura-500/30 bg-aura-500/15 text-aura-300'
          : 'border-transparent text-zinc-400 hover:border-zinc-800 hover:bg-zinc-800/60 hover:text-zinc-200'
      }`}
    >
      {children}
    </button>
  );
}

/** Companion Header & Drag Handle */
export default function Header({
  name = 'Aura',
  personality = 'friendly',
  status,
  streaming,
  speaking,
  autoSpeak,
  onToggleAutoSpeak,
  copilotActive = false,
  onToggleCopilot,
  onCaptureScreen,
  historyOpen,
  onToggleHistory,
  savedCount = 0,
  pinned,
  onTogglePin,
  onOpenDashboard,
  onClear,
  onCollapse,
  dragProps,
}) {
  const persona = getPersonality(personality);
  const providerPrefix = status.providerLabel ? `${status.providerLabel} · ` : '';
  const subtitle = speaking
    ? 'Speaking…'
    : status.online
      ? `${providerPrefix}${status.model}`
      : status.isCloud
        ? `${status.providerLabel || 'Cloud'}: add API key`
        : 'Ollama offline';

  return (
    <div
      {...dragProps}
      className="flex shrink-0 cursor-grab items-center gap-2.5 border-b border-zinc-800/60 bg-[#121214] px-3.5 py-2.5 active:cursor-grabbing"
    >
      <Orb size={28} active={streaming || speaking || copilotActive} online={status.online} />
      <div className="min-w-0 flex-1 leading-tight">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-semibold text-zinc-100">{name}</span>
          <span
            title={`Personality: ${persona.label}`}
            className="rounded-[5px] border border-zinc-800/80 bg-zinc-800/40 px-1.5 py-0.5 text-[9px] font-medium text-zinc-400"
          >
            {persona.emoji} {persona.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
          <span
            className={`size-1.5 shrink-0 rounded-full ${
              speaking ? 'bg-aura-400' : status.online ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
          />
          <span className="truncate">{subtitle}</span>
        </div>
      </div>
      <div className="flex items-center gap-0.5">
        <IconButton
          title={
            copilotActive
              ? 'Mouse Control Mode ACTIVE — type what Aura should do (click again to stop)'
              : 'Mouse Control — Aura moves cursor and types for you (Ctrl+Shift+A)'
          }
          onClick={onToggleCopilot}
          active={copilotActive}
        >
          <MousePointerClick size={14} />
        </IconButton>
        <IconButton
          title="Analyze screen now (Vision AI /screen)"
          onClick={onCaptureScreen}
        >
          <Camera size={14} />
        </IconButton>
        <IconButton
          title={`Saved conversation history (${savedCount})`}
          onClick={onToggleHistory}
          active={historyOpen}
        >
          <History size={14} />
        </IconButton>
        <IconButton
          title={
            speaking
              ? 'Stop speaking'
              : autoSpeak
                ? 'Auto-read active (click to disable)'
                : 'Enable automatic text-to-speech'
          }
          onClick={onToggleAutoSpeak}
          active={autoSpeak || speaking}
        >
          {autoSpeak || speaking ? <Volume2 size={14} /> : <VolumeX size={14} />}
        </IconButton>
        <IconButton title="New conversation" onClick={onClear}>
          <RotateCcw size={14} />
        </IconButton>
        <IconButton
          title={pinned ? 'Unpin window' : 'Pin window open'}
          onClick={onTogglePin}
          active={pinned}
        >
          {pinned ? <PinOff size={14} /> : <Pin size={14} />}
        </IconButton>
        <IconButton title="Control Center" onClick={onOpenDashboard}>
          <LayoutDashboard size={14} />
        </IconButton>
        <IconButton title="Collapse (Esc)" onClick={onCollapse}>
          <Minus size={14} />
        </IconButton>
      </div>
    </div>
  );
}
