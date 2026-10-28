import Orb from './Orb.jsx';

/**
 * MacBook-style Top Notch.
 * When the cursor is outside: a discreet, minimalist black notch pinned to the top screen edge.
 * When hovered: smoothly expands downward to reveal the Aura companion.
 */
export default function TopNotch({ name = 'Aura', status, streaming, onClick }) {
  const isOnline = status.online;

  return (
    <div
      onClick={onClick}
      className="group relative mx-auto flex h-full w-full cursor-pointer items-center justify-between px-3 select-none"
      title="Aura — Click or hover to open"
    >
      {/* Status indicator / mini Orb */}
      <div className="flex items-center gap-1.5">
        <span
          className={`size-1.5 rounded-full transition-colors ${
            isOnline ? 'bg-emerald-400' : 'bg-zinc-600'
          } ${streaming ? 'animate-pulse' : ''}`}
        />
        <span className="text-[11px] font-medium tracking-tight text-zinc-300 transition-colors group-hover:text-zinc-100">
          {name}
        </span>
      </div>

      {/* Camera lens indicator (MacBook Notch style) */}
      <div className="flex items-center justify-center">
        <div className="relative flex size-3 items-center justify-center rounded-full border border-zinc-800/80 bg-zinc-950">
          <div className="size-1 rounded-full bg-zinc-800" />
          <div className="absolute top-0.5 right-0.5 size-0.5 rounded-full bg-zinc-600" />
        </div>
      </div>

      {/* Mini hover indicator */}
      <div className="flex items-center gap-1 text-[10px] text-zinc-500">
        <span className="hidden font-mono text-[9px] text-zinc-500 group-hover:inline">
          hover
        </span>
        <span className="size-1 rounded-full bg-zinc-600" />
      </div>
    </div>
  );
}
