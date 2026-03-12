import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { Bot, Lock, Mail, ArrowRight, Zap } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  if (localStorage.getItem('isLoggedIn') === 'true') {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    setTimeout(() => {
      localStorage.setItem('isLoggedIn', 'true');
      navigate('/dashboard');
    }, 800);
  };

  return (
    <div className="min-h-screen bg-black bg-light-streaks flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
            <Link to="/" className="inline-flex items-center justify-center w-16 h-16 rounded-2xl glass-card border border-white/10 mb-6 shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:scale-105 transition-transform">
              <Bot className="w-8 h-8 text-white" />
            </Link>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Initialize System</h1>
            <p className="text-text-secondary">Authenticate to access the Nexus Command Center</p>
        </div>

        <div className="glass-card p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 ml-1">Comm Channel (Email)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-500" />
                </div>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all"
                  placeholder="admin@nexus.core"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 ml-1">Access Key (Password)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500" />
                </div>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-3.5 px-4 btn-primary-glass flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed group mt-8"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <span>Establish Connection</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
            
            <div className="relative mt-6 mb-4">
               <div className="absolute inset-0 flex items-center">
                 <div className="w-full border-t border-gray-800"></div>
               </div>
               <div className="relative flex justify-center text-xs">
                 <span className="bg-card px-2 text-gray-500 uppercase tracking-wider">Or</span>
               </div>
            </div>

            <button
                type="button"
                onClick={() => {
                  localStorage.setItem('isLoggedIn', 'true');
                  navigate('/dashboard');
                }}
                className="w-full py-3 px-4 btn-secondary-glass flex items-center justify-center space-x-2 group"
            >
                <Zap className="w-4 h-4 text-warning group-hover:scale-110 transition-transform" />
                <span>Bypass Login for Demo</span>
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-600 mt-8">
            Terminal access restricted to authorized personnel only.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
