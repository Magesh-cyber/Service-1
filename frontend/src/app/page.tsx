'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, MousePointerClick, ShieldCheck, Zap, QrCode, ChevronRight, Users, ShieldAlert, Briefcase, ArrowRight } from 'lucide-react';
import { auth } from '@/lib/auth';

const CAROUSEL_CARDS = [
  {
    id: 'A',
    title: 'Secure Entry',
    description: 'Experience a passwordless future with biometric facial recognition or fingerprint verification. Multi-Factor Authentication (MFA) ensures that your digital identity remains unique to you, preventing identity theft and unauthorized logins.',
    icon: <Fingerprint className="w-8 h-8" />,
    color: 'saffron'
  },
  {
    id: 'B',
    title: 'One-Click Apply',
    description: 'Say goodbye to complex forms and long queues. Our unified portal remembers your verified credentials, allowing you to apply for passports, birth certificates, or income certificates with a single tap. Processed in real-time.',
    icon: <MousePointerClick className="w-8 h-8" />,
    color: 'blue'
  },
  {
    id: 'C',
    title: 'Blockchain Integrity',
    description: 'Your documents are secured as smart certificates on a decentralized ledger. This makes them instantly verifiable by any authority without the need for physical copies, as the record is permanently immutable and tamper-proof.',
    icon: <ShieldCheck className="w-8 h-8" />,
    color: 'indian-green'
  },
  {
    id: 'D',
    title: 'AI Threat Detection',
    description: 'CyberShield constantly monitors patterns across the grid. Our AI engine identifies suspicious login behaviors and unusual transaction volumes in milliseconds, locking down sensitive data before a breach can even occur.',
    icon: <Zap className="w-8 h-8" />,
    color: 'navy'
  },
  {
    id: 'E',
    title: 'Digital Ration QR',
    description: 'Take the Public Distribution System (PDS) anywhere. Your secure QR code card works even without an active internet connection, allowing you to claim rations and verify your benefits at local outlets with zero friction.',
    icon: <QrCode className="w-8 h-8" />,
    color: 'indian-green'
  }
];

const OFFICIAL_ROLES = [
  {
    title: 'Administrative Clerk',
    role: 'Case Officer',
    description: 'Manage application queues, verify citizen documents, and update service statuses.',
    icon: <Users className="w-6 h-6" />,
    link: '/clerk/login',
    color: 'blue'
  },
  {
    title: 'PDS Administrator',
    role: 'Supply Manager',
    description: 'Oversee ration distribution, manage stock inventory, and monitor outlet operations.',
    icon: <QrCode className="w-6 h-6" />,
    link: '/pds/login',
    color: 'saffron'
  },
  {
    title: 'Regional Manager',
    role: 'Directorate',
    description: 'Analyze regional performance, generate audit reports, and oversee administrative workflows.',
    icon: <ShieldAlert className="w-6 h-6" />,
    link: '/manager/login',
    color: 'navy'
  }
];

