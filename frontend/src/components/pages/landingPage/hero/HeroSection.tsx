import { useNavigate } from 'react-router-dom';
import { SparklesIcon, ArrowRightIcon } from '../icons';

export const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <header className="min-h-screen w-screen pt-16 sm:pt-20 pb-8 sm:pb-12 text-center relative flex flex-col justify-center overflow-hidden">
      {/* Ambient glow - responsive sizes */}
      <div className="section-veil" />
      <div className="section-aurora aurora-indigo left-1/2 top-[-2rem] sm:top-[-4rem] h-[360px] sm:h-[460px] md:h-[560px] w-[600px] sm:w-[750px] md:w-[900px] -translate-x-1/2" />
      <div className="section-aurora aurora-cyan left-[-5rem] sm:left-[2%] top-[12%] sm:top-[16%] h-48 w-60 sm:h-64 sm:w-80 md:h-80 md:w-96 opacity-70" />
      <div className="section-aurora aurora-deep right-[-5rem] sm:right-[2%] top-[24%] sm:top-[28%] h-44 w-56 sm:h-56 sm:w-72 md:h-72 md:w-96 opacity-75" />
      <div className="section-aurora aurora-indigo bottom-[-3rem] left-1/2 h-32 w-[22rem] sm:h-40 sm:w-[32rem] md:h-52 md:w-[44rem] -translate-x-1/2 opacity-55" />

      {/* Centered content container (keeps text readable, but hero spans full viewport width) */}
      <div className="relative max-w-screen-xl mx-auto w-full px-3 sm:px-6 md:px-12 flex flex-col items-stretch">
        {/* Badge */}
        <div className="relative mx-auto inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-[rgba(99,102,241,0.25)] bg-[#111118] px-3 sm:px-4 py-1 sm:py-1.5 mb-5 sm:mb-7">
          <SparklesIcon className="w-3 h-3 sm:w-4 sm:h-4 text-[#6366F1]" />
          <span className="text-[10px] sm:text-[11px] md:text-xs font-medium uppercase tracking-[0.18em] sm:tracking-[0.22em] text-[#8B8B9E] font-mono">
            Advanced Agentic AI
          </span>
        </div>

        <h1 className="mx-auto max-w-[20rem] px-5 text-[1.55rem] leading-[1.15] tracking-normal font-bold sm:max-w-4xl sm:px-4 sm:text-[2.45rem] sm:leading-[1.06] sm:tracking-[-0.04em] md:text-5xl lg:text-6xl xl:text-[4.1rem]">
          An Entire Marketing<br />
          <span className="inline sm:inline">Department in a </span>
          <span className="text-[#6366F1]">Single</span>
          <br />
          <span className="text-[#6366F1]">Prompt.</span>
        </h1>

        <p className="mx-auto mt-4 sm:mt-6 max-w-3xl text-[0.875rem] sm:text-[0.98rem] md:text-[1.05rem] lg:text-[1.1rem] leading-[1.55] sm:leading-[1.65] text-[#8B8B9E] px-4 sm:px-6">
          Deploy a specialized team of 7 autonomous AI agents. From strategy
          and research to copywriting and visual generation, execute
          high-converting campaigns instantly.
        </p>

        <div className="mt-6 sm:mt-8 md:mt-10 flex w-full flex-row flex-wrap items-center justify-center gap-2 sm:gap-4 mb-8 sm:mb-12 px-4">
          <button
            onClick={() => navigate('/signup')}
            className="flex w-auto items-center justify-center gap-1.5 sm:gap-2 rounded-md bg-[#6366F1] px-4 sm:px-6 py-3 min-h-[44px] text-[11px] sm:text-xs font-bold text-[#F1F1F3] transition-all hover:bg-[#4F46E5] hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] font-mono"
          >
            Start Your Campaign
            <ArrowRightIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
          <button
            className="flex w-auto items-center justify-center gap-1.5 sm:gap-2 rounded-md border border-[#2A2A38] bg-[#111118] px-4 sm:px-6 py-3 min-h-[44px] text-[11px] sm:text-xs font-bold text-[#F1F1F3] transition-all hover:bg-[#1A1A24] font-mono"
          >
            View Demo
          </button>
        </div>

        <p className="px-2 text-[9px] sm:text-[10px] uppercase tracking-[0.28em] sm:tracking-[0.35em] text-[#4A4A5E] font-mono font-bold">
          Trusted by forward-thinking marketing teams
        </p>
      </div>
    </header>
  );
};

