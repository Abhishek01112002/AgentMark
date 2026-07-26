import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface ResponsiveStatCardProps {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  trend?: string;
  trendLabel?: string;
  iconBg: string;
  iconColor: string;
  pulse?: boolean;
}

export const ResponsiveStatCard: React.FC<ResponsiveStatCardProps> = ({
  icon: Icon,
  label,
  value,
  trend,
  trendLabel,
  iconBg,
  iconColor,
  pulse,
}) => {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-4 sm:p-5 group transition-all duration-200 border border-[#2A2A38] bg-[#111118] hover:border-[#3A3A4C]"
    >
      {pulse && (
        <div
          className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none"
          style={{ backgroundColor: 'rgba(99,102,241,0.05)', filter: 'blur(40px)' }}
        />
      )}
      <div className="flex justify-between items-start mb-3 sm:mb-4 relative z-10">
        <div className="min-w-0">
          <p
            className="truncate text-[11px] sm:text-xs font-mono font-medium tracking-wider text-[#8B8B9E] uppercase mb-1"
          >
            {label}
          </p>
          <div
            className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight font-sora text-[#F1F1F3] flex items-center gap-2.5"
          >
            {value}
            {pulse && (
              <span
                className="w-2 h-2 rounded-full flex-shrink-0 bg-[#4edea3] animate-pulse"
              />
            )}
          </div>
        </div>
        <div
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
          style={{ backgroundColor: iconBg }}
        >
          <Icon size={18} style={{ color: iconColor, filter: `drop-shadow(0 0 6px ${iconColor}cc)` }} />
        </div>
      </div>
      {(trend || trendLabel) && (
        <div
          className="flex flex-wrap items-center gap-2 relative z-10 text-[11px] font-mono font-medium"
        >
          {trend && (
            <span className="flex items-center text-[#4edea3]">
              <span className="mr-1">↑</span>
              {trend}
            </span>
          )}
          {trendLabel && <span className="text-[#8B8B9E]">{trendLabel}</span>}
        </div>
      )}
    </div>
  );
};
