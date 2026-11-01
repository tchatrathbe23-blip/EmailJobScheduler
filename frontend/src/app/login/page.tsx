'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '../../lib/api';
import { Zap, ShieldCheck, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if already logged in
  useEffect(() => {
    const token = localStorage.getItem('reachinbox_token');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const { url, isMock } = await authApi.getGoogleUrl();
      if (isMock) {
        // Fallback demo login when credentials not configured
        const res = await authApi.demoLogin({
          email: 'mitrajit@reachinbox.ai',
          name: 'Mitrajit Das (Evaluator)',
        });
        localStorage.setItem('reachinbox_token', res.token);
        router.push('/dashboard');
      } else {
        window.location.href = url;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initialize Google login');
      setLoading(false);
    }
  };

  const handleQuickEvaluatorLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authApi.demoLogin({
        email: 'evaluator@reachinbox.ai',
        name: 'Mitrajit & Yadav036 (ReachInbox Reviewer)',
      });
      localStorage.setItem('reachinbox_token', res.token);
      router.push('/dashboard');
    } catch (err: any) {
      setError('Login failed: ' + (err.response?.data?.error || err.message));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 shadow-xl shadow-indigo-500/20 mb-4">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">ReachInbox Scheduler</h1>
          <p className="text-xs text-gray-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
            Outbox Labs Hiring Assignment &bull; Full-stack Email Job Scheduler with BullMQ, Redis, Elasticsearch & Ethereal SMTP
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#111827] border border-gray-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-200">Welcome back</h2>
            <p className="text-xs text-gray-400 mt-1">Sign in to manage queues, rate limits, and dispatch schedules</p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Real Google OAuth Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3 px-4 bg-white hover:bg-gray-100 text-gray-900 rounded-2xl font-medium text-xs flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-60"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{loading ? 'Signing In...' : 'Continue with Google'}</span>
          </button>

          <div className="flex items-center">
            <div className="flex-1 border-t border-gray-800" />
            <span className="px-3 text-[11px] text-gray-500 uppercase tracking-wider">or 1-click test</span>
            <div className="flex-1 border-t border-gray-800" />
          </div>

          {/* Quick Evaluator Login */}
          <button
            onClick={handleQuickEvaluatorLogin}
            disabled={loading}
            className="w-full py-2.5 px-4 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 hover:border-indigo-500/40 rounded-2xl font-medium text-xs flex items-center justify-center space-x-2 transition"
          >
            <span>Sign In as Evaluator (Mitrajit / Yadav036)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {/* Features Highlights */}
          <div className="pt-2 border-t border-gray-800/80 space-y-2 text-[11px] text-gray-400">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Persistent BullMQ + Redis Delayed Scheduler (No Cron)</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Multi-Sender Rate Limiting & Live Slack Alerts</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Elasticsearch Fast Search & Ethereal SMTP Previews</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-gray-600 mt-6">
          ReachInbox &bull; Outbox Labs &bull; Software Development Intern Assignment
        </p>
      </div>
    </div>
  );
}