export default function LandingPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setIsAuthenticated(auth.isAuthenticated());
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % CAROUSEL_CARDS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative min-h-screen text-[#0F172A] selection:bg-saffron selection:text-white overflow-x-hidden">
      {/* Dynamic Background System */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[#F8FAFC]"></div>
        <div className="absolute inset-0 cyber-grid opacity-40"></div>
        <div className="absolute top-1/2 left-1/2 w-[120%] h-[120%] -translate-x-1/2 -translate-y-1/2 opacity-[0.35] animate-holographic">
          <img src="/flag.svg" alt="Background Flag" className="w-full h-full object-contain filter saturate-[0.9]" />
        </div>
        <div className="absolute inset-0 scanlines opacity-[0.1]"></div>
      </div>

      <div className="relative z-10">
        {/* Navbar */}
        <nav className="fixed top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-100">
          <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden">
                <img
                  src="/logo.png"
                  alt="Logo"
                  className="h-full w-full object-contain"
                  style={{ mixBlendMode: 'multiply' }}
                />
              </div>
              <div>
                <h1 className="text-sm font-black uppercase tracking-tighter leading-none text-[#0F172A]">CyberShield</h1>
                <p className="text-[10px] font-bold uppercase tracking-widest text-saffron mt-0.5">Secure Governance Platform</p>
              </div>
              <div className="h-10 w-px bg-slate-200 mx-2 hidden sm:block"></div>
              <div className="h-10 w-20 overflow-hidden hidden sm:flex items-center">
                <img
                  src="/digital_india.png"
                  alt="Digital India"
                  className="h-full w-full object-contain"
                />
              </div>
            </div>


            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-4 py-2 text-xs font-black uppercase tracking-widest text-[#0F172A] hover:text-saffron transition-colors"
              >
                Home
              </button>
              <button
                onClick={() => {
                  const element = document.getElementById('about');
                  element?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-4 py-2 text-xs font-black uppercase tracking-widest text-[#0F172A] hover:text-saffron transition-colors"
              >
                About
              </button>
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  className="rounded-xl bg-[#0F172A] px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="rounded-xl bg-[#0F172A] px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5"
                >
                  Citizen Login
                </Link>
              )}
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <main className="pt-32 pb-20 px-6 lg:px-8 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 lg:gap-8 min-h-[90vh]">
          {/* Left Column */}
          <div className="flex-1 space-y-8 text-center lg:text-left animate-in fade-in slide-in-from-left duration-1000">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200">
              <div className="h-1.5 w-1.5 rounded-full bg-saffron animate-pulse shadow-[0_0_8px_rgba(255,153,51,0.5)]"></div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">One Government Network</span>
            </div>

            <h2 className="text-5xl lg:text-7xl font-black tracking-tighter text-[#0F172A] leading-[1.05] uppercase">
              Secure Digital <br />
              Governance <br />
              <span className="text-saffron">Platform</span>
            </h2>

            <p className="max-w-xl text-lg font-medium text-slate-500 leading-relaxed mx-auto lg:mx-0">
              A unified digital infrastructure enabling citizens and government officials to access essential public services with maximum efficiency, transparency, and top-tier security.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
              <Link
                href="/login"
                className="group flex items-center gap-3 rounded-xl bg-[#0F172A] px-8 py-4 text-sm font-black uppercase tracking-widest text-white shadow-2xl hover:bg-[#1E293B] transition-all hover:-translate-y-1"
              >
                Explore Services
                <svg className="h-4 w-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Right Column - Horizontal Sliding Carousel */}
          <div className="flex-1 w-full h-[500px] relative hidden lg:flex items-center justify-center">
            <div className="relative w-full max-w-[400px] h-[350px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={CAROUSEL_CARDS[currentIndex].id}
                  initial={{ opacity: 0, x: 100 }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    boxShadow: [
                      "0 15px 40px -10px rgba(15, 23, 42, 0.1), 0 0 0px 0px rgba(15, 23, 42, 0)",
                      "0 15px 40px -10px rgba(15, 23, 42, 0.1), 0 0 20px 2px rgba(15, 23, 42, 0.15)",
                      "0 15px 40px -10px rgba(15, 23, 42, 0.1), 0 0 0px 0px rgba(15, 23, 42, 0)"
                    ]
                  }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{
                    x: { type: "spring", stiffness: 100, damping: 20 },
                    opacity: { duration: 0.4 },
                    boxShadow: { duration: 3.5, repeat: Infinity, ease: "easeInOut" }
                  }}
                  className="absolute inset-0 rounded-[40px] p-8 backdrop-blur-3xl border border-navy/15 bg-white/40 hover:border-navy/50 hover:shadow-[0_0_50px_-10px_rgba(15,23,42,0.4),0_0_20px_rgba(15,23,42,0.1)] transition-all duration-700 flex flex-col justify-between group/card cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className={`p-4 rounded-2xl bg-${CAROUSEL_CARDS[currentIndex].color}/10 text-${CAROUSEL_CARDS[currentIndex].color}`}>
                      {CAROUSEL_CARDS[currentIndex].icon}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-2xl font-black uppercase tracking-tighter leading-none text-navy">
                      {CAROUSEL_CARDS[currentIndex].title}
                    </h3>
                    <p className="text-sm font-medium text-slate-500 leading-relaxed">
                      {CAROUSEL_CARDS[currentIndex].description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 group/btn cursor-pointer">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#0F172A]">Learn More</span>
                    <ChevronRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Carousel Indicators */}
            <div className="absolute bottom-4 flex gap-2">
              {CAROUSEL_CARDS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-500 ${i === currentIndex ? 'w-8 bg-saffron shadow-[0_0_8px_rgba(255,153,51,0.3)]' : 'w-2 bg-slate-200'}`}
                />
              ))}
            </div>
          </div>
        </main>

        {/* Officials Portal Section */}
        <section className="py-24 relative z-10">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-navy/5 border border-navy/10">
                  <Briefcase className="w-3 h-3 text-navy" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-navy">Officials Portal</span>
                </div>
                <h2 className="text-3xl lg:text-5xl font-black tracking-tighter text-[#0F172A] uppercase">
                  Authorized Access <br />
                  <span className="text-slate-400">Section</span>
                </h2>
              </div>
              <p className="max-w-md text-sm font-medium text-slate-500 leading-relaxed italic">
                "Dedicated interfaces for government officials to process citizen requests with maximum transparency and speed."
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {OFFICIAL_ROLES.map((role, idx) => (
                <Link key={idx} href={role.link} className="group flex flex-col h-full">
                  <div className="flex-1 bg-slate-50 border border-slate-200 rounded-[32px] p-8 transition-all duration-500 group-hover:bg-white group-hover:border-navy group-hover:shadow-[0_30px_60px_-15px_rgba(15,23,42,0.1)] group-hover:-translate-y-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                      <Briefcase className="w-24 h-24" />
                    </div>

                    <div className="flex items-center justify-between mb-8">
                      <div className="p-3 rounded-2xl bg-white shadow-sm text-navy">
                        {role.icon}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{role.role}</span>
                    </div>

                    <h3 className="text-xl font-black text-navy uppercase tracking-tight mb-4">{role.title}</h3>
                    <p className="text-sm font-medium text-slate-500 leading-relaxed mb-8 flex-1">
                      {role.description}
                    </p>

                    <div className="flex items-center gap-2 mt-auto">
                      <span className="text-[10px] font-black uppercase tracking-widest text-navy group-hover:mr-2 transition-all">Official Sign In</span>
                      <ArrowRight className="w-3 h-3 text-navy opacity-0 group-hover:opacity-100 transition-all" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* About & Infrastructure Section */}
        <section id="about" className="py-32 bg-[#0F172A] relative overflow-hidden border-t border-white/5 scroll-mt-20">
          {/* Decorative Grid */}
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#F5E7C6 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

          <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center mb-24">
              <div className="space-y-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">Unified Mission</span>
                </div>

                <h2 className="text-4xl lg:text-6xl font-black tracking-tighter text-white uppercase leading-tight">
                  One Platform for <br />
                  <span className="text-saffron">Government Services</span>
                </h2>

                <p className="text-xl font-medium text-slate-400 leading-relaxed max-w-xl">
                  Citizens can securely access multiple government services through a single digital portal,
                  eliminating the need for multiple applications and paperwork.
                </p>

                <div className="flex items-center gap-6 pt-4">
                  <div className="h-px w-12 bg-amber-500/50"></div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em]">Secure • Unified • Paperless</p>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-[40px] p-10 backdrop-blur-md">
                <p className="text-slate-300 font-medium leading-relaxed mb-8">
                  Our unified digital infrastructure ensures that every citizen interaction is shielded by
                  top-tier encryption and verified through a decentralized integrity ledger, providing
                  unprecedented transparency in public service delivery.
                </p>
                <div className="flex flex-wrap gap-3">
                  {["SSL-256 Bit", "Blockchain", "AI-Monitored", "Zero-Knowledge"].map((tag) => (
                    <span key={tag} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="group p-8 rounded-[32px] bg-white/5 border border-white/10 backdrop-blur-sm transition-all hover:bg-white/10 hover:-translate-y-2">
                <div className="h-12 w-12 rounded-2xl bg-saffron/20 flex items-center justify-center text-saffron mb-8">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-4">AI Threat Engine</h3>
                <p className="text-sm text-slate-400 leading-relaxed font-medium">
                  Proactive risk assessment and anomaly detection monitor every transaction in real-time, preventing unauthorized access before it happens.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="group p-8 rounded-[32px] bg-white/5 border border-white/10 backdrop-blur-sm transition-all hover:bg-white/10 hover:-translate-y-2">
                <div className="h-12 w-12 rounded-2xl bg-indian-green/20 flex items-center justify-center text-indian-green mb-8">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-4">Blockchain Ledger</h3>
                <p className="text-sm text-slate-400 leading-relaxed font-medium">
                  All application certificates and redistribution logs are anchored to a decentralized ledger, ensuring total transparency and zero file tampering.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="group p-8 rounded-[32px] bg-white/5 border border-white/10 backdrop-blur-sm transition-all hover:bg-white/10 hover:-translate-y-2">
                <div className="h-12 w-12 rounded-2xl bg-navy/20 flex items-center justify-center text-navy mb-8">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-4">FastAPI Core</h3>
                <p className="text-sm text-slate-400 leading-relaxed font-medium">
                  High-concurrency backend built for national scale. Experience near-zero latency when applying for services or tracking application status.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-6 relative z-10 bg-white/40 backdrop-blur-sm border-t border-slate-100">
          <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 overflow-hidden flex items-center justify-center bg-white/80 rounded-lg p-1 shadow-sm">
                <img
                  src="/logo.png"
                  alt="Logo"
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-tighter text-navy">CyberShield</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest -mt-0.5">Secure Governance platform</p>
              </div>
              <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block"></div>
              <div className="h-10 w-20 overflow-hidden flex items-center justify-center">
                <img
                  src="/digital_india.png"
                  alt="Digital India"
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
            <p className="text-[10px] font-black text-navy uppercase tracking-[0.2em] opacity-60">
              © 2026 CYBERSHIELD NETWORK. ALL RIGHTS RESERVED.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
