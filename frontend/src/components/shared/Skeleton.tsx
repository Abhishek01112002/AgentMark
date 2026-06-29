import React from 'react';

export function Skeleton({ width = '100%', height = '20px' }: { width?: string, height?: string }) {
  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
      <div style={{
        width,
        height,
        background: 'var(--surface-1, #1A1A24)',
        borderRadius: 'var(--radius, 8px)',
        animation: 'pulse 1.5s ease-in-out infinite',
      }} />
    </>
  );
}
