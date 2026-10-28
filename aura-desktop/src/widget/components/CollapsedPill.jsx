import Orb from './Orb.jsx';
import PetAvatar from './PetAvatar.jsx';

/** Compact state: floating pill. Can be dragged across the display or clicked to expand. */
export default function CollapsedPill({ name = 'Aura', status, streaming, companionStyle = 'orb', dragProps }) {
  const label = status.loading ? 'Connecting…' : status.online ? 'Ready to assist' : 'AI offline';
  return (
    <div
      {...dragProps}
      className="flex h-full w-full cursor-pointer items-center gap-2.5 pr-4 pl-2.5 active:cursor-grabbing"
    >
      {companionStyle === 'pet' ? <PetAvatar size={36} active={streaming} /> : <Orb size={32} active={streaming} online={status.online} />}
      <div className="min-w-0 leading-tight">
        <div className="truncate text-[13px] font-semibold tracking-wide text-white">{name}</div>
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
          <span className={`size-1.5 shrink-0 rounded-full ${status.online ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
          <span className="truncate">{label}</span>
        </div>
      </div>
    </div>
  );
}
