export default function Orb({ size = 32, active = false, online = true }) {
  return (
    <div className="orb" data-active={active} data-online={online} style={{ width: size, height: size }}>
      <div className="orb-core" />
    </div>
  );
}
