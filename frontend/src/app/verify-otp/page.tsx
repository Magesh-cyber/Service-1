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
  const [error, setError] = useState('');
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
      auth.setUser({ email, role: data.role });

      if (data.role === 'citizen') {
        router.push('/dashboard');
      } else if (data.role === 'clerk') {
        router.push('/clerk');
      } else if (data.role === 'manager') {
        router.push('/manager');
      } else {
        router.push('/admin');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check the code.');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-white shadow-xl">
        <div className="bg-primary/5 p-8 text-center pb-6">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm border border-primary/20">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-navy">Verify Your Identity</h1>
          <p className="mt-2 text-sm text-muted">
            We've sent a 6-digit verification code to your registered email address.
          </p>
        </div>

        <div className="p-8 pt-6">
          {error && (
            <div className="mb-6 rounded-lg bg-danger/10 p-4 text-sm font-medium text-danger">
              {error}
            </div>
          )}

          <div className="mb-8">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-3">Email Address</label>
            <div className="relative">
              <input
                type="text"
                disabled
                value={email}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted/70 cursor-not-allowed"
              />
              <div className="absolute right-4 top-3.5 text-muted/30">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          <form onSubmit={handleVerify}>
            <p className="text-center text-xs font-bold uppercase tracking-wider text-muted mb-4 text-[10px]">Enter 6-digit Security Code</p>
            <div className="flex justify-between gap-2 mb-8">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => { inputRefs.current[idx] = el; }}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className="h-14 w-12 rounded-xl border border-border bg-background text-center text-xl font-bold text-navy focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none transition-all"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-sm font-bold text-white shadow-md transition-all hover:bg-primary-dark hover:shadow-lg disabled:opacity-70"
            >
              {isLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
              ) : (
                <>
                  Verify & Continue
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted">
              Didn't receive the code? <button className="font-bold text-primary hover:underline">Resend OTP</button>
            </p>
            <p className="mt-6 text-[10px] font-bold uppercase tracking-widest text-muted/40">
              SECURE VERIFICATION BY CYBERSHIELD
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
