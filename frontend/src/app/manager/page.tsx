'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import { apiFetch, endpoints } from '@/lib/api';
import DataTable from '@/components/DataTable';
import SummaryCard from '@/components/SummaryCard';

export default function ManagerDashboard() {
  const router = useRouter();
  const [applications, setApplications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionState, setActionState] = useState<Record<string, { remark: string; loading: boolean }>>({});
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  useEffect(() => {
    const role = auth.getRole();
    if (!auth.isAuthenticated() || (role !== 'manager' && role !== 'admin')) {
      router.push('/login');
      return;
    }
    loadApplications();
  }, [router]);

  const loadApplications = () => {
    setIsLoading(true);
    apiFetch(endpoints.managerApplications)
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
      const url = type === 'approve' ? endpoints.managerApprove(appId) : endpoints.managerReject(appId);
      const result = await apiFetch(url, {
        method: 'POST',
        body: JSON.stringify({ remark }),
      });
      if (type === 'approve' && result.final_report) {
        setSelectedReport(result.final_report);
      }
      loadApplications();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    } finally {
      setActionState((prev) => ({ ...prev, [appId]: { ...prev[appId], loading: false } }));
    }
  };

  const confidenceBadge = (level: string) => {
    const map: Record<string, string> = {
      HIGH:   'bg-success/10 text-success',
      MEDIUM: 'bg-warning/10 text-warning',
      LOW:    'bg-danger/10 text-danger',
    };
    return (
      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${map[level] || 'bg-muted/10 text-muted'}`}>
        {level} confidence
      </span>
    );
  };

  const columns = [
    {
      header: 'Application ID',
      accessor: 'application_id',
      render: (val: string) => <span className="font-bold text-primary text-xs">{val}</span>,
    },
    {
      header: 'Applicant',
      accessor: 'applicant_name',
      render: (val: string) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
            {val.charAt(0)}
          </div>
          <div>
            <p className="font-medium text-navy text-sm">{val}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Phone',
      accessor: 'phone',
      render: (val: string) => <span className="text-sm font-mono">{val}</span>,
    },
    {
      header: 'Address',
      accessor: 'address',
      render: (val: string) => <span className="text-xs text-muted max-w-[150px] block truncate" title={val}>{val}</span>,
    },
    {
      header: 'Risk Score',
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
      header: 'Confidence',
      accessor: 'confidence_level',
      render: (val: string) => confidenceBadge(val),
    },
    {
      header: 'Clerk Note',
      accessor: 'clerk_remark',
      render: (val: string) => (
        <span className="text-xs text-muted italic">{val || '—'}</span>
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
              placeholder="Final remark (optional)"
              value={state.remark}
              onChange={(e) => setRemark(appId, e.target.value)}
              className="rounded-lg border border-border bg-background px-2 py-1 text-xs focus:border-primary focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                disabled={state.loading}
                onClick={() => handleDecision(appId, 'approve')}
                className="flex-1 rounded-lg bg-success/10 px-2 py-1.5 text-[10px] font-bold text-success hover:bg-success/20 transition-all disabled:opacity-50"
              >
                ✓ Final Approve
              </button>
              <button
                disabled={state.loading}
                onClick={() => handleDecision(appId, 'reject')}
                className="flex-1 rounded-lg bg-danger/10 px-2 py-1.5 text-[10px] font-bold text-danger hover:bg-danger/20 transition-all disabled:opacity-50"
              >
                ✕ Reject
              </button>
            </div>
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
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-navy">Manager Portal</h1>
        <p className="mt-1 text-base text-muted/80">Final approval authority for clerk-reviewed citizen applications.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <SummaryCard
          title="Awaiting Final Approval"
          value={String(applications.length)}
          status="Clerk-approved requests"
          icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
        />
        <SummaryCard
          title="High Confidence"
          value={String(applications.filter((a) => a.confidence_level === 'HIGH').length)}
          status="Low risk applications"
          icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
        />
        <SummaryCard
          title="Needs Scrutiny"
          value={String(applications.filter((a) => a.confidence_level !== 'HIGH').length)}
          change="Review carefully before approving"
          icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
        />
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 px-6 py-3 text-xs font-medium text-primary">
        ℹ️ Full applicant details are visible at manager level. Approving will generate an official report for the citizen.
      </div>

      <DataTable
        title="Applications for Final Approval"
        columns={columns}
        data={applications}
      />

      {/* Report Preview Modal */}
      {selectedReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 backdrop-blur-sm p-4"
          onClick={() => setSelectedReport(null)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl bg-white shadow-xl border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-success/5">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 text-success">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-navy">Final Report Generated</h3>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-muted hover:text-navy transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <p className="text-xs text-muted mb-4">This report is now visible in the citizen's dashboard under "Application Outcome".</p>
              <pre className="whitespace-pre-wrap font-mono text-xs text-navy leading-relaxed bg-background rounded-xl p-4 border border-border overflow-x-auto">
                {selectedReport}
              </pre>
            </div>
            <div className="border-t border-border px-6 py-4 flex justify-end">
              <button
                onClick={() => setSelectedReport(null)}
                className="rounded-xl bg-primary px-6 py-2 text-sm font-bold text-white hover:bg-primary-dark transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
