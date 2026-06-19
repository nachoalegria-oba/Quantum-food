export function Spinner({ size = 14, className = '' }: { size?: number; className?: string }) {
  return (
    <div
      className={`rounded-full border-2 animate-spin flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        borderColor: '#e2d8c4',
        borderTopColor: '#2a7a50',
      }}
    />
  );
}
