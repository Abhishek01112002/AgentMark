export const Footer = () => (
  <footer className="border-t w-full py-8 sm:py-10 md:py-12 bg-[#111118] border-[#2A2A38] relative overflow-hidden">
    <div className="pointer-events-none absolute left-1/2 top-0 h-20 sm:h-28 w-[20rem] sm:w-[30rem] -translate-x-1/2 rounded-full bg-[rgba(99,102,241,0.06)] blur-3xl" />
    <div className="max-w-screen-xl mx-auto px-3 sm:px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6 relative z-10">
      <div className="flex items-center gap-2">
        <img src="/Novateches.png" alt="AgentMark Logo" className="h-5 sm:h-6 w-auto" />
        <span className="text-lg sm:text-xl font-bold">
          AgentMark
        </span>
      </div>

      <div className="flex gap-4 sm:gap-6 text-[10px] sm:text-xs font-mono">
        {["Privacy", "Terms", "GitHub"].map((link) => (
          <a
            key={link}
            href="#"
            className="text-[#4A4A5E] hover:text-[#F1F1F3] transition-colors"
          >
            {link}
          </a>
        ))}
      </div>

      <div className="text-[10px] sm:text-xs md:text-sm text-[#4A4A5E] text-center md:text-right">
        © 2025 Novateches Software Pvt Ltd. All rights reserved.
      </div>
    </div>
  </footer>
);
