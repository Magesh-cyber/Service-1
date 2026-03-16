'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, endpoints } from '@/lib/api';
import { auth } from '@/lib/auth';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [deviceId, setDeviceId] = useState('DEVICE-001'); // Mock device ID
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [riskData, setRiskData] = useState<{ risk_score: number; risk_status: string } | null>(null);
  const [showOtpToast, setShowOtpToast] = useState(false);
  const [demoOtp, setDemoOtp] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('msg') === 'session_expired') {
      setSessionExpired(true);
    }

    if (auth.isAuthenticated()) {
      const role = auth.getRole();
      if (role === 'citizen') router.push('/dashboard');
      else if (role === 'clerk') router.push('/clerk');
      else if (role === 'manager') router.push('/manager');
      else router.push('/admin');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const data = await apiFetch(endpoints.login, {
        method: 'POST',
        body: JSON.stringify({ email, password, device_id: deviceId }),
      });

      // Show risk feedback if available
      if (data.risk_score !== undefined) {
        setRiskData({ risk_score: data.risk_score, risk_status: data.risk_status });

        const isBlocked = data.action_taken === 'BLOCK' || data.action_taken === 'LOGIN_BLOCKED' || data.risk_status === 'BLOCKED';

        if (!isBlocked) {
          if (data.demo_otp) {
            setDemoOtp(data.demo_otp);
            setShowOtpToast(true);
          }
          auth.setEmail(email);
          // Give more time for user to see the OTP
          setTimeout(() => router.push('/verify-otp'), 4000);
        } else {
          setError(data.message || 'Account access restricted due to security risk.');
          setIsLoading(false);
        }
      } else {
        if (data.demo_otp) {
          setDemoOtp(data.demo_otp);
          setShowOtpToast(true);
        }
        auth.setEmail(email);
        setTimeout(() => router.push('/verify-otp'), 4000);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center p-4">
      <div className="w-full max-w-md overflow-hidden rounded-[32px] border border-border bg-white shadow-[0_40px_80px_-20px_rgba(15,23,42,0.1)]">
        <div className="bg-slate-50/50 p-10 text-center pb-8 border-b border-slate-100">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-navy text-white shadow-xl">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-navy tracking-tight uppercase">Login</h1>
          <p className="mt-2 text-xs font-black uppercase tracking-widest text-saffron bg-navy/5 inline-block px-3 py-1 rounded-lg">Sign in to your account</p>
        </div>

        {/* OTP Toast Notification */}
        {showOtpToast && (
          <div className="fixed top-6 right-6 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-4 rounded-3xl border-2 border-saffron bg-white p-6 shadow-[0_30px_60px_-15px_rgba(255,153,51,0.2)] ring-8 ring-saffron/10">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy text-white shadow-lg">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-saffron">Verification Code</p>
                <h4 className="text-2xl font-black text-navy tracking-[0.3em] mt-1">{demoOtp}</h4>
              </div>
              <button
                onClick={() => setShowOtpToast(false)}
                className="ml-4 text-slate-300 hover:text-navy transition-colors"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </button>
            </div>
          </div>
        )}

        <div className="p-8 pt-6">
          {sessionExpired && (
            <div className="mb-6 rounded-lg bg-warning/10 p-4 text-sm font-bold text-warning border border-warning/20">
              ⚠️ Your session has expired for security reasons. Please login again to continue.
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-lg bg-danger/10 p-4 text-sm font-medium text-danger">
              {error}
            </div>
          )}

          {riskData && (
            <div className={`mb-6 rounded-lg p-4 text-sm font-medium ${riskData.risk_status === 'LOW' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
              }`}>
              Security Status: {riskData.risk_status} (Score: {riskData.risk_score}/100)
              {riskData.risk_status !== 'BLOCKED' && <p className="mt-1 text-xs opacity-80">Initialising session...</p>}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-navy focus:border-primary focus:outline-none transition-all placeholder:text-muted/50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-navy focus:border-primary focus:outline-none transition-all placeholder:text-muted/50"
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
                <span className="text-xs text-muted">Remember this device</span>
              </div>
              <Link href="/forgot-password" title="Reset your password" className="text-xs font-bold text-primary hover:underline">Forgot Password?</Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-saffron py-4 text-xs font-black uppercase tracking-widest text-white shadow-xl transition-all hover:bg-[#F28B20] hover:shadow-2xl hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
              ) : (
                <>
                  Login
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-xs text-muted">
            <p>
              Don't have an account? <Link href="/register" className="font-bold text-primary hover:underline">Register here</Link>
            </p>
            <div className="mt-6 pt-6 border-t border-border">
              <Link href="/pds/login" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-navy text-white text-[10px] font-black uppercase tracking-widest hover:bg-navy-light transition-all shadow-md">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                PDS Admin Access
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
