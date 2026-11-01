'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '../../../lib/api';
import { Zap, Loader2 } from 'lucide-react';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Authenticating with Google...');

  useEffect(() => {
    const handleAuth = async () => {
      const code = searchParams.get('code');
      const isMock = searchParams.get('mock');
      const email = searchParams.get('email');
      const name = searchParams.get('name');

      try {
        if (code) {
          const res = await authApi.googleCallback({ code });
          localStorage.setItem('reachinbox_token', res.token);
          setStatus('Authentication successful! Redirecting to dashboard...');
          router.push('/dashboard');
        } else if (isMock || email) {
          const res = await authApi.demoLogin({
            email: email || 'mitrajit@reachinbox.ai',
            name: name || 'Mitrajit Das',
          });
          localStorage.setItem('reachinbox_token', res.token);
          setStatus('Authentication successful! Redirecting to dashboard...');
          router.push('/dashboard');
        } else {
          router.push('/login');
        }
      } catch (err: any) {
        setStatus('Authentication failed: ' + (err.message || 'Unknown error'));
        setTimeout(() => router.push('/login'), 2500);
      }
    };

    handleAuth();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-[#0B0F17] flex flex-col justify-center items-center px-4">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto shadow-xl shadow-indigo-600/30 animate-bounce">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <div className="flex items-center justify-center space-x-2 text-indigo-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <p className="text-sm font-medium">{status}</p>
        </div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
