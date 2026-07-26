import React from 'react';

interface ResponsiveGridProps {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4;
  className?: string;
  gap?: 'sm' | 'md' | 'lg';
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  cols = 3,
  className = '',
  gap = 'md',
}) => {
  const gapStyles = {
    sm: 'gap-3 sm:gap-4',
    md: 'gap-4 md:gap-6',
    lg: 'gap-6 md:gap-8',
  };

  const colStyles = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  };

  return (
    <div className={`grid ${colStyles[cols]} ${gapStyles[gap]} ${className}`}>
      {children}
    </div>
  );
};
