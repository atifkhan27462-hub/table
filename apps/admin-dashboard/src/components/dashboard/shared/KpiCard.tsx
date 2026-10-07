import React from 'react';
import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';

export interface KpiCardProps {
  title: string;
  value: string | number;
  change?: number; // e.g. 12.4
  changePeriod?: string; // e.g. "vs yesterday"
  prefix?: string;
  suffix?: string;
  icon?: React.ReactNode;
  variant?: 'blue' | 'teal' | 'amber' | 'emerald' | 'purple' | 'rose';
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyText?: string;
  className?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  change,
  changePeriod = 'vs previous period',
  prefix,
  suffix,
  icon,
  variant = 'blue',
  loading = false,
  error = null,
  empty = false,
  emptyText = 'No data available',
  className = '',
}) => {
  const variantStyles = {
    blue: {
      iconBg: 'bg-blue-50 text-blue-600 border-blue-100',
      accent: 'border-l-blue-600',
    },
    teal: {
      iconBg: 'bg-teal-50 text-teal-600 border-teal-100',
      accent: 'border-l-teal-600',
    },
    amber: {
      iconBg: 'bg-amber-50 text-amber-600 border-amber-100',
      accent: 'border-l-amber-500',
    },
    emerald: {
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      accent: 'border-l-emerald-600',
    },
    purple: {
      iconBg: 'bg-purple-50 text-purple-600 border-purple-100',
      accent: 'border-l-purple-600',
    },
    rose: {
      iconBg: 'bg-rose-50 text-rose-600 border-rose-100',
      accent: 'border-l-rose-500',
    },
  }[variant];

  if (loading) {
    return (
      <div className={`bg-white rounded-xl border border-slate-200 p-5 shadow-xs animate-pulse ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 bg-slate-200 rounded w-28" />
          <div className="h-9 w-9 bg-slate-100 rounded-lg" />
        </div>
        <div className="h-8 bg-slate-200 rounded w-36 mb-2" />
        <div className="h-3 bg-slate-100 rounded w-24" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-xl border border-rose-200 p-5 shadow-xs ${className}`}>
        <div className="flex items-center gap-2 text-rose-600 text-xs font-semibold mb-1">
          <AlertCircle className="h-4 w-4" />
          <span>Error loading metric</span>
        </div>
        <p className="text-xs text-slate-500">{error}</p>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">{title}</p>
          {empty ? (
            <p className="text-sm text-slate-400 italic py-1">{emptyText}</p>
          ) : (
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight flex items-baseline gap-1">
              {prefix && <span className="text-sm font-semibold text-slate-500">{prefix}</span>}
              <span>{value}</span>
              {suffix && <span className="text-sm font-semibold text-slate-500">{suffix}</span>}
            </h3>
          )}
        </div>
        {icon && (
          <div className={`p-2.5 rounded-xl border shrink-0 ${variantStyles.iconBg}`}>
            {icon}
          </div>
        )}
      </div>

      {change !== undefined && !empty && (
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          {change > 0 ? (
            <span className="inline-flex items-center gap-0.5 text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/50">
              <TrendingUp className="h-3 w-3" />+{change}%
            </span>
          ) : change < 0 ? (
            <span className="inline-flex items-center gap-0.5 text-rose-600 font-semibold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200/50">
              <TrendingDown className="h-3 w-3" />{change}%
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 text-slate-500 font-medium bg-slate-100 px-1.5 py-0.5 rounded">
              <Minus className="h-3 w-3" />0.0%
            </span>
          )}
          <span className="text-slate-400 text-[11px] truncate">{changePeriod}</span>
        </div>
      )}
    </div>
  );
};
