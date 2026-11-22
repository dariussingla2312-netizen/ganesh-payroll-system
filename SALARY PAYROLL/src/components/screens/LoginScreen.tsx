import React, { useState } from 'react';
import { Building2, Lock, Mail, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export const LoginScreen: React.FC = () => {
  const { login, loginDemoOwner, isFirebase } = useAuth();
  const { t } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await login(email, password);
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-[#f8fafc] dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800 p-7 sm:p-9 backdrop-blur">
        {/* Brand Logo */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-[#00b884] flex items-center justify-center text-white shadow-xl shadow-[#00b884]/25 mb-4">
            <Building2 className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            M/S GANESH AGRO
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Agricultural Machinery & Equipment • Sangrur, Punjab
          </p>
          <a
            href="https://www.ganeshagrosangrur.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-1 text-xs font-bold text-[#00b884] hover:underline"
          >
            www.ganeshagrosangrur.com
          </a>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Owner Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@ganeshagrosangrur.com"
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-[#f8fafc] dark:bg-slate-800/80 text-sm focus:border-[#00b884] outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-[#f8fafc] dark:bg-slate-800/80 text-sm focus:border-[#00b884] outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-2xl bg-[#00b884] hover:bg-[#00a375] active:scale-95 text-white font-bold text-sm transition-all shadow-lg shadow-[#00b884]/25 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100 dark:border-slate-800"></div>
          </div>
          <span className="relative px-3 bg-white dark:bg-slate-900 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            OR TEST INSTANTLY
          </span>
        </div>

        {/* 1-Click Demo Login */}
        <button
          type="button"
          onClick={loginDemoOwner}
          className="w-full py-3 px-4 rounded-2xl border border-[#00b884]/40 hover:border-[#00b884] bg-[#e6f7f0] hover:bg-[#d5f3e4] dark:bg-[#00b884]/15 dark:hover:bg-[#00b884]/25 text-[#064e3b] dark:text-[#00b884] font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          <Sparkles className="w-4 h-4 text-[#00b884]" />
          <span>Demo Owner Login (1-Click Instant Test)</span>
        </button>

        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00b884]" />
            <span>Encrypted • Multi-device Real-time Sync</span>
          </div>
        </div>
      </div>
    </div>
  );
};
