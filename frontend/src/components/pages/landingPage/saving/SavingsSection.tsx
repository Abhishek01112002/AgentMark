export const SavingsSection = () => {
  return (
    <section id="why-agentmark" className="relative z-10 w-full overflow-hidden py-12 sm:py-16 md:py-20 lg:py-24">
      <div className="section-veil" />
      <div className="section-aurora aurora-indigo -left-28 top-12 hidden h-96 w-[34rem] lg:block opacity-80" />
      <div className="section-aurora aurora-cyan -right-28 bottom-4 hidden h-80 w-[32rem] lg:block opacity-70" />
      <div className="section-aurora aurora-deep left-1/2 top-1/2 h-56 w-[42rem] -translate-x-1/2 -translate-y-1/2 opacity-45" />
      
      <div className="mx-auto max-w-screen-xl px-3 sm:px-6 md:px-12">
        <div className="hover-card rounded-xl sm:rounded-2xl p-5 sm:p-8 md:p-10 lg:p-12 text-center overflow-hidden border relative" style={{ background: "#1A1A24", borderColor: "#2A2A38" }}>
          <div className="section-aurora aurora-cyan -right-20 -top-16 h-56 w-72 opacity-55" />
          <div className="section-aurora aurora-indigo -left-20 -bottom-16 h-56 w-72 opacity-55" />

          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4" style={{ letterSpacing: "-0.02em" }}>
            ₹18 Lakh Saved
          </h2>
          <p className="text-xs sm:text-sm md:text-base lg:text-lg mb-6 sm:mb-8 md:mb-10 max-w-2xl mx-auto leading-6 sm:leading-7 px-2 sm:px-4" style={{ color: "#8B8B9E" }}>
            Average annual savings compared to hiring a traditional mid-level
            marketing team.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 md:gap-8">
            {[
              { value: "90%", label: "Cost Reduction" },
              { value: "10x", label: "Campaign Volume" },
              { value: "< 5 Mins", label: "Time to Market" },
            ].map((stat, i) => (
              <div
                key={i}
                className="py-4 sm:py-5 md:py-0 border-b sm:border-b-0 last:border-b-0 sm:border-r sm:last:border-r-0"
                style={{ borderColor: "#2A2A38" }}
              >
                <div className="text-xl sm:text-2xl md:text-3xl font-semibold text-indigo-400 mb-1.5 sm:mb-2">
                  {stat.value}
                </div>
                <div
                  className="text-[9px] sm:text-[10px] md:text-xs lg:text-sm uppercase tracking-wider sm:tracking-widest"
                  style={{
                    color: "#8B8B9E",
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
