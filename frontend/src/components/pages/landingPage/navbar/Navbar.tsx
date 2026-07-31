import { useState, memo } from 'react';

interface NavbarProps {
  onLoginClick: () => void;
  onGetStartedClick: () => void;
}

const navItems = [
  { label: "How It Works", href: "#workflow" },
  { label: "Agents", href: "#agents" },
  { label: "Features", href: "#features-showcase" },
  { label: "Scale", href: "#features" },
  { label: "Why AgentMark", href: "#savings" },
];

export const Navbar = memo(({ onLoginClick, onGetStartedClick }: NavbarProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full z-50 border-b flex justify-between items-center h-14 sm:h-16 px-3 sm:px-6 md:px-12 bg-[rgba(10,10,15,0.85)] backdrop-blur-xl border-[#2A2A38]">
      <div className="flex items-center gap-2">
        <img src="/novateches.png" alt="AgentMark Logo" width="28" height="28" fetchPriority="high" className="h-6 sm:h-7 w-auto" />
        <span className="font-bold text-lg sm:text-xl text-[#F1F1F3]">
          AgentMark
        </span>
      </div>

      <div className="hidden lg:flex items-center gap-6 xl:gap-8">
        {navItems.map((item) => (
          <a
            key={item.label}
            href={item.href}
            className="text-xs xl:text-sm font-medium text-[#8B8B9E] hover:text-[#F1F1F3] transition-colors "
          >
            {item.label}
          </a>
        ))}
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <button
          onClick={onLoginClick}
          className="hidden sm:block text-xs md:text-sm font-medium text-[#8B8B9E] hover:text-[#F1F1F3] transition-colors  px-2"
        >
          Login
        </button>
        <button
          onClick={onGetStartedClick}
          className="px-4 py-3 min-h-[44px] rounded-lg text-xs sm:text-sm font-medium bg-[#6366F1] text-[#F1F1F3] hover:bg-[#4F46E5] transition-all  flex items-center justify-center"
        >
          Get Started
        </button>

        {/* Mobile hamburger */}
        <button
          className="lg:hidden p-2.5 -mr-2 flex-shrink-0 text-[#8B8B9E] hover:text-[#F1F1F3] transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>
      </div>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        >
          <div
            className="fixed top-0 right-0 h-full w-64 max-w-[75vw] p-6 flex flex-col"
            style={{ backgroundColor: '#16161E', borderLeft: '1px solid #2A2A38' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end mb-8">
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2.5 text-[#8B8B9E] hover:text-[#F1F1F3] transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                aria-label="Close menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-sm font-medium text-[#8B8B9E] hover:text-[#F1F1F3] transition-colors  py-2 border-b border-[#2A2A38]/50"
                >
                  {item.label}
                </a>
              ))}
            </div>

            <div className="mt-auto flex flex-col gap-3 pt-8 border-t border-[#2A2A38]/50">
              <button
                onClick={() => { setMobileOpen(false); onLoginClick(); }}
                className="w-full text-sm font-medium text-[#8B8B9E] hover:text-[#F1F1F3] transition-colors  py-3 min-h-[44px] flex items-center justify-center"
              >
                Login
              </button>
              <button
                onClick={() => { setMobileOpen(false); onGetStartedClick(); }}
                className="w-full py-3 min-h-[44px] rounded-lg text-sm font-medium bg-[#6366F1] text-[#F1F1F3] hover:bg-[#4F46E5] transition-all  flex items-center justify-center"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
});
