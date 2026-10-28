/** Lightweight vector mascot so the pet appearance works offline and needs no image files. */
export default function PetAvatar({ size = 40, active = false }) {
  return (
    <span className="aura-pet" data-active={active} style={{ width: size, height: size }} aria-label="Aura pet">
      <svg viewBox="0 0 64 64" width={size} height={size} role="img" aria-hidden="true">
        <defs>
          <linearGradient id="aura-pet-fill" x1="8" y1="2" x2="54" y2="61" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--orb-2)" />
            <stop offset="0.55" stopColor="var(--orb-3)" />
            <stop offset="1" stopColor="var(--orb-1)" />
          </linearGradient>
          <radialGradient id="aura-pet-shine" cx="0" cy="0" r="1" gradientTransform="matrix(18 0 0 14 22 15)" gradientUnits="userSpaceOnUse">
            <stop stopColor="white" stopOpacity=".75" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path d="M12 21 10 9c-.35-2.1 2.03-3.54 3.72-2.25l8.1 6.2a23.7 23.7 0 0 1 20.36.06l8.2-6.27c1.7-1.3 4.1.15 3.73 2.26l-2.08 12.02A23.2 23.2 0 0 1 58 36.5C58 50 46.36 59 32 59S6 50 6 36.5c0-6.12 2.22-11.5 6-15.5Z" fill="url(#aura-pet-fill)" stroke="rgb(255 255 255 / .2)" strokeWidth="1.2" />
        <path d="M12 21 10 9c-.35-2.1 2.03-3.54 3.72-2.25l8.1 6.2a23.7 23.7 0 0 1 20.36.06l8.2-6.27c1.7-1.3 4.1.15 3.73 2.26l-2.08 12.02A23.2 23.2 0 0 1 58 36.5C58 50 46.36 59 32 59S6 50 6 36.5c0-6.12 2.22-11.5 6-15.5Z" fill="url(#aura-pet-shine)" />
        <ellipse cx="23" cy="34" rx="2.1" ry="3" fill="#111827" />
        <ellipse cx="41" cy="34" rx="2.1" ry="3" fill="#111827" />
        <path d="m29 40 3 2 3-2M25 43c1.8 2.6 4.2 3.8 7 3.8s5.2-1.2 7-3.8" fill="none" stroke="#27272a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="17" cy="42" r="2.7" fill="var(--aura-400)" fillOpacity=".25" />
        <circle cx="47" cy="42" r="2.7" fill="var(--aura-400)" fillOpacity=".25" />
        <path d="M51 49c5 1 6 5 8 7" fill="none" stroke="var(--aura-300)" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}
