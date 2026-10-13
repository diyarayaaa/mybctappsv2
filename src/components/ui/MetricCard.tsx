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
      iconBg: 'bg-blue-600',
      activeRing: 'ring-2 ring-blue-500 dark:ring-blue-400'
    },
    amber: {
      iconBg: 'bg-amber-500',
      activeRing: 'ring-2 ring-amber-500 dark:ring-amber-400'
    },
    emerald: {
      iconBg: 'bg-emerald-500',
      activeRing: 'ring-2 ring-emerald-500 dark:ring-emerald-400'
    },
    purple: {
      iconBg: 'bg-purple-600',
      activeRing: 'ring-2 ring-purple-500 dark:ring-purple-400'
    },
    orange: {
      iconBg: 'bg-orange-500',
      activeRing: 'ring-2 ring-orange-500 dark:ring-orange-400'
    },
    rose: {
      iconBg: 'bg-rose-500',
      activeRing: 'ring-2 ring-rose-500 dark:ring-rose-400'
    },
    teal: {
      iconBg: 'bg-teal-500',
      activeRing: 'ring-2 ring-teal-500 dark:ring-teal-400'
    },
    indigo: {
      iconBg: 'bg-indigo-600',
      activeRing: 'ring-2 ring-indigo-500 dark:ring-indigo-400'
    },
    sky: {
      iconBg: 'bg-sky-500',
      activeRing: 'ring-2 ring-sky-500 dark:ring-sky-400'
    }
  }[colorScheme];

  return (
    <div
      onClick={onClick}
      className={`relative bg-white dark:bg-slate-900 rounded-2xl p-3.5 sm:p-4.5 shadow-xs transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''
      } ${isActive ? schemeStyles.activeRing + ' shadow-md' : ''}`}
    >
      <div className="flex items-center gap-3 sm:gap-3.5">
        {/* Solid Circular Icon */}
        <div
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full ${schemeStyles.iconBg} flex items-center justify-center text-white shadow-sm shrink-0`}
        >
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
        </div>

        {/* Text Content (Beside Icon) */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {value}
            </span>
            <span className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 font-medium">unit</span>
          </div>

          <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">
            {title}
          </p>
        </div>
      </div>
    </div>
  );
}
