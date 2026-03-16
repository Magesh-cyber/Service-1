'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import { apiFetch, endpoints } from '@/lib/api';
import StatusCard from '@/components/StatusCard';
import ServiceCard from '@/components/ServiceCard';
import ApplicationTracker from '@/components/ApplicationTracker';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [pdsTransactions, setPdsTransactions] = useState<any[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [isLoadingPds, setIsLoadingPds] = useState(true);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [qrData, setQrData] = useState<any>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isFetchingQr, setIsFetchingQr] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push('/login');
      return;
    }
    setUser(auth.getUser());

    apiFetch(endpoints.profile)
      .then(setProfile)
      .catch(err => {
        console.error('Profile fetch failed:', err);
        if (err.message.includes('token')) {
          auth.logout();
        }
      });

    apiFetch(endpoints.myRequests)
      .then((data) => setRequests(data.requests || []))
      .catch((err) => {
        console.error('Requests fetch failed:', err);
        setRequests([]);
        if (err.message.includes('token')) {
          auth.logout();
        }
      })
      .finally(() => setIsLoadingRequests(false));

    apiFetch(endpoints.pdsTransactionsMe)
      .then(setPdsTransactions)
      .catch(err => console.error('PDS fetch failed:', err))
      .finally(() => setIsLoadingPds(false));
  }, [router]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/upload-profile-photo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      setProfile({ ...profile, profile_photo: data.photo_url });
    } catch (err: any) {
      alert(err.message || 'Error uploading photo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleQrClick = async () => {
    setIsQrModalOpen(true);
    setIsFetchingQr(true);
    try {
      const data = await apiFetch(endpoints.identityQr);
      setQrData(data);
    } catch (err: any) {
      console.error('Failed to fetch identity QR:', err);
      setQrData({ error: err.message || 'Identity QR not available.' });
    } finally {
      setIsFetchingQr(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-12 pb-20">
      {/* Welcome Section */}
      <section className="flex items-center gap-8 rounded-[32px] bg-[#BFC6C4] p-10 shadow-[0_40px_80px_-20px_rgba(15,23,42,0.08)] border border-slate-300">
        <div
          className="relative h-28 w-28 cursor-pointer group"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="h-full w-full overflow-hidden rounded-full border-4 border-slate-100 p-1.5 transition-all duration-500 group-hover:border-saffron bg-white shadow-inner relative">
            {/* Saffron/Green split border feel */}
            <div className="absolute -inset-1 rounded-full border-2 border-indian-green/20"></div>
            {profile?.profile_photo ? (
              <img
                src={profile.profile_photo}
                alt="Profile"
                className="h-full w-full rounded-full object-cover shadow-sm"
              />
            ) : (
              <div className="h-full w-full rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                <svg className="h-14 w-14" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          <div className="absolute inset-2 flex items-center justify-center rounded-full bg-navy/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100 backdrop-blur-[2px]">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            </svg>
          </div>
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white/80">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-saffron border-t-transparent"></div>
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoUpload}
            className="hidden"
            accept="image/*"
          />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#CF6A02]">Citizen Profile</p>
          <h1 className="text-4xl font-black tracking-tighter text-navy uppercase leading-none">
            {profile?.full_name || user.full_name || user.email.split('@')[0]}
          </h1>
          <p className="text-sm font-black text-navy/70">Manage your digital services and applications</p>
        </div>
      </section>

      {/* Security Status Section */}
      <section className="rounded-[32px] bg-[#EAEFEF] p-10 shadow-[0_40px_80px_-20px_rgba(15,23,42,0.06)] border border-slate-200">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-xl font-black text-navy uppercase tracking-tighter">Account Status</h2>
          <div className="flex items-center gap-2 rounded-full bg-indian-green/5 px-4 py-1.5 text-[10px] font-black text-indian-green border border-indian-green/10">
            <div className="h-2 w-2 animate-pulse rounded-full bg-saffron shadow-[0_0_8px_rgba(255,153,51,0.5)]"></div>
            SYSTEM STATUS: OPERATIONAL
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatusCard
            title="QR Identity"
            status="Available"
            type="info"
            highlight={true}
            onClick={handleQrClick}
            icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>}
          />
          <StatusCard
            title="OTP Status"
            status="Active"
            type="active"
            icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
          />
          <StatusCard
            title="Identity Status"
            status="Verified"
            type="success"
            icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>}
          />
          <StatusCard
            title="System Status"
            status="Secure"
            type="info"
            icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
          />
        </div>
      </section>

      {/* My Requests Section */}
      <section id="application-status" className="rounded-[32px] bg-[#EAEFEF] p-10 shadow-[0_40px_80px_-20px_rgba(15,23,42,0.06)] border border-slate-200">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-navy uppercase tracking-tighter">My Applications</h2>
            <p className="mt-1 text-xs font-black text-navy/70 uppercase tracking-widest">Recent service requests</p>
          </div>
          {requests.length > 0 && (
            <span className="rounded-full bg-indian-green px-4 py-1.5 text-[10px] font-black text-white shadow-xl uppercase tracking-widest border border-white/20">
              {requests.length} Applications found
            </span>
          )}
        </div>

        {isLoadingRequests ? (
          <div className="flex h-40 items-center justify-center rounded-2xl border border-border bg-white shadow-soft">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-white py-14 shadow-soft text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5 text-primary">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-navy">No applications yet</p>
              <p className="mt-1 text-xs text-muted/70">Submit a service request below to track it here.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <ApplicationTracker
                key={req.application_id}
                application={req}
              />
            ))}
          </div>
        )}
      </section>

      {/* PDS Distribution History Section */}
      <section id="pds-history" className="rounded-[32px] bg-[#EAEFEF] p-10 shadow-[0_40px_80px_-20px_rgba(15,23,42,0.06)] border border-slate-200">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-navy uppercase tracking-tighter">PDS Distribution History</h2>
            <p className="mt-1 text-xs font-black text-navy/70 uppercase tracking-widest">Recent ration issuances</p>
          </div>
          {pdsTransactions.length > 0 && (
            <span className="rounded-full bg-saffron px-4 py-1.5 text-[10px] font-black text-navy shadow-xl uppercase tracking-widest border border-white/20">
              {pdsTransactions.length} Transactions found
            </span>
          )}
        </div>

        {isLoadingPds ? (
          <div className="flex h-40 items-center justify-center rounded-2xl border border-border bg-white shadow-soft">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-saffron/20 border-t-saffron" />
          </div>
        ) : pdsTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-white py-14 shadow-soft text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-saffron/5 text-saffron">
               <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-navy">No PDS history found</p>
              <p className="mt-1 text-xs text-muted/70">Your ration distribution records will appear here once issued.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {pdsTransactions.map((tx) => (
              <div key={tx.transaction_id} className="flex flex-col md:flex-row items-center justify-between gap-4 rounded-[24px] bg-white p-6 shadow-soft border border-slate-100 transition-all hover:shadow-md">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-navy shadow-sm">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-navy uppercase tracking-tight">{tx.transaction_id}</h3>
                    <div className="flex gap-4 mt-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{tx.issued_date}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Shop: {tx.shop_id}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="hidden lg:flex items-center gap-1 px-3 py-1 rounded-full bg-slate-50 text-[10px] font-black text-slate-500 border border-slate-100 uppercase tracking-widest">
                    {tx.verification_mode.replace('_', ' ')}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedTx(tx);
                      setIsBillModalOpen(true);
                    }}
                    className="flex-1 md:flex-none px-6 py-2.5 bg-navy text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-navy/10 hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                  >
                    View Bill
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Citizen Services Section */}
      <section id="citizen-services">
        <h2 className="mb-6 text-xl font-bold text-navy">Citizen Services</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <ServiceCard
            title="Birth Certificate"
            description="Official birth record application."
            href="/services/birth-certificate"
            isActive={true}
            icon={<svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
          />
          <ServiceCard
            title="Marriage Certificate"
            description="Legal marriage registration service."
            href="/services/marriage-certificate"
            isActive={true}
            icon={<svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>}
          />
          <ServiceCard
            title="Income Certificate"
            description="Verify annual household income."
            href="/services/income-certificate"
            isActive={true}
            icon={<svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <ServiceCard
            title="Community Certificate"
            description="Official caste or community verification."
            href="/services/community-certificate"
            isActive={true}
            icon={<svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
          />
          <ServiceCard
            title="Passport Application"
            description="Apply for new passport or renewal."
            href="/services/passport-application"
            isActive={true}
            icon={<svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <ServiceCard
            title="Driving License"
            description="New learner or permanent license registration."
            href="/services/driving-license"
            isActive={true}
            icon={<svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>}
          />
          <ServiceCard
            title="Voter ID"
            description="Register for your National Voter Identity Card."
            href="/services/voter-id"
            isActive={true}
            icon={<svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
          />
          <ServiceCard
            title="Building Permit"
            description="New construction and renovation approval."
            href="/services/building-permit"
            isActive={true}
            icon={<svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
          />
        </div>
      </section>

      {/* QR Identity Modal */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 backdrop-blur-sm p-4" onClick={() => setIsQrModalOpen(false)}>
          <div className="relative w-full max-w-sm rounded-3xl bg-white shadow-2xl border border-border p-8 text-center animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setIsQrModalOpen(false)} className="absolute top-5 right-5 text-muted hover:text-navy transition-colors">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <div className="mb-6 flex flex-col items-center gap-1">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy/10 text-navy shadow-sm mb-2">
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
              </div>
              <h2 className="text-xl font-bold text-navy">Identity QR Code</h2>
              <p className="text-sm font-medium text-muted/70 italic">Kiosk Verification Pass</p>
            </div>

            {isFetchingQr ? (
              <div className="flex flex-col items-center justify-center py-10">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary mb-4" />
                <p className="text-xs font-bold text-navy animate-pulse">Retrieving Digital Identity...</p>
              </div>
            ) : qrData?.error ? (
              <div className="py-8">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-danger/10 text-danger mb-4">
                  <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <p className="text-sm font-bold text-navy">{qrData.error}</p>
              </div>
            ) : qrData ? (
              <div className="space-y-6">
                <div className="relative mx-auto w-48 h-48 p-3 rounded-2xl bg-white border border-border shadow-sm flex items-center justify-center overflow-hidden">
                  <img src={qrData.qr_code_url} alt="Identity QR" className="h-full w-full object-contain" />
                </div>

                <div className="space-y-2">
                   <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Verification Code</p>
                   <p className="text-2xl font-black text-navy tracking-[0.2em]">{qrData.verification_code}</p>
                </div>

                <div className="flex flex-col gap-2 rounded-xl bg-primary/5 p-4 text-center border border-primary/10">
                  <p className="text-xs font-bold text-navy">
                    This QR code is used for physical identity verification at government kiosks.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="mt-8">
              <button
                onClick={() => setIsQrModalOpen(false)}
                className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-soft transition-all hover:bg-primary-dark hover:shadow-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Bill Modal */}
      {isBillModalOpen && selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 backdrop-blur-sm p-4" onClick={() => setIsBillModalOpen(false)}>
          <div className="relative w-full max-w-2xl rounded-[32px] bg-white shadow-2xl border border-border overflow-hidden animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="bg-navy p-8 text-white relative">
               <button onClick={() => setIsBillModalOpen(false)} className="absolute top-6 right-6 text-white/60 hover:text-white transition-colors">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-saffron mb-2">Public Distribution System</p>
              <h2 className="text-3xl font-black uppercase tracking-tighter">Distribution Receipt</h2>
              <p className="text-white/60 text-xs font-bold uppercase tracking-widest mt-2">Official Digital Bill • {selectedTx.transaction_id}</p>
            </div>

            <div className="p-8 space-y-8">
              <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Beneficiary</p>
                  <p className="text-xs font-bold text-navy uppercase">{selectedTx.beneficiary_name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Citizen Code</p>
                  <p className="text-xs font-bold text-navy uppercase tracking-widest">{selectedTx.citizen_code}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Card Type</p>
                  <p className="text-xs font-bold text-navy uppercase">{selectedTx.card_type}</p>
                </div>
                 <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Issue Month</p>
                  <p className="text-xs font-bold text-navy uppercase">{selectedTx.issued_month}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6">
                <h3 className="text-[10px] font-black text-navy uppercase tracking-widest mb-4">Items Issued</h3>
                <div className="space-y-3">
                  {selectedTx.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">{item.item_name}</span>
                      <span className="text-xs font-black text-navy uppercase">{item.quantity} {item.unit}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                 <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Shop ID</p>
                  <p className="text-xs font-bold text-navy uppercase">{selectedTx.shop_id}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Distribution Date</p>
                  <p className="text-xs font-bold text-navy uppercase">{selectedTx.issued_date}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Verification Mode</p>
                  <p className="text-xs font-bold text-navy uppercase">{selectedTx.verification_mode}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-8 flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => {
                  import('@/lib/api').then(({ downloadFile, endpoints }) => {
                    downloadFile(endpoints.pdsBillDownload(selectedTx.transaction_id), `PDS_Bill_${selectedTx.transaction_id}.pdf`);
                  });
                }}
                className="flex-1 px-8 py-4 bg-navy text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-navy/20 hover:bg-slate-800 transition-all flex items-center justify-center gap-3"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download Bill (PDF)
              </button>
              <button
                onClick={() => setIsBillModalOpen(false)}
                className="flex-1 px-8 py-4 bg-white border border-slate-200 text-navy text-xs font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-slate-50 transition-all"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

  );
}
