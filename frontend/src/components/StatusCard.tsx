'use client';

import React from 'react';

interface StatusCardProps {
  title: string;
  status: string;
  type: 'success' | 'warning' | 'info' | 'active';
  icon: React.ReactNode;
  onClick?: () => void;
  highlight?: boolean;
}

export default function StatusCard({ title, status, type, icon, onClick, highlight }: StatusCardProps) {
  const statusStyles = {
    success: 'text-indian-green bg-indian-green/10',
    warning: 'text-saffron bg-saffron/10',
    info: 'text-navy bg-navy/10',
    active: 'text-indian-green bg-indian-green/10',
  };

  const dotStyles = {
    success: 'bg-indian-green',
    warning: 'bg-saffron',
    info: 'bg-navy',
    active: 'bg-indian-green',
  };

  return (
    <div 
      onClick={onClick}
      className={`flex flex-col gap-5 rounded-2xl border p-6 shadow-soft transition-all duration-500 ${
        highlight 
          ? 'bg-[#F9F8F6] border-saffron shadow-[0_20px_40px_-15px_rgba(255,153,51,0.2)] ring-4 ring-saffron/10' 
          : 'bg-white border-border'
      } ${
        onClick ? 'cursor-pointer hover:shadow-2xl hover:-translate-y-2 hover:border-saffron/60 hover:shadow-[0_25px_50px_-12px_rgba(255,153,51,0.4)]' : ''
      }`}
    >
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-sm ${statusStyles[type]}`}>
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-black uppercase tracking-widest text-[#64748B]">{title}</h3>
        <div className="mt-2 flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${dotStyles[type]} ${type === 'active' ? 'animate-pulse' : ''}`}></div>
          <span className={`text-base font-black tracking-tight ${statusStyles[type].split(' ')[0]} uppercase`}>
            {status}
          </span>
        </div>
      </div>
    </div>
  );
}
