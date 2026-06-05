import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-indigo-600">AgentMark</h1>
        <div className="space-x-4">
          <button onClick={() => navigate('/login')} className="px-4 py-2 text-indigo-600 hover:text-indigo-800">
            Login
          </button>
          <button onClick={() => navigate('/signup')} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            Sign Up
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Welcome to AgentMark
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            The ultimate platform for managing your business efficiently
          </p>
          <button onClick={() => navigate('/signup')} className="px-8 py-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 mx-auto">
            Get Started <ArrowRight size={20} />
          </button>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          {[
            'Easy to use dashboard',
            'Real-time analytics',
            'Secure and reliable'
          ].map((feature, idx) => (
            <div key={idx} className="bg-white p-6 rounded-lg shadow-md">
              <CheckCircle className="text-green-500 mb-4" size={32} />
              <h3 className="text-xl font-semibold mb-2">{feature}</h3>
              <p className="text-gray-600">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
