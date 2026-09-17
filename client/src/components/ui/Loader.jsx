export default function Loader({ size = 24, className = '' }) {
  return (
    <div
      className={`inline-block animate-spin rounded-full border-2 border-gold/30 border-t-gold ${className}`}
      style={{ width: size, height: size }}
      role="status"
      aria-label="جارِ التحميل"
    />
  );
}
