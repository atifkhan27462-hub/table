import React from 'react';
import { Loader2 } from 'lucide-react';

export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-10 w-10',
  }[size];

  return <Loader2 className={`animate-spin text-blue-600 dark:text-blue-400 ${sizeClasses} ${className}`} />;
};

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-md ${className}`} />
);

export const SkeletonCard: React.FC = () => (
  <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col gap-4 animate-pulse">
    <div className="flex items-center justify-between">
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-4 w-12 rounded-full" />
    </div>
    <Skeleton className="h-10 w-full" />
    <div className="flex justify-between items-center pt-2">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-8 w-20 rounded-lg" />
    </div>
  </div>
);

export const LoadingState: React.FC<{ message?: string; className?: string }> = ({
  message = 'Loading data...',
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 gap-3 ${className}`}>
      <Spinner size="lg" />
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 animate-pulse tracking-wide">
        {message}
      </p>
    </div>
  );
};
