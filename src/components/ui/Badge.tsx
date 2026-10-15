import React from 'react';
import { StatusTiket } from '@/types';

interface BadgeProps {
  status: StatusTiket | string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const BADGE_STYLES: Record<string, { label: string; badgeClass: string }> = {
  'PROSES SERVICE': {
    label: 'Proses Service',
    badgeClass: 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
  },
  'PENDING SERVICE': {
    label: 'Pending Service',
    badgeClass: 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
  },
  'SELESAI BELUM DIAMBIL': {
    label: 'Siap Ambil',
    badgeClass: 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
  },
  'SELESAI NUNGGU DIAMBIL': {
    label: 'Siap Ambil',
    badgeClass: 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
  },
  'SELESAI & DIAMBIL': {
    label: 'Selesai & Diambil',
    badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
  },
  'GAGAL SERVICE/GARANSI': {
    label: 'Gagal Service/Garansi',
    badgeClass: 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
  },
  'GAGAL SERVICE/RMA': {
    label: 'Gagal Service/Garansi',
    badgeClass: 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
  },
  'PROSES GARANSI': {
    label: 'Proses Garansi',
    badgeClass: 'bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
  },
  'ALIH SERVICE': {
    label: 'Alih Service',
    badgeClass: 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
  }
};

export function StatusBadge({ status, className = '', size = 'md' }: BadgeProps) {
  const trimmed = typeof status === 'string' ? status.trim() : '';
  const config = (trimmed && BADGE_STYLES[trimmed]) || {
    label: trimmed || 'Belum Ada Status',
    badgeClass: trimmed
      ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-dashed border-slate-300 dark:border-slate-700'
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] sm:text-xs font-semibold',
    md: 'px-2.5 py-1 text-xs font-semibold',
    lg: 'px-3 py-1.5 text-xs sm:text-sm font-semibold'
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border shadow-xs transition-colors ${config.badgeClass} ${sizeClasses} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${trimmed ? 'bg-current opacity-75 animate-pulse' : 'bg-slate-400'}`} />
      <span className="truncate">{config.label}</span>
    </span>
  );
}

export function ServiceTypeBadge({ type }: { type: 'SERVICE' | 'GARANSI' | string }) {
  const isGaransi = type === 'GARANSI';
  return (
    <span
      className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold uppercase tracking-wider ${
        isGaransi
          ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
          : 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
      }`}
    >
      {type}
    </span>
  );
}
