'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import { apiFetch, endpoints } from '@/lib/api';
import DataTable from '@/components/DataTable';
import SummaryCard from '@/components/SummaryCard';

export default function ClerkDashboard() {
  const router = useRouter();
  const [applications, setApplications] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [actionState, setActionState] = useState<Record<string, { remark: string; loading: boolean }>>({});
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const role = auth.getRole();
    if (!auth.isAuthenticated() || (role !== 'clerk' && role !== 'admin')) {
      router.push('/login');
      return;
    }
    setUser(auth.getUser());
    loadApplications();

    apiFetch(endpoints.profile)
      .then(setProfile)
      .catch(err => console.error('Profile fetch failed:', err));
  }, [router]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/upload-profile-photo`, {
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

  const loadApplications = () => {
    setIsLoading(true);
    apiFetch(endpoints.clerkApplications)
      .then((data) => setApplications(data.applications || []))
      .catch(() => setApplications([]))
      .finally(() => setIsLoading(false));
  };

  const setRemark = (appId: string, remark: string) => {
    setActionState((prev) => ({
      ...prev,
      [appId]: { ...prev[appId], remark },
    }));
  };

  const handleDecision = async (appId: string, type: 'approve' | 'reject') => {
    const remark = actionState[appId]?.remark || '';
    setActionState((prev) => ({ ...prev, [appId]: { ...prev[appId], loading: true } }));
    try {
      const url = type === 'approve' ? endpoints.clerkApprove(appId) : endpoints.clerkReject(appId);
      await apiFetch(url, {
        method: 'POST',
        body: JSON.stringify({ remark }),
      });
      loadApplications();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    } finally {
      setActionState((prev) => ({ ...prev, [appId]: { ...prev[appId], loading: false } }));
    }
  };

  const confidenceBadge = (level: string) => {
    const map: Record<string, string> = {
      HIGH:   'bg-emerald-50 text-emerald-600 border-emerald-100',
      MEDIUM: 'bg-amber-50 text-amber-600 border-amber-100',
      LOW:    'bg-rose-50 text-rose-600 border-rose-100',
    };
    return (
      <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest border ${map[level] || 'bg-slate-50 text-slate-400 border-slate-100'}`}>
        {level === 'HIGH' ? 'VERIFIED' : level === 'MEDIUM' ? 'PENDING' : 'FLAGGED'}
      </span>
    );
  };

  const columns = [
    {
      header: 'Application ID',
      accessor: 'application_id',
      render: (val: string) => <span className="font-black text-amber-600 text-xs tracking-tight">{val}</span>,
    },
    {
      header: 'Service',
      accessor: 'service_type',
      render: (val: string) => (
        <span className="rounded-md bg-muted/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border border-border/50">
          {val.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      header: 'Applicant',
      accessor: 'applicant_name',
      render: (val: string) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-navy text-white flex items-center justify-center text-xs font-black shadow-md border border-navy/10">
            {val.charAt(0).toUpperCase()}
          </div>
          <span className="font-black text-navy text-xs uppercase tracking-tight">{val}</span>
        </div>
      ),
    },
    {
      header: 'Phone',
      accessor: 'phone',
      render: (val: string) => <span className="text-sm font-mono text-muted">{val}</span>,
    },
    {
      header: 'Address',
      accessor: 'address',
      render: (val: string) => <span className="text-sm text-muted">{val}</span>,
    },
    {
      header: 'Verification Score',
      accessor: 'risk_score',
      render: (val: number) => (
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted/10">
            <div
              className={`h-full ${val <= 20 ? 'bg-success' : val <= 40 ? 'bg-warning' : 'bg-danger'}`}
              style={{ width: `${Math.min(val, 100)}%` }}
            />
          </div>
          <span className="text-xs font-bold text-navy">{val}</span>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: 'confidence_level',
      render: (val: string) => confidenceBadge(val),
    },
    {
      header: 'Submitted',
      accessor: 'created_at',
      render: (val: string) => (
        <span className="text-xs text-muted">{val ? new Date(val).toLocaleDateString() : '—'}</span>
      ),
    },
    {
      header: 'Actions',
      accessor: 'application_id',
      render: (appId: string) => {
        const state = actionState[appId] || { remark: '', loading: false };
        return (
          <div className="flex flex-col gap-2 min-w-[180px]">
            <input
              type="text"
              placeholder="Remark (optional)"
              value={state.remark || ''}
              onChange={(e) => setRemark(appId, e.target.value)}
              className="rounded-lg border border-border bg-background px-2 py-1 text-xs focus:border-primary focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                disabled={state.loading}
                onClick={() => handleDecision(appId, 'approve')}
                className="flex-1 rounded-lg bg-success/10 px-2 py-1.5 text-[10px] font-bold text-success hover:bg-success/20 transition-all disabled:opacity-50"
              >
                ✓ Approve
              </button>
              <button
                disabled={state.loading}
                onClick={() => handleDecision(appId, 'reject')}
                className="flex-1 rounded-lg bg-danger/10 px-2 py-1.5 text-[10px] font-bold text-danger hover:bg-danger/20 transition-all disabled:opacity-50"
              >
                ✕ Reject
              </button>
            </div>
            <button
              onClick={() => router.push(`/report/${appId}`)}
              className="mt-1 w-full rounded-lg border border-primary/20 bg-primary/5 px-2 py-1.5 text-[10px] font-bold text-primary hover:bg-primary/10 transition-all"
            >
              👁 View Report Details
            </button>
          </div>
        );
      },
    },
  ];

  if (isLoading) return (
    <div className="flex h-[calc(100vh-200px)] items-center justify-center">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary"></div>
    </div>
  );

  return (
    <div className="space-y-12 pb-20">
      {/* Profile Header Section */}
      <section className="flex items-center gap-8 rounded-[32px] bg-[#BFC6C4] p-10 shadow-[0_40px_80px_-20px_rgba(15,23,42,0.08)] border border-slate-300">
        <div
          className="relative h-28 w-28 cursor-pointer group"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="h-full w-full overflow-hidden rounded-full border-4 border-slate-100 p-1.5 transition-all duration-500 group-hover:border-saffron bg-white shadow-inner relative">
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
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#CF6A02]">Clerk Profile</p>
          <h1 className="text-4xl font-black tracking-tighter text-navy uppercase leading-none">
            Welcome, {(profile?.full_name || user?.full_name || 'Clerk').replace(' Officer', '')}
          </h1>
          <p className="text-sm font-medium text-slate-600">Administrative Case Dashboard</p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <SummaryCard
          title="Pending Review"
          value={String(applications.length)}
          status="Awaiting your action"
          icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
        />
        <SummaryCard
          title="High Confidence"
          value={String(applications.filter((a) => a.confidence_level === 'HIGH').length)}
          status="Low risk applications"
          icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
        />
        <SummaryCard
          title="Needs Attention"
          value={String(applications.filter((a) => a.confidence_level !== 'HIGH').length)}
          status="Medium / Low confidence"
          icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
        />
      </div>

      <div className="rounded-[24px] border border-amber/10 bg-amber/5 px-8 py-5 flex items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber text-white shadow-lg">
           <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
           </svg>
        </div>
        <p className="text-xs font-bold text-navy leading-loose">
          <span className="text-amber-600 uppercase tracking-widest mr-2 font-black">Security Notice:</span>
          All citizen data is encrypted. Approving an application will send it for final manager review.
        </p>
      </div>

      <DataTable
        title="Pending Applications"
        columns={columns}
        data={applications}
      />
    </div>
  );
}
