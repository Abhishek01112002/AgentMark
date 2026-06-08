interface NavbarProps {
  onLoginClick: () => void;
  onGetStartedClick: () => void;
}

export const Navbar = ({ onLoginClick, onGetStartedClick }: NavbarProps) => (
  <nav className="fixed top-0 w-full z-50 border-b flex justify-between items-center h-14 sm:h-16 px-3 sm:px-6 md:px-12 bg-[rgba(10,10,15,0.85)] backdrop-blur-xl border-[#2A2A38]">
    <div className="flex items-center gap-2">
      <img src="/Novateches.png" alt="AgentMark Logo" className="h-6 sm:h-7 w-auto" />
      <span className="font-bold text-lg sm:text-xl text-[#F1F1F3]">
        AgentMark
      </span>
    </div>

    <div className="hidden lg:flex items-center gap-6 xl:gap-8">
      {[
        { label: "How It Works", href: "#how-it-works" },
        { label: "Agents", href: "#agents" },
        { label: "Features", href: "#features" },
        { label: "Pricing", href: "#pricing" },
      ].map((item) => (
        <a
          key={item.label}
          href={item.href}
          className="text-xs xl:text-sm font-medium text-[#8B8B9E] hover:text-[#F1F1F3] transition-colors font-mono"
        >
          {item.label}
        </a>
      ))}
    </div>

    <div className="flex items-center gap-2 sm:gap-4">
      <button
        onClick={onLoginClick}
        className="hidden sm:block text-xs md:text-sm font-medium text-[#8B8B9E] hover:text-[#F1F1F3] transition-colors font-mono px-2"
      >
        Login
      </button>
      <button
        onClick={onGetStartedClick}
        className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium bg-[#6366F1] text-[#F1F1F3] hover:bg-[#4F46E5] transition-all font-mono"
      >
        Get Started
      </button>
    </div>
  </nav>
);
