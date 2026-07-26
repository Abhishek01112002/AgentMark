import React from 'react';

interface GlobalSpinnerProps {
  fullPage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  sublabel?: string;
}

export const GlobalSpinner: React.FC<GlobalSpinnerProps> = ({
  fullPage = false,
  size = 'lg',
  label = 'AgentMark',
}) => {
  // Apple 12-Spoke Radial Activity Indicator
  const spokes = Array.from({ length: 12 }, (_, i) => ({
    angle: i * 30,
    delay: (-((12 - i) / 12)).toFixed(3),
  }));

  if (size === 'sm') {
    return (
      <div className="relative w-4 h-4 flex items-center justify-center">
        {spokes.map((s, i) => (
          <div
            key={i}
            className="absolute w-[1.5px] h-[4px] bg-[#818CF8] rounded-full apple-spinner-spoke"
            style={{
              transform: `rotate(${s.angle}deg) translateY(-5px)`,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}
      </div>
    );
  }

  if (size === 'md') {
    return (
      <div className="flex flex-col items-center justify-center p-6 gap-3">
        <div className="relative w-7 h-7 flex items-center justify-center">
          {spokes.map((s, i) => (
            <div
              key={i}
              className="absolute w-[2px] h-[7px] bg-[#818CF8] rounded-full apple-spinner-spoke"
              style={{
                transform: `rotate(${s.angle}deg) translateY(-9px)`,
                animationDelay: `${s.delay}s`,
              }}
            />
          ))}
        </div>
        {label && (
          <span className="text-[11px] font-medium text-[#8B8B9E] tracking-widest uppercase font-sora">{label}</span>
        )}
      </div>
    );
  }

  const content = (
    <div className="relative flex flex-col items-center justify-center text-center select-none">
      {/* 🍏 APPLE / macOS SYSTEM LUXURY GLASSMOUR CARD */}
      <div className="bg-[#12121A]/80 border border-[#2A2A38] backdrop-blur-2xl rounded-2xl p-7 flex flex-col items-center justify-center gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.6)] relative overflow-hidden">
        {/* Subtle Top Ambient Hairline */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#6366F1]/40 to-transparent" />
        
        {/* Apple 12-Spoke Radial Activity Indicator Ring */}
        <div className="relative w-9 h-9 flex items-center justify-center">
          {spokes.map((s, i) => (
            <div
              key={i}
              className="absolute w-[2.5px] h-[9px] bg-gradient-to-b from-[#818CF8] to-[#6366F1] rounded-full apple-spinner-spoke"
              style={{
                transform: `rotate(${s.angle}deg) translateY(-12px)`,
                animationDelay: `${s.delay}s`,
              }}
            />
          ))}
        </div>

        {/* Minimalist Apple Typography */}
        <span className="text-[11px] font-semibold text-[#F1F1F3] tracking-[0.25em] uppercase font-sora opacity-85">
          {label}
        </span>
      </div>
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#07070D] relative overflow-hidden">
        {content}
      </div>
    );
  }

  return content;
};

export default GlobalSpinner;
