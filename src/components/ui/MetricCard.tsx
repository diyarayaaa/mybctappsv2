import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  colorScheme: 'blue' | 'amber' | 'emerald' | 'purple' | 'orange' | 'rose' | 'teal' | 'indigo' | 'sky';
  onClick?: () => void;
  isActive?: boolean;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  colorScheme,
  onClick,
  isActive
}: MetricCardProps) {
  const schemeStyles = {
    blue: {
      bg: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-900/50',
      activeBorder: 'border-blue-500 dark:border-blue-500 ring-2 ring-blue-500/20',
      pill: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
    },
    amber: {
      bg: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-900/50',
      activeBorder: 'border-amber-500 dark:border-amber-500 ring-2 ring-amber-500/20',
      pill: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
    },
    emerald: {
      bg: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-900/50',
      activeBorder: 'border-emerald-500 dark:border-emerald-500 ring-2 ring-emerald-500/20',
      pill: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
    },
    purple: {
      bg: 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400',
      border: 'border-purple-200 dark:border-purple-900/50',
      activeBorder: 'border-purple-500 dark:border-purple-500 ring-2 ring-purple-500/20',
      pill: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
    },
    orange: {
      bg: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-900/50',
      activeBorder: 'border-blue-500 dark:border-blue-500 ring-2 ring-blue-500/20',
      pill: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
    },
    rose: {
      bg: 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400',
      border: 'border-rose-200 dark:border-rose-900/50',
      activeBorder: 'border-rose-500 dark:border-rose-500 ring-2 ring-rose-500/20',
      pill: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
    },
    teal: {
      bg: 'bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400',
      border: 'border-teal-200 dark:border-teal-900/50',
      activeBorder: 'border-teal-500 dark:border-teal-500 ring-2 ring-teal-500/20',
      pill: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
    },
    indigo: {
      bg: 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400',
      border: 'border-indigo-200 dark:border-indigo-900/50',
      activeBorder: 'border-indigo-500 dark:border-indigo-500 ring-2 ring-indigo-500/20',
      pill: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
    },
    sky: {
      bg: 'bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400',
      border: 'border-sky-200 dark:border-sky-900/50',
      activeBorder: 'border-sky-500 dark:border-sky-500 ring-2 ring-sky-500/20',
      pill: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
    }
  }[colorScheme];

  return (
    <div
      onClick={onClick}
      className={`relative bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border shadow-xs transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''
      } ${isActive ? schemeStyles.activeBorder : schemeStyles.border}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            {title}
          </p>
          <div className="flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {value}
            </span>
            <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">unit</span>
          </div>
          {subtitle && (
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium line-clamp-1">
              {subtitle}
            </p>
          )}
        </div>
        <div className={`p-2.5 sm:p-3.5 rounded-xl ${schemeStyles.bg} flex items-center justify-center shrink-0`}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
      </div>
    </div>
  );
}
