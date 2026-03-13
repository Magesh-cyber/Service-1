'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Script from 'next/script';
import { auth } from '@/lib/auth';
import { apiFetch, endpoints } from '@/lib/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(val: string | null | undefined, fallback = '—') {
  return val || fallback;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function serviceLabel(type: string) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Status / decision badge ──────────────────────────────────────────────────
function Badge({ text, variant }: { text: string; variant: 'success' | 'danger' | 'warning' | 'info' | 'gray' }) {
  const map = {
    success: 'bg-success/10 text-success border-success/20',
    danger:  'bg-danger/10  text-danger  border-danger/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    info:    'bg-blue-50    text-blue-700 border-blue-200',
    gray:    'bg-muted/10   text-muted   border-border',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest ${map[variant]}`}>
      {text}
    </span>
  );
}

function statusVariant(status: string): 'success' | 'danger' | 'warning' | 'info' | 'gray' {
  if (status === 'APPROVED') return 'success';
  if (status.includes('REJECTED')) return 'danger';
  if (status === 'UNDER_MANAGER_REVIEW') return 'info';
  if (status === 'UNDER_CLERK_REVIEW') return 'warning';
  return 'gray';
}

function decisionVariant(dec: string | undefined): 'success' | 'danger' | 'gray' {
  if (dec === 'APPROVED') return 'success';
  if (dec === 'REJECTED') return 'danger';
  return 'gray';
}

function confidenceVariant(level: string | undefined): 'success' | 'warning' | 'danger' | 'gray' {
  if (level === 'HIGH') return 'success';
  if (level === 'MEDIUM') return 'warning';
  if (level === 'LOW') return 'danger';
  return 'gray';
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border bg-[#F8FAFC] px-5 py-3">
        <span className="text-primary">{icon}</span>
        <h3 className="text-xs font-bold uppercase tracking-widest text-navy">{title}</h3>
      </div>
      <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-y-0 sm:divide-x">
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, wide = false }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`px-5 py-4 ${wide ? 'sm:col-span-2' : ''}`}>
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted/60 mb-1">{label}</p>
      <div className="text-sm font-semibold text-navy">{value}</div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ReportPage() {
  const router = useRouter();
  const params = useParams();
  const applicationId = params?.applicationId as string;
  const reportRef = useRef<HTMLDivElement>(null);

  const [report, setReport] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push('/login');
      return;
    }
    if (!applicationId) return;

    apiFetch(endpoints.report(applicationId))
      .then(setReport)
      .catch((err) => setError(err.message || 'Failed to load report'))
      .finally(() => setIsLoading(false));
  }, [applicationId, router]);

  const handleDownloadPdf = async () => {
    if (!reportRef.current || isGenerating) return;
    
    setIsGenerating(true);
    try {
      const htmlToImage = (window as any).htmlToImage;
      const { jsPDF } = (window as any).jspdf;

      if (!htmlToImage || !jsPDF) {
        throw new Error('PDF libraries are still loading. Please try again in a moment.');
      }

      // html-to-image is much better at handling modern CSS (Tailwind v4 lab/oklch colors)
      // because it uses SVG foreignObject rendering instead of a custom CSS parser.
      const dataUrl = await htmlToImage.toPng(reportRef.current, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#f8fafc',
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate dimensions to fit on page while maintaining aspect ratio
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => (img.onload = resolve));
      
      const imgWidth = pdfWidth - 20; // 10mm margins
      const imgHeight = (img.height * imgWidth) / img.width;
      
      pdf.addImage(dataUrl, 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save(`CyberShield_Report_${applicationId}.pdf`);
    } catch (err: any) {
      console.error('PDF Generation Error:', err);
      alert('PDF generation failed. Using print fallback as alternative.');
      window.print();
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) return (
    <div className="flex h-[calc(100vh-200px)] items-center justify-center">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
    </div>
  );

  if (error || !report) return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-danger/20 bg-danger/5 py-16 text-center">
      <svg className="h-10 w-10 text-danger/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-sm font-bold text-danger">{error || 'Report not available yet.'}</p>
      <button onClick={() => router.back()} className="text-xs text-primary underline">Go back</button>
    </div>
  );

  const isApproved = report.status === 'APPROVED';

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-20">
      {/* Load PDF libraries via CDN */}
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js" strategy="lazyOnload" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" strategy="lazyOnload" />

      <div ref={reportRef} className="space-y-6 bg-[#FAFBFC] p-4 sm:p-8 rounded-3xl">

      {/* ── Official Header ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-white shadow-soft overflow-hidden">
        {/* top colour bar */}
        <div className="h-1.5 bg-gradient-to-r from-primary via-primary/80 to-primary/40" />

        <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
          {/* Emblem */}
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm border border-primary/20 mb-2">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-muted/60">Government of India — Digital Governance Division</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-navy">CyberShield e-Governance</h1>
          <p className="text-base font-semibold text-muted">Official Service Application Report</p>
          <div className="mt-3 flex items-center gap-3">
            <Badge
              text={report.status.replace(/_/g, ' ')}
              variant={statusVariant(report.status)}
            />
          </div>
        </div>

        {/* Application ID + generated bar */}
        <div className="flex items-center justify-between border-t border-border bg-[#F8FAFC] px-6 py-3">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted/60">Application ID</span>
            <span className="font-extrabold text-primary tracking-wide">{report.application_id}</span>
          </div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-muted/60">
            {isApproved
              ? `Finalised: ${fmtDate(report.updated_at)}`
              : `Submitted: ${fmtDate(report.created_at)}`}
          </div>
        </div>
      </div>

      {/* ── Application Details ─────────────────────────────────────────────── */}
      <Section
        title="Application Details"
        icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
      >
        <Field label="Service Type" value={serviceLabel(report.service_type)} />
        <Field label="Date Submitted" value={fmtDate(report.created_at)} />
      </Section>

      {/* ── Citizen Details ─────────────────────────────────────────────────── */}
      <Section
        title="Citizen Details"
        icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
      >
        <Field label="Full Name" value={fmt(report.applicant_name)} />
        <Field label="Date of Birth" value={fmt(report.dob)} />
        <Field label="Parent / Guardian" value={fmt(report.parent_name)} />
        <Field label="Phone" value={fmt(report.phone)} />
        <Field label="Address" value={fmt(report.address)} wide />
      </Section>

      {/* ── Risk & Confidence ───────────────────────────────────────────────── */}
      <Section
        title="Risk & Confidence Assessment"
        icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
      >
        <Field
          label="Risk Score"
          value={
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted/10">
                <div
                  className={`h-full transition-all ${(report.risk_score ?? 0) <= 20 ? 'bg-success' : (report.risk_score ?? 0) <= 40 ? 'bg-warning' : 'bg-danger'}`}
                  style={{ width: `${Math.min(report.risk_score ?? 0, 100)}%` }}
                />
              </div>
              <span className="font-bold">{fmt(String(report.risk_score))}</span>
            </div>
          }
        />
        <Field
          label="Confidence Level"
          value={
            <Badge
              text={fmt(report.confidence_level)}
              variant={confidenceVariant(report.confidence_level)}
            />
          }
        />
      </Section>

      {/* ── Approval Workflow ───────────────────────────────────────────────── */}
      <Section
        title="Approval Workflow"
        icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
      >
        <Field
          label="Clerk Decision"
          value={
            report.clerk_decision
              ? <Badge text={report.clerk_decision} variant={decisionVariant(report.clerk_decision)} />
              : <span className="text-muted/50 italic text-xs">Pending</span>
          }
        />
        <Field label="Clerk Remark" value={fmt(report.clerk_remark)} />
        <Field
          label="Manager Decision"
          value={
            report.manager_decision
              ? <Badge text={report.manager_decision} variant={decisionVariant(report.manager_decision)} />
              : <span className="text-muted/50 italic text-xs">Pending</span>
          }
        />
        <Field label="Manager Remark" value={fmt(report.manager_remark)} />
      </Section>

      {/* ── Blockchain Integrity ─────────────────────────────────────────────── */}
      {report.blockchain && (
        <Section
          title="Blockchain Integrity"
          icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>}
        >
          <Field label="Integrity Status" value={<Badge text={report.blockchain.integrity_status} variant={report.blockchain.integrity_status === 'VALID' ? 'success' : 'danger'} />} />
          <Field label="Block Reference" value={<span className="font-mono text-xs">{fmt(report.blockchain.block_ref)}</span>} />
          <Field label="Record Hash" value={<span className="font-mono text-xs break-all">{fmt(report.blockchain.record_hash)}</span>} wide />
        </Section>
      )}

      {/* ── Final Decision ───────────────────────────────────────────────────── */}
      <div className={`rounded-2xl border p-6 ${isApproved ? 'border-success/30 bg-success/5' : 'border-border bg-white'} shadow-soft`}>
        <div className="flex items-center gap-3 mb-4">
          {isApproved ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/10 text-muted">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          )}
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted/60">Final Decision</p>
            <p className={`text-base font-extrabold ${isApproved ? 'text-success' : 'text-navy'}`}>
              {isApproved ? 'Application Approved' : report.status.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
        {isApproved && report.updated_at && (
          <p className="text-xs text-muted/70">
            Officially approved on <strong>{fmtDate(report.updated_at)}</strong> by Senior Manager, CyberShield e-Governance.
          </p>
        )}
      </div>

      </div>

      {/* ── Actions ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 rounded-xl border border-border bg-white px-5 py-2.5 text-sm font-bold text-navy hover:bg-muted/5 transition-all shadow-soft"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Dashboard
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-dark transition-all shadow-md"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          Print Report
        </button>
        <button
          onClick={handleDownloadPdf}
          disabled={isGenerating}
          className={`flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-bold transition-all shadow-md ${
            isGenerating ? 'bg-muted/10 text-muted cursor-wait' : 'bg-white text-navy hover:bg-muted/5'
          }`}
        >
          {isGenerating ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          ) : (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          )}
          {isGenerating ? 'Generating...' : 'Download PDF'} 
        </button>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <div className="border-t border-border pt-6 text-center">
        <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-muted/40">
          This is an electronically generated document. Powered by CyberShield Secure e-Governance Platform.
        </p>
        <p className="mt-1 text-[9px] text-muted/30">
          Application ID: {report.application_id} · Generated: {fmtDate(new Date().toISOString())}
        </p>
      </div>

    </div>
  );
}
