
export function Skeleton({ width = '100%', height = '20px' }: { width?: string, height?: string }) {
  return (
    <div
      className="bg-surface-container-low rounded-lg animate-pulse"
      style={{ width, height }}
    />
  );
}
