import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Unable to Load Data',
  message = 'A connection error occurred while communicating with the restaurant API server. Please retry or check network settings.',
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-10 text-center border border-rose-200 dark:border-rose-900/50 rounded-2xl bg-rose-50/40 dark:bg-rose-950/20 ${className}`}
    >
      <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 mb-3">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">{title}</h4>
      <p className="max-w-md text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">{message}</p>
      {onRetry && (
        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
          >
            Retry Connection
          </Button>
        </div>
      )}
    </div>
  );
};
