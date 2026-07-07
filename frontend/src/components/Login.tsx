import React, { useState } from 'react';
import { Sparkles, ArrowRight, Lock, Mail, GraduationCap } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-base relative overflow-hidden">
      {/* Playful background shapes */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-pastel-yellow rounded-full opacity-60"></div>
      <div className="absolute bottom-10 right-20 w-64 h-64 bg-pastel-blue rounded-[3rem] rotate-12 opacity-60"></div>
      <div className="absolute top-40 right-10 w-24 h-24 bg-pastel-coral rounded-full opacity-60"></div>
      <div className="absolute bottom-40 left-20 w-40 h-40 bg-pastel-mint rounded-[2rem] -rotate-6 opacity-60"></div>
      
      <div className="w-full max-w-md p-10 bg-white rounded-[2.5rem] relative z-10 mx-4 border-2 border-slate-100 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)]">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-pastel-blue border-4 border-white shadow-sm mb-4 relative">
            <GraduationCap className="w-10 h-10 text-dark-blue" />
            <div className="absolute -top-2 -right-2 bg-pastel-yellow w-8 h-8 rounded-full border-4 border-white flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-brand-yellow" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800 mb-2">Hello, Student!</h1>
          <p className="text-slate-500 font-medium">Ready to crush your goals today?</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-600 ml-2 block">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="email"
                required
                className="flat-input w-full pl-12"
                placeholder="you@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between ml-2">
              <label className="text-sm font-bold text-slate-600">Password</label>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="password"
                required
                className="flat-input w-full pl-12"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="btn-primary w-full flex items-center justify-center space-x-2 mt-8 text-lg">
            <span>Let's Go!</span>
            <ArrowRight className="w-5 h-5 stroke-[3]" />
          </button>
        </form>
        
        <div className="mt-8 text-center">
          <a href="#" className="text-sm font-bold text-slate-400 hover:text-dark-coral transition-colors">Forgot password?</a>
        </div>
      </div>
    </div>
  );
};

export default Login;
