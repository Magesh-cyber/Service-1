'use client';

import React from 'react';

interface StatusCardProps {
  title: string;
  status: string;
  type: 'success' | 'warning' | 'info' | 'active';
  icon: React.ReactNode;
  onClick?: () => void;
}

export default function StatusCard({ title, status, type, icon, onClick }: StatusCardProps) {
  const statusStyles = {
    success: 'text-success bg-success/10',
    warning: 'text-warning bg-warning/10',
    info: 'text-primary bg-primary/10',
    active: 'text-success bg-success/10',
  };

  const dotStyles = {
    success: 'bg-success',
    warning: 'bg-warning',
    info: 'bg-primary',
    active: 'bg-success',
  };

  return (
    <div 
      onClick={onClick}
      className={`flex flex-col gap-4 rounded-xl border border-border bg-white p-5 shadow-soft transition-all ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-primary/20 active:scale-[0.98]' : ''
      }`}
    >
      <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${statusStyles[type]}`}>
        {icon}
      </div>
      <div>
        <h3 className="text-base font-bold text-navy">{title}</h3>
        <div className="mt-1 flex items-center gap-1.5">
          <div className={`h-1.5 w-1.5 rounded-full ${dotStyles[type]}`}></div>
          <span className={`text-sm font-medium ${statusStyles[type].split(' ')[0]}`}>
            {status}
          </span>
        </div>
      </div>
    </div>
  );
}
