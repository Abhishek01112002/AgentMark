import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail, Lock, Eye, EyeOff, User, Search, FileText, Image, Play,
  UserPlus, Quote, Zap, BarChart2, Users, ArrowLeft, Shield, Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../contexts/AuthContext';

const SignUp = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      return;
    }

    if (formData.password.length < 6) {
      return;
    }

    setIsLoading(true);
    try {
      await signup(formData.email, formData.password, formData.name);
      navigate('/dashboard');
    } catch (error) {
      // Error handling is done in AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-[#1C1C26]', textColor: 'text-gray-500' };
    let score = 0;
    if (pass.length >= 6) score++;
    if (/[a-z]/.test(pass) && /[0-9]/.test(pass)) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (pass.length >= 8 && /[^A-Za-z0-9]/.test(pass)) score++;
    score = Math.max(1, score);
    switch (score) {
      case 1: return { score: 1, label: 'Weak',        color: 'bg-rose-500',    textColor: 'text-rose-500'    };
      case 2: return { score: 2, label: 'Fair',        color: 'bg-amber-500',   textColor: 'text-amber-500'   };
      case 3: return { score: 3, label: 'Strong',      color: 'bg-emerald-500', textColor: 'text-emerald-500' };
      case 4: return { score: 4, label: 'Very Strong', color: 'bg-emerald-400', textColor: 'text-emerald-400' };
      default: return { score: 1, label: 'Weak',       color: 'bg-rose-500',    textColor: 'text-rose-500'    };
    }
  };

  const strength = getPasswordStrength(formData.password);

  const steps = [
    { label: 'Research', icon: Search, active: false },
    { label: 'Copy', icon: FileText, active: false },
    { label: 'Visuals', icon: Image, active: true },
    { label: 'Publish', icon: Play, active: false },
  ];

  const stats = [
    { value: '10x', label: 'Campaign Volume', icon: BarChart2 },
    { value: '90%', label: 'Cost Reduction', icon: Zap },
    { value: '5k+', label: 'Teams Onboarded', icon: Users },
  ];

  const features = [
    { icon: Zap, text: 'Launch full campaigns from a single prompt' },
    { icon: Shield, text: 'Brand voice guardrails enforced automatically' },
    { icon: Sparkles, text: 'Omnichannel assets ready in under 5 minutes' },
  ];

  return (
    <>
      <style>{`
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-left  { animation: slideInLeft  0.5s ease forwards; }
        .animate-slide-right { animation: slideInRight 0.5s ease forwards; }
      `}</style>

      <div className={`min-h-screen h-screen flex flex-col md:flex-row bg-[#0A0A0F] antialiased overflow-hidden transition-opacity duration-500 ${flipped ? 'opacity-0' : 'opacity-100'}`}>
        {/* LEFT — Form */}
        <div className={`w-full md:w-1/2 bg-[#0A0A0F] overflow-y-auto ${mounted ? 'animate-slide-left' : 'opacity-0'}`}>
          <div className="relative flex flex-col justify-center items-center w-full h-full px-6 sm:px-8 lg:px-12 xl:px-14 py-8 lg:py-12">
            <div className="absolute top-1/4 left-0 w-64 h-64 bg-indigo-600/8 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-0 w-48 h-48 bg-violet-600/8 rounded-full blur-[80px] pointer-events-none" />

            <div className="absolute top-6 left-6 flex md:hidden items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-9 h-9 rounded-lg bg-[#111118] border border-[#2A2A38] flex items-center justify-center">
                <img src="/Novateches.png" alt="AgentMark" className="h-5 w-5" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              </div>
              <span className="text-base font-bold text-white">AgentMark</span>
            </div>

            <div className="w-full max-w-[360px] mt-10 md:mt-0">
              <div className="mb-6 lg:mb-7">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-3 lg:mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  <span className="text-[9px] lg:text-[10px] font-semibold text-indigo-400 tracking-widest uppercase">Get Started Free</span>
                </div>
                <h2 className="text-xl lg:text-2xl xl:text-3xl font-bold text-white tracking-tight leading-tight mb-1.5">Create your<br />account</h2>
                <p className="text-xs lg:text-sm text-gray-500">Start generating campaigns in minutes.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3.5 lg:space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] lg:text-[10px] font-bold text-gray-500 tracking-widest uppercase">Full Name</label>
                  <div className="relative group">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors" size={15} />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value.replace(/[^a-zA-Z\s]/g, '') }))}
                      className="w-full pl-10 pr-4 py-2.5 lg:py-3 bg-[#111118] border border-[#2A2A38] rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all hover:border-[#3A3A4E]"
                      placeholder="John Doe"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] lg:text-[10px] font-bold text-gray-500 tracking-widest uppercase">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors" size={15} />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2.5 lg:py-3 bg-[#111118] border border-[#2A2A38] rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all hover:border-[#3A3A4E]"
                      placeholder="you@company.com"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] lg:text-[10px] font-bold text-gray-500 tracking-widest uppercase">Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors" size={15} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full pl-10 pr-11 py-2.5 lg:py-3 bg-[#111118] border border-[#2A2A38] rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all hover:border-[#3A3A4E]"
                      placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>

                  {formData.password && (
                    <div className="mt-2">
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4].map((bar) => (
                          <div key={bar} className={`h-1 flex-1 rounded-full transition-all duration-300 ${bar <= strength.score ? strength.color : 'bg-[#1C1C26]'}`} />
                        ))}
                      </div>
                      <div className={`text-[9px] lg:text-[10px] font-bold text-right mt-1.5 tracking-wider ${strength.textColor}`}>
                        {strength.label}
                      </div>
                    </div>
                  )}
                </div>

                <button type="submit" disabled={isLoading} className="w-full mt-2 flex items-center justify-center gap-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 lg:py-3.5 rounded-xl text-sm transition-all duration-200 shadow-[0_4px_20px_rgba(99,102,241,0.25)] hover:shadow-[0_6px_28px_rgba(99,102,241,0.4)] hover:-translate-y-0.5 active:translate-y-0 group disabled:opacity-50 disabled:cursor-not-allowed">
                  {!isLoading && <UserPlus size={15} className="group-hover:scale-110 transition-transform" />}
                  <span>{isLoading ? 'Creating Account...' : 'Create Account'}</span>
                </button>
              </form>

              <p className="text-center mt-3 lg:mt-4 text-[9px] lg:text-[10px] text-gray-600 leading-relaxed px-2">
                By signing up you agree to our{' '}
                <button onClick={() => toast.error('Coming soon!')} className="text-indigo-400 hover:underline">Terms</button>
                {' '}and{' '}
                <button onClick={() => toast.error('Coming soon!')} className="text-indigo-400 hover:underline">Privacy Policy</button>.
              </p>

              <div className="relative my-4 lg:my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#1C1C26]" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 text-[9px] lg:text-[10px] text-gray-600 bg-[#0A0A0F]">OR</span>
                </div>
              </div>

              <button onClick={() => { setFlipped(true); setTimeout(() => navigate('/login'), 500); }} className="w-full flex items-center justify-center gap-2 border border-[#2A2A38] hover:border-indigo-500/40 text-gray-400 hover:text-white py-2.5 lg:py-3 rounded-xl text-sm font-medium transition-all duration-200 hover:bg-indigo-500/5 group">
                <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                <span>Already have an account? Sign in</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT — Brand (desktop only) */}
        <div className={`hidden md:flex md:w-1/2 border-l border-[#1C1C26] overflow-y-auto ${mounted ? 'animate-slide-right' : 'opacity-0'}`}>
          <div className="relative flex flex-col justify-between h-full w-full p-6 sm:p-8 lg:p-12 xl:p-16 overflow-hidden">
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute top-1/2 -left-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute -bottom-20 right-1/3 w-64 h-64 bg-violet-600/15 rounded-full blur-[100px] pointer-events-none" />

            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `linear-gradient(rgba(99,102,241,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.5) 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />

            <div className="relative z-10 flex items-center gap-3 cursor-pointer group flex-shrink-0" onClick={() => navigate('/')}>
              <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-xl bg-[#111118] border border-[#2A2A38] flex items-center justify-center group-hover:border-indigo-500/50 transition-colors">
                <img src="/Novateches.png" alt="AgentMark" className="h-5 w-5 lg:h-6 lg:w-6" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              </div>
              <span className="text-lg lg:text-xl xl:text-2xl font-bold text-white tracking-tight">AgentMark</span>
            </div>

            <div className="relative z-10 flex-1 flex flex-col justify-center py-6 lg:py-8 min-h-0">
              <div className="mb-6 lg:mb-10">
                <Quote className="text-indigo-500/40 w-8 h-8 lg:w-10 lg:h-10 xl:w-12 xl:h-12 mb-3 lg:mb-4" />
                <p className="text-sm lg:text-base xl:text-xl 2xl:text-2xl font-medium text-white leading-relaxed mb-4 lg:mb-6">
                  "We replaced our ₹1.8L/month marketing team with AgentMark. The AI pipeline generates copy, strategy, and visuals flawlessly."
                </p>
                <div className="flex items-center gap-3">
                  <img src="/DeepakYadav.png" alt="Deepak Yadav" className="w-10 h-10 lg:w-12 lg:h-12 xl:w-14 xl:h-14 rounded-full object-cover border border-[#2A2A38] bg-gray-800 flex-shrink-0" onError={(e) => { (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop"; }} />
                  <div>
                    <h4 className="text-xs lg:text-sm xl:text-base font-semibold text-white">Deepak Yadav</h4>
                    <p className="text-[10px] lg:text-xs xl:text-sm text-gray-500">Co-Founder, NovaTeches</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 lg:space-y-3 mb-6 lg:mb-10">
                {features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2.5 lg:gap-3 group">
                    <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-500/20 transition-colors">
                      <f.icon size={14} className="text-indigo-400" />
                    </div>
                    <span className="text-xs lg:text-sm text-gray-400">{f.text}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2 lg:gap-3 mb-6 lg:mb-0">
                {stats.map((s, i) => (
                  <div key={i} className="bg-[#111118]/60 border border-[#2A2A38] rounded-xl p-2.5 lg:p-3 xl:p-4 text-center">
                    <div className="text-base lg:text-lg xl:text-2xl font-bold text-indigo-400 mb-0.5">{s.value}</div>
                    <div className="text-[8px] lg:text-[9px] xl:text-[10px] text-gray-500 leading-tight">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative z-10 w-full bg-[#111118]/80 backdrop-blur border border-[#2A2A38] rounded-xl p-3.5 lg:p-4 xl:p-5 flex-shrink-0">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <span className="text-[8px] lg:text-[9px] xl:text-[10px] font-bold text-gray-500 tracking-widest uppercase">Active Pipeline</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[8px] lg:text-[9px] xl:text-[10px] font-semibold text-emerald-500 tracking-wide">Live</span>
                </div>
              </div>
              <div className="flex justify-between items-center relative px-2">
                <div className="absolute top-4 lg:top-5 xl:top-6 left-6 lg:left-8 right-6 lg:right-8 h-[1px] bg-[#2A2A38] z-0" />
                {steps.map((step, idx) => {
                  const Icon = step.icon;
                  return (
                    <div key={idx} className="flex flex-col items-center z-10 relative">
                      <div className={`w-8 h-8 lg:w-10 lg:h-10 xl:w-12 xl:h-12 rounded-full flex items-center justify-center transition-all duration-300 ${step.active ? 'bg-[#161622] border-2 border-indigo-500 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.35)] ring-4 ring-indigo-500/10' : 'bg-[#111118] border border-[#2A2A38] text-gray-600'}`}>
                        <Icon size={14} className="lg:w-4 lg:h-4" />
                      </div>
                      <span className={`text-[8px] lg:text-[9px] mt-1.5 lg:mt-2 font-medium ${step.active ? 'text-indigo-400' : 'text-gray-600'}`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SignUp;
