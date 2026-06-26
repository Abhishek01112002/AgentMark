import { useState } from 'react';
import PrivacyTermsModal from '../../../shared/PrivacyTermsModal';

export const Footer = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'privacy' | 'terms'>('privacy');

  const openModal = (type: 'privacy' | 'terms') => {
    setModalType(type);
    setModalOpen(true);
  };

  return (
    <>
      <footer className="border-t w-full py-8 sm:py-10 md:py-12 bg-[#111118] border-[#2A2A38] relative overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-0 h-20 sm:h-28 w-[20rem] sm:w-[30rem] -translate-x-1/2 rounded-full bg-[rgba(99,102,241,0.06)] blur-3xl" />
        <div className="max-w-screen-xl mx-auto px-3 sm:px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6 relative z-10 w-full">
          
          {/* Left: Logo */}
          <div className="flex items-center gap-2">
            <img src="/novateches.png" alt="AgentMark Logo" className="h-5 sm:h-6 w-auto" />
            <span className="text-lg sm:text-xl font-bold">
              AgentMark
            </span>
          </div>

          {/* Center: Privacy Policy and Terms of Service */}
          <div className="flex gap-8 justify-center text-xs font-mono">
            <button
              onClick={() => openModal('privacy')}
              className="text-[#4A4A5E] hover:text-[#F1F1F3] transition-colors bg-transparent border-none cursor-pointer p-0 font-mono text-xs"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => openModal('terms')}
              className="text-[#4A4A5E] hover:text-[#F1F1F3] transition-colors bg-transparent border-none cursor-pointer p-0 font-mono text-xs"
            >
              Terms of Service
            </button>
          </div>

          {/* Right: Copyright */}
          <div className="text-xs font-mono text-[#4A4A5E] text-center md:text-right">
            © 2025 Novateches Software Pvt Ltd. All rights reserved.
          </div>

        </div>
      </footer>

      <PrivacyTermsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        type={modalType}
      />
    </>
  );
};
