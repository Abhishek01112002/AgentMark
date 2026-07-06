import React from 'react';
import { X, Shield, FileText } from 'lucide-react';

interface PrivacyTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'privacy' | 'terms';
}

const PrivacyTermsModal: React.FC<PrivacyTermsModalProps> = ({ isOpen, onClose, type }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 modal-overlay">
      {/* Dim Overlay */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
      />
      
      {/* Modal Container */}
      <div 
        className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border bg-[#0d0d14] text-[#F1F1F3] overflow-hidden shadow-2xl modal-content"
        style={{ 
          borderColor: 'rgba(192, 193, 255, 0.15)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e2b]" style={{ background: '#0d0d14' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              {type === 'privacy' ? <Shield size={18} /> : <FileText size={18} />}
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-widest font-mono text-[#4A4A5E]">Legal Documents</p>
              <h2 className="text-base font-semibold font-sans">
                {type === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
              </h2>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#1e1e2b] text-[#8B8B9E] hover:text-[#F1F1F3] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div 
          className="flex-1 p-6 overflow-y-auto space-y-6 text-sm leading-relaxed text-[#8B8B9E] font-sans"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2A38 transparent' }}
        >
          {type === 'privacy' ? (
            <>
              <div>
                <h3 className="text-sm font-semibold text-[#c0c1ff] mb-2 font-mono uppercase tracking-wider">1. Overview</h3>
                <p>
                  AgentMark is an AI-powered campaign orchestration and automation platform. This Privacy Policy outlines the platform's commitment to processing, protecting, and managing campaign configurations, API credentials, and generated assets.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[#c0c1ff] mb-2 font-mono uppercase tracking-wider">2. Data Collection</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong className="text-[#F1F1F3]">Account Details:</strong> Registration credentials such as name, email address, password, and enterprise role settings are collected during account creation.
                  </li>
                  <li>
                    <strong className="text-[#F1F1F3]">API Credentials:</strong> Any API keys (e.g., Google Gemini, Groq, or Anthropic) provided to run generation sequences are stored securely on the client-side (local browser storage) or in encrypted variables.
                  </li>
                  <li>
                    <strong className="text-[#F1F1F3]">Campaign Inputs:</strong> Target demographics, brand guidelines, industry classifications, competitor parameters, and primary campaign goals provided to generate marketing creatives.
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[#c0c1ff] mb-2 font-mono uppercase tracking-wider">3. AI Processing & Third-Party Models</h3>
                <p>
                  To deliver campaign content, campaign inputs are routed through advanced language models via secure APIs. The platform does not use proprietary campaign data, prompts, or branding assets to train generic AI models. API keys are transmitted directly to the respective providers (such as Google or Groq) solely to execute generation requests.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[#c0c1ff] mb-2 font-mono uppercase tracking-wider">4. Third-Party Integrations</h3>
                <p>
                  The Publisher agent communicates with external ad networks and social platforms (such as LinkedIn and Google Ads) to queue drafts. Use of these services is subject to the terms and privacy frameworks of the respective third-party providers.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[#c0c1ff] mb-2 font-mono uppercase tracking-wider">5. Security & Retention</h3>
                <p>
                  The system employs rigorous client-side encryption and server-side authentication headers. Account information is retained for the active lifecycle of the team workspace. Users can request complete deletion of their account and related campaign logs at any time.
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <h3 className="text-sm font-semibold text-[#c0c1ff] mb-2 font-mono uppercase tracking-wider">1. Agreement to Terms</h3>
                <p>
                  By registering an account and using AgentMark, you agree to comply with and be bound by these Terms of Service, along with all applicable advertising regulations and guidelines.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[#c0c1ff] mb-2 font-mono uppercase tracking-wider">2. Account Responsibility</h3>
                <p>
                  You are solely responsible for maintaining the confidentiality of your workspace password, API tokens, and access privileges. Any generation costs incurred on third-party AI keys loaded into AgentMark are your sole responsibility.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[#c0c1ff] mb-2 font-mono uppercase tracking-wider">3. Content Ownership & AI Output</h3>
                <p>
                  Users retain complete intellectual property ownership over the prompts and inputs fed to the platform, as well as the generated copywriting, visual prompts, and calendars. Users acknowledge that AI-generated output is advisory in nature and must be reviewed via the Human-in-the-Loop checkpoint drawer before publication. The platform is not responsible for compliance violations or copyright claims in final published assets.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[#c0c1ff] mb-2 font-mono uppercase tracking-wider">4. Platform Fair Use</h3>
                <p>
                  You agree not to use the multi-agent pipeline to generate malicious copy, distribute spam, bypass rate limits, or orchestrate misleading marketing campaigns. Violation of fair use policies will result in immediate suspension of account privileges.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[#c0c1ff] mb-2 font-mono uppercase tracking-wider">5. Warranty Disclaimer</h3>
                <p>
                  AgentMark is provided on an "as is" and "as available" basis. We make no guarantees regarding LLM availability, publisher API uptimes, or specific conversion rate improvements.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1e1e2b] flex justify-end" style={{ background: '#0a0a0f' }}>
          <button 
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyTermsModal;
