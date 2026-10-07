import React from 'react';

export type TableOperationalStatus =
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'ORDERING'
  | 'WAITING'
  | 'PREPARING'
  | 'READY'
  | 'PAYMENT'
  | 'CLEANING'
  | 'OFFLINE';

export type OrderLifecycleStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'SERVED'
  | 'COMPLETED'
  | 'CANCELLED';

interface StatusBadgeProps {
  status: string;
  type?: 'table' | 'order' | 'device';
  size?: 'sm' | 'md';
  pulse?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type = 'table',
  size = 'md',
  pulse = false,
  className = '',
}) => {
  const norm = (status || '').toUpperCase().trim();

  // 9 Distinct Table States
  const tableConfig: Record<string, { bg: string; text: string; border: string; dot: string; label: string; pulse?: boolean }> = {
    AVAILABLE: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      dot: 'bg-emerald-500',
      label: 'Available',
    },
    OCCUPIED: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      dot: 'bg-blue-600',
      label: 'Occupied',
    },
    ORDERING: {
      bg: 'bg-cyan-50',
      text: 'text-cyan-700',
      border: 'border-cyan-200',
      dot: 'bg-cyan-500',
      label: 'Ordering',
      pulse: true,
    },
    WAITING: {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      dot: 'bg-amber-500',
      label: 'Waiting',
    },
    PREPARING: {
      bg: 'bg-orange-50',
      text: 'text-orange-800',
      border: 'border-orange-200',
      dot: 'bg-orange-500',
      label: 'Preparing',
      pulse: true,
    },
    READY: {
      bg: 'bg-teal-50',
      text: 'text-teal-800',
      border: 'border-teal-300',
      dot: 'bg-teal-500',
      label: 'Ready to Serve',
      pulse: true,
    },
    PAYMENT: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      dot: 'bg-purple-600',
      label: 'Payment',
    },
    CLEANING: {
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
      dot: 'bg-rose-500',
      label: 'Cleaning',
    },
    OFFLINE: {
      bg: 'bg-slate-100',
      text: 'text-slate-600',
      border: 'border-slate-300',
      dot: 'bg-slate-400',
      label: 'Offline',
    },
    BILL_REQUESTED: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      dot: 'bg-purple-600',
      label: 'Bill Requested',
      pulse: true,
    },
    RESERVED: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      border: 'border-indigo-200',
      dot: 'bg-indigo-500',
      label: 'Reserved',
    },
  };

  // Order lifecycle states
  const orderConfig: Record<string, { bg: string; text: string; border: string; dot: string; label: string; pulse?: boolean }> = {
    PENDING: {
      bg: 'bg-sky-50',
      text: 'text-sky-700',
      border: 'border-sky-200',
      dot: 'bg-sky-500',
      label: 'Pending',
      pulse: true,
    },
    ACCEPTED: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      dot: 'bg-blue-600',
      label: 'Accepted',
    },
    PREPARING: {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      dot: 'bg-amber-500',
      label: 'Preparing',
      pulse: true,
    },
    READY: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-300',
      dot: 'bg-emerald-500',
      label: 'Ready',
      pulse: true,
    },
    SERVED: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      border: 'border-indigo-200',
      dot: 'bg-indigo-500',
      label: 'Served',
    },
    COMPLETED: {
      bg: 'bg-slate-100',
      text: 'text-slate-600',
      border: 'border-slate-200',
      dot: 'bg-slate-400',
      label: 'Completed',
    },
    CANCELLED: {
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
      dot: 'bg-rose-500',
      label: 'Cancelled',
    },
  };

  const currentConfig =
    type === 'table'
      ? tableConfig[norm] || {
          bg: 'bg-slate-100',
          text: 'text-slate-700',
          border: 'border-slate-200',
          dot: 'bg-slate-500',
          label: norm,
        }
      : orderConfig[norm] || {
          bg: 'bg-slate-100',
          text: 'text-slate-700',
          border: 'border-slate-200',
          dot: 'bg-slate-500',
          label: norm,
        };

  const isPulsing = pulse || currentConfig.pulse;
  const sizeClasses = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${currentConfig.bg} ${currentConfig.text} ${currentConfig.border} ${sizeClasses} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${currentConfig.dot} ${isPulsing ? 'animate-pulse' : ''}`} />
      <span>{currentConfig.label}</span>
    </span>
  );
};
