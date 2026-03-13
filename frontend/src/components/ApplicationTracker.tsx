'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

// ─── Step definitions ─────────────────────────────────────────────────────────
const STEPS = [
  { key: 'submitted',  label: 'Request Submitted',  shortLabel: 'Submitted' },
  { key: 'clerk',      label: 'Clerk Review',        shortLabel: 'Clerk'     },
  { key: 'manager',    label: 'Manager Approval',    shortLabel: 'Manager'   },
  { key: 'report',     label: 'Report Generated',    shortLabel: 'Report'    },
];

type StepState = 'complete' | 'active' | 'rejected' | 'pending';

interface StepResult {
  states: StepState[];
  activeIndex: number;
}

// ─── Status → step state mapping ─────────────────────────────────────────────
function resolveSteps(status: string): StepResult {
  switch (status) {
    case 'PENDING':
      return { states: ['active', 'pending', 'pending', 'pending'], activeIndex: 0 };
    case 'UNDER_CLERK_REVIEW':
      return { states: ['complete', 'active', 'pending', 'pending'], activeIndex: 1 };
    case 'UNDER_MANAGER_REVIEW':
      return { states: ['complete', 'complete', 'active', 'pending'], activeIndex: 2 };
    case 'APPROVED':
      return { states: ['complete', 'complete', 'complete', 'complete'], activeIndex: 3 };
    case 'REJECTED_BY_CLERK':
      return { states: ['complete', 'rejected', 'pending', 'pending'], activeIndex: 1 };
    case 'REJECTED_BY_MANAGER':
      return { states: ['complete', 'complete', 'rejected', 'pending'], activeIndex: 2 };
    default:
      return { states: ['active', 'pending', 'pending', 'pending'], activeIndex: 0 };
  }
}

// ─── Node icon ────────────────────────────────────────────────────────────────
function StepIcon({ state }: { state: StepState }) {
  if (state === 'complete') {
    return (
      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    );
  }
  if (state === 'rejected') {
    return (
      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    );
  }
  if (state === 'active') {
    return <div className="h-2.5 w-2.5 rounded-full bg-current animate-pulse" />;
  }
  // pending
  return <div className="h-2.5 w-2.5 rounded-full bg-current/40" />;
}

// ─── Node colour classes ──────────────────────────────────────────────────────
function nodeClasses(state: StepState): { circle: string; label: string } {
  switch (state) {
    case 'complete':
      return {
        circle: 'bg-success text-white border-success shadow-sm shadow-success/30',
        label:  'text-success font-semibold',
      };
    case 'active':
      return {
        circle: 'bg-primary text-white border-primary shadow-md shadow-primary/30 ring-4 ring-primary/10',
        label:  'text-primary font-bold',
      };
    case 'rejected':
      return {
        circle: 'bg-danger text-white border-danger shadow-sm shadow-danger/30',
        label:  'text-danger font-semibold',
      };
    default: // pending
      return {
        circle: 'bg-white text-muted/40 border-border',
        label:  'text-muted/50',
      };
  }
}

// ─── Connector line colour ────────────────────────────────────────────────────
function lineClass(leftState: StepState, rightState: StepState): string {
  if (leftState === 'complete' && rightState !== 'pending') return 'bg-success';
  if (leftState === 'complete') return 'bg-gradient-to-r from-success to-border';
  return 'bg-border';
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    PENDING:               { cls: 'bg-muted/10 text-muted',           label: 'Pending' },
    UNDER_CLERK_REVIEW:    { cls: 'bg-warning/10 text-warning',        label: 'Under Clerk Review' },
    UNDER_MANAGER_REVIEW:  { cls: 'bg-blue-100 text-blue-700',         label: 'Under Manager Review' },
    APPROVED:              { cls: 'bg-success/10 text-success',        label: 'Approved' },
    REJECTED_BY_CLERK:     { cls: 'bg-danger/10 text-danger',          label: 'Rejected by Clerk' },
    REJECTED_BY_MANAGER:   { cls: 'bg-danger/10 text-danger',          label: 'Rejected by Manager' },
  };
  const { cls, label } = map[status] || { cls: 'bg-muted/10 text-muted', label: status };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${status === 'APPROVED' ? 'bg-success' : status.includes('REJECTED') ? 'bg-danger' : status === 'PENDING' ? 'bg-muted' : 'bg-current animate-pulse'}`} />
      {label}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface Application {
  application_id: string;
  service_type: string;
  status: string;
  final_report?: string;
  created_at?: string;
}

interface ApplicationTrackerProps {
  application: Application;
}

export default function ApplicationTracker({ application }: ApplicationTrackerProps) {
  const router = useRouter();
  const { states } = resolveSteps(application.status);

  const serviceLabel = application.service_type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const submittedDate = application.created_at
    ? new Date(application.created_at).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : '—';

  return (
    <div className="rounded-2xl border border-border bg-white shadow-soft overflow-hidden">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border bg-[#F8FAFC] px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted/60">Application ID</p>
            <p className="text-sm font-extrabold text-primary tracking-wide">{application.application_id}</p>
          </div>
          <div className="hidden sm:block h-8 w-px bg-border" />
          <div className="hidden sm:block">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted/60">Service</p>
            <p className="text-sm font-semibold text-navy">{serviceLabel}</p>
          </div>
          <div className="hidden sm:block h-8 w-px bg-border" />
          <div className="hidden sm:block">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted/60">Submitted On</p>
            <p className="text-sm font-semibold text-navy">{submittedDate}</p>
          </div>
        </div>
        <StatusBadge status={application.status} />
      </div>

      {/* Tracker */}
      <div className="px-6 py-6">
        {/* Step nodes */}
        <div className="relative flex items-start">
          {STEPS.map((step, idx) => {
            const state = states[idx];
            const { circle, label } = nodeClasses(state);
            const isLast = idx === STEPS.length - 1;

            return (
              <React.Fragment key={step.key}>
                {/* Node */}
                <div className="flex flex-1 flex-col items-center gap-2">
                  <div className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-300 ${circle}`}>
                    <StepIcon state={state} />
                  </div>
                  <div className="text-center">
                    <p className={`text-[10px] font-bold uppercase tracking-wider leading-tight hidden sm:block ${label}`}>
                      {step.label}
                    </p>
                    <p className={`text-[10px] font-bold uppercase tracking-wider leading-tight sm:hidden ${label}`}>
                      {step.shortLabel}
                    </p>
                  </div>
                </div>

                {/* Connector line between nodes */}
                {!isLast && (
                  <div className="flex flex-1 items-start pt-4">
                    <div className={`h-0.5 w-full transition-all duration-500 ${lineClass(states[idx], states[idx + 1])}`} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Footer — report or rejection info */}
      {(application.final_report || application.status.includes('REJECTED')) && (
        <div className={`flex items-center justify-between border-t px-6 py-3 ${
          application.final_report
            ? 'border-success/20 bg-success/5'
            : 'border-danger/20 bg-danger/5'
        }`}>
          {application.final_report ? (
            <>
              <div className="flex items-center gap-2 text-xs font-medium text-success">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Official report is ready
              </div>
              <button
                onClick={() => router.push(`/report/${application.application_id}`)}
                className="flex items-center gap-1.5 rounded-lg bg-success/10 px-4 py-1.5 text-[11px] font-bold text-success hover:bg-success/20 transition-all"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View Report
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 text-xs font-medium text-danger">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Application was not approved. You may re-apply if eligible.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
