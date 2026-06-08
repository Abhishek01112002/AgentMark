import { useNavigate } from 'react-router-dom';
import { Navbar } from './navbar/Navbar';
import { HeroSection } from './hero/HeroSection';
import { WorkflowSection } from './workflow/WorkflowSection';
import { TeamSection } from './teams/TeamSection';
import { ScaleSection } from './scale/ScaleSection';
import { SavingsSection } from './saving/SavingsSection';
import { Footer } from './footer/Footer';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen overflow-x-hidden antialiased bg-[#0A0A0F] text-[#F1F1F3]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=JetBrains+Mono:wght@500&display=swap');

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes scan {
          0% { transform: translateX(-120%); opacity: 0; }
          10% { opacity: 0.8; }
          50% { opacity: 0.55; }
          100% { transform: translateX(120%); opacity: 0; }
        }
        .pulse-anim {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .float-slow {
          animation: floatSlow 6s ease-in-out infinite;
        }
        .scan-line {
          animation: scan 4.5s linear infinite;
        }
        .hover-card {
          position: relative;
          overflow: hidden;
          transition: transform 280ms ease, border-color 280ms ease, box-shadow 280ms ease, background 280ms ease;
        }
        .hover-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at top, rgba(99,102,241,0.12), transparent 58%);
          opacity: 0;
          transition: opacity 280ms ease;
          pointer-events: none;
        }
        .hover-card::after {
          content: '';
          position: absolute;
          inset: auto -20% -30% -20%;
          height: 55%;
          background: linear-gradient(180deg, transparent, rgba(99,102,241,0.08));
          opacity: 0;
          filter: blur(14px);
          transition: opacity 280ms ease;
          pointer-events: none;
        }
        .hover-card:hover {
          transform: translateY(-4px);
          border-color: rgba(99, 102, 241, 0.45) !important;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.32);
        }
        .hover-card:hover svg {
          filter: drop-shadow(0 0 10px rgba(99,102,241,0.35));
        }
        .hover-card:hover::before,
        .hover-card:hover::after {
          opacity: 1;
        }
        .glass-card {
          background: rgba(17, 17, 24, 0.7);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(42, 42, 56, 0.5);
        }
        .section-aurora {
          position: absolute;
          pointer-events: none;
          border-radius: 9999px;
          filter: blur(72px);
          opacity: 0.9;
          mix-blend-mode: screen;
        }
        .aurora-indigo {
          background:
            radial-gradient(circle at 35% 35%, rgba(99,102,241,0.18), transparent 52%),
            radial-gradient(circle at 70% 65%, rgba(56,189,248,0.09), transparent 62%);
        }
        .aurora-cyan {
          background:
            radial-gradient(circle at 45% 35%, rgba(56,189,248,0.14), transparent 54%),
            radial-gradient(circle at 70% 70%, rgba(99,102,241,0.11), transparent 64%);
        }
        .aurora-deep {
          background:
            radial-gradient(circle at 30% 40%, rgba(79,70,229,0.16), transparent 56%),
            radial-gradient(circle at 75% 50%, rgba(14,165,233,0.08), transparent 66%);
        }
        .section-veil {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(90deg, rgba(99,102,241,0.035), transparent 22%, transparent 78%, rgba(56,189,248,0.035)),
            radial-gradient(ellipse at center, rgba(255,255,255,0.018), transparent 62%);
        }
        
        @media (max-width: 640px) {
          .hover-card:hover {
            transform: translateY(-2px);
          }
        }
      `}</style>

      <Navbar
        onLoginClick={() => navigate('/login')}
        onGetStartedClick={() => navigate('/signup')}
      />

      <HeroSection />

      <main className="relative w-full overflow-hidden">
        <div className="pointer-events-none absolute left-[-4rem] sm:left-[-6rem] top-20 h-48 w-48 sm:h-64 sm:w-64 rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.12)_0%,rgba(99,102,241,0.04)_58%,transparent_80%)] blur-3xl" />
        <div className="pointer-events-none absolute right-[-3rem] sm:right-[-4rem] top-[28rem] sm:top-[34rem] h-56 w-56 sm:h-72 sm:w-72 rounded-full bg-[radial-gradient(circle,rgba(129,140,248,0.12)_0%,rgba(129,140,248,0.04)_58%,transparent_80%)] blur-3xl" />
        <div className="pointer-events-none absolute left-1/2 top-[50rem] sm:top-[62rem] h-48 w-[24rem] sm:h-64 sm:w-[32rem] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.08)_0%,transparent_72%)] blur-3xl" />

        <WorkflowSection />
        <TeamSection />
        <ScaleSection />
        <SavingsSection />
      </main>

      <Footer />
    </div>
  );
}
