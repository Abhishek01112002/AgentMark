import React from 'react';

interface ResponsiveHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  onBack?: () => void;
}

export const ResponsiveHeader: React.FC<ResponsiveHeaderProps> = ({
  title,
  subtitle,
  badge,
  actions,
  onBack,
}) => {
  return (
    <header className="rounded-2xl border border-white/[0.08] bg-[#12121A]/95 p-4 sm:p-6 md:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            {onBack && (
              <button
                onClick={onBack}
                className="touch-target-sm rounded-xl bg-white/5 hover:bg-white/10 text-xs text-[#94A3B8] hover:text-white transition-all border border-white/10 font-sora font-medium px-2.5 py-1 cursor-pointer"
              >
                ← Back
              </button>
            )}
            {badge}
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight font-sora text-white truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-[#94A3B8] font-sans truncate">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="shrink-0 flex items-center gap-2 self-stretch sm:self-center">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
};
