import { useState, memo } from 'react';
import { CalculatorIcon, ZapIcon, ArrowRightIcon } from '../icons';
import { useNavigate } from 'react-router-dom';

export const RoiCalculatorSection = memo(() => {
  const navigate = useNavigate();
  const [campaignsPerMonth, setCampaignsPerMonth] = useState<number>(8);

  const hoursSaved = campaignsPerMonth * 16;
  const moneySavedInRupees = campaignsPerMonth * 24000;
  const formattedMoney = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(moneySavedInRupees);

  return (
    <section id="roi-calculator" className="relative z-10 w-full overflow-hidden py-12 sm:py-16 md:py-20 lg:py-24">
      <div className="section-veil" />
      <div className="section-aurora aurora-indigo -right-32 top-10 hidden h-96 w-[36rem] lg:block opacity-80" />
      <div className="section-aurora aurora-cyan -left-32 bottom-10 hidden h-80 w-[32rem] lg:block opacity-70" />

      <div className="mx-auto max-w-screen-xl px-3 sm:px-6 md:px-12">
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(99,102,241,0.25)] bg-[#111118] px-3.5 py-1 mb-4 shadow-sm">
            <CalculatorIcon className="w-3.5 h-3.5 text-[#6366F1]" />
            <span className="text-[10px] sm:text-xs font-mono font-semibold uppercase tracking-wider text-[#A5B4FC]">
              Interactive ROI Calculator
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4" style={{ letterSpacing: "-0.01em" }}>
            Calculate Your Time &amp; Cost Savings
          </h2>
          <p className="text-xs sm:text-sm md:text-base max-w-2xl mx-auto px-4" style={{ color: "#8B8B9E" }}>
            See how much agency budget and turnaround time your team recovers using AgentMark's 8-agent AI pipeline.
          </p>
        </div>

        <div className="hover-card glass-card rounded-2xl p-6 sm:p-8 md:p-10 border border-[#2A2A38] bg-[#111118]/90 max-w-4xl mx-auto relative shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Controls */}
            <div className="lg:col-span-6 space-y-6">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-semibold text-[#F1F1F3] font-mono uppercase tracking-wider">
                  Monthly Campaigns Needed
                </label>
                <span className="px-3 py-1 rounded-full bg-[#6366F1]/15 text-[#818CF8] border border-[#6366F1]/30 font-mono text-sm font-bold">
                  {campaignsPerMonth} Campaigns / Mo
                </span>
              </div>

              <div className="space-y-2">
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={campaignsPerMonth}
                  onChange={(e) => setCampaignsPerMonth(Number(e.target.value))}
                  className="w-full h-2.5 rounded-lg appearance-none cursor-pointer bg-[#1A1A24] accent-[#6366F1]"
                />
                <div className="flex justify-between text-[10px] font-mono text-[#8B8B9E]">
                  <span>1 Campaign</span>
                  <span>15 Campaigns</span>
                  <span>30 Campaigns</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0A0A0F] border border-[#2A2A38] space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 font-mono">
                  <ZapIcon className="w-4 h-4" /> Traditional Agency vs AgentMark:
                </div>
                <p className="text-xs text-[#8B8B9E] leading-relaxed">
                  Traditional agencies take <strong>2–3 weeks</strong> and charge ₹25,000+ per campaign draft. AgentMark delivers complete multi-channel assets in <strong>under 90 seconds</strong>.
                </p>
              </div>
            </div>

            {/* Right Live Results */}
            <div className="lg:col-span-6 flex flex-col justify-between p-6 rounded-xl bg-gradient-to-br from-[#161622] to-[#0D0D14] border border-[#2A2A38] space-y-6 shadow-inner">
              <div className="space-y-4">
                <div className="border-b border-[#2A2A38] pb-4">
                  <span className="text-[10px] font-mono uppercase text-[#8B8B9E] block mb-1">
                    Estimated Annual Cost Savings
                  </span>
                  <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#4edea3] to-[#38bdf8]">
                    ₹{formattedMoney} <span className="text-xs text-[#8B8B9E] font-normal">/ year</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[#8B8B9E] block mb-1">
                      Hours Saved / Mo
                    </span>
                    <span className="text-xl sm:text-2xl font-bold text-[#F1F1F3]">
                      {hoursSaved} hrs
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[#8B8B9E] block mb-1">
                      Time to Market
                    </span>
                    <span className="text-xl sm:text-2xl font-bold text-[#A5B4FC]">
                      &lt; 90 Sec
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate('/signup')}
                className="w-full py-3.5 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-[#6366F1] hover:bg-[#4F46E5] text-white flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] active:scale-[0.98] cursor-pointer"
                style={{ fontFamily: 'Sora, sans-serif' }}
              >
                <span>Start Saving Time Now</span>
                <ArrowRightIcon className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
});
