'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, endpoints } from '@/lib/api';
import { auth } from '@/lib/auth';

export default function VerifyOtpPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [resendOtpCode, setResendOtpCode] = useState('');
  const [resendSuccess, setResendSuccess] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const storedEmail = auth.getEmail();
    if (!storedEmail) {
      router.push('/login');
    } else {
      setEmail(storedEmail);
    }
  }, [router]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const data = await apiFetch(endpoints.verifyOtp, {
        method: 'POST',
        body: JSON.stringify({ email, otp_code: otpCode }),
      });

      auth.setToken(data.access_token);
      auth.setRole(data.role);
      auth.setUser({ email, role: data.role, full_name: data.full_name });

      if (data.role === 'citizen') {
        window.location.href = '/dashboard';
      } else if (data.role === 'clerk') {
        window.location.href = '/clerk';
      } else if (data.role === 'manager') {
        window.location.href = '/manager';
      } else {
        window.location.href = '/admin';
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check the code.');
      setIsLoading(false);
    }
  };
  
  const handleResendOtp = async () => {
    setIsResending(true);
    setError('');
    setResendSuccess(false);
    
    try {
      const data = await apiFetch(endpoints.resendOtp, {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      
      setResendOtpCode(data.demo_otp);
      setResendSuccess(true);
      // Clear success message after 5 seconds
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
      {/* Resend OTP Toast Notification */}
      {resendSuccess && (
        <div className="fixed top-8 right-8 z-[100] animate-in fade-in slide-in-from-right-8 duration-500">
          <div className="bg-white/80 backdrop-blur-xl border border-emerald-100 rounded-3xl p-6 shadow-[0_30px_60px_-15px_rgba(16,185,129,0.15)] flex items-center gap-6">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">New Security OTP</p>
              <div className="flex items-center gap-2">
                <h4 className="text-2xl font-black text-navy tracking-[0.4em] font-mono">{resendOtpCode}</h4>
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1 italic">Generated for your security</p>
            </div>
            <button 
              onClick={() => setResendSuccess(false)}
              className="ml-4 p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-300 hover:text-slate-600"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-md overflow-hidden rounded-[40px] border border-slate-100 bg-white shadow-[0_40px_80px_-20px_rgba(15,23,42,0.08)]">
        <div className="bg-navy p-10 text-center relative overflow-hidden">
          {/* Subtle grid background */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
          
          <div className="relative z-10 mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 text-amber shadow-2xl backdrop-blur-sm">
            <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="relative z-10 text-[10px] font-black uppercase tracking-[0.3em] text-amber mb-2">Verification Code</p>
          <h1 className="relative z-10 text-3xl font-black tracking-tighter text-white uppercase">Verify Your Identity</h1>
        </div>

        <div className="p-10">
          {error && (
            <div className="mb-8 rounded-2xl bg-danger/5 border border-danger/10 p-4 text-xs font-bold text-danger animate-shake flex items-center gap-3">
              <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <div className="mb-10">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Email Address</label>
            <div className="relative group">
              <input
                type="text"
                disabled
                value={email}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-4 text-sm font-bold text-slate-400 cursor-not-allowed group-hover:border-slate-300 transition-colors"
              />
              <div className="absolute right-5 top-4.5 text-slate-200">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          <form onSubmit={handleVerify} className="space-y-8">
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 underline decoration-amber decoration-2 underline-offset-8">Enter 6-digit Security Code</p>
              <div className="flex justify-between gap-2">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => { inputRefs.current[idx] = el; }}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="h-14 w-11 rounded-xl border-2 border-slate-100 bg-slate-50 text-center text-xl font-black text-navy focus:border-amber focus:bg-white focus:outline-none transition-all shadow-sm"
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="group relative flex w-full items-center justify-center gap-3 rounded-2xl bg-navy py-5 text-sm font-black uppercase tracking-[0.3em] text-white shadow-xl hover:bg-navy-light transition-all disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-1 active:translate-y-0"
            >
              {isLoading ? (
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
              ) : (
                <>
                  Verify & Continue
                  <svg className="h-5 w-5 text-amber transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-6 border-t border-slate-50 text-center">
            <p className="text-xs font-medium text-slate-400 mb-4">
              Didn't receive the code? 
              <button 
                onClick={handleResendOtp}
                disabled={isResending}
                className="font-black uppercase tracking-widest text-navy ml-2 hover:text-amber transition-colors disabled:opacity-50"
              >
                {isResending ? 'Resending...' : 'Resend OTP'}
              </button>
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-100">
               <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
               <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                 SECURE VERIFICATION BY CYBERSHIELD
               </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
