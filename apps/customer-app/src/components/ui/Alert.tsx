import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export type AlertType = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps {
  type?: AlertType;
  title?: React.ReactNode;
  children: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

const alertConfig: Record<AlertType, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  info: {
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    border: 'border-sky-200 dark:border-sky-800',
    text: 'text-sky-900 dark:text-sky-200',
    icon: <Info className="h-5 w-5 text-sky-600 dark:text-sky-400 shrink-0" />,
  },
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-900 dark:text-emerald-200',
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />,
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-900 dark:text-amber-200',
    icon: <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />,
  },
  error: {
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    border: 'border-rose-200 dark:border-rose-800',
    text: 'text-rose-900 dark:text-rose-200',
    icon: <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" />,
  },
};

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  children,
  onDismiss,
  className = '',
}) => {
  const config = alertConfig[type];

  return (
    <div
      role="alert"
      className={`flex items-start gap-3.5 p-4 rounded-xl border ${config.bg} ${config.border} ${config.text} ${className}`}
    >
      {config.icon}
      <div className="flex-1 text-xs leading-relaxed">
        {title && <h5 className="font-semibold text-sm mb-0.5 tracking-tight">{title}</h5>}
        <div>{children}</div>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="p-1 rounded-md opacity-70 hover:opacity-100 transition-opacity"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
