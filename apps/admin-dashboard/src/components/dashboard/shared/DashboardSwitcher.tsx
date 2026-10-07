'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import { UtensilsCrossed, ShieldCheck, ChevronDown, Check, Lock } from 'lucide-react';

interface DashboardSwitcherProps {
  onSwitchToast?: (message: string) => void;
  className?: string;
}

export const DashboardSwitcher: React.FC<DashboardSwitcherProps> = ({
  onSwitchToast,
  className = '',
}) => {
  const { dashboardMode, setDashboardMode, canAccessAdmin } = useDashboard();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectMode = (mode: 'restaurant' | 'admin') => {
    if (mode === 'admin' && !canAccessAdmin) {
      if (onSwitchToast) onSwitchToast('🔒 Administrator permission required to switch to Admin Dashboard.');
      return;
    }

    if (mode !== dashboardMode) {
      setDashboardMode(mode, true);
      if (onSwitchToast) {
        onSwitchToast(
          mode === 'restaurant'
            ? 'Switched to Restaurant Dashboard (Operations & POS).'
            : 'Switched to Admin Dashboard (System & Analytics).'
        );
      }
    }
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-xs text-xs font-semibold text-slate-700"
        title="Switch Dashboard Mode"
      >
        {dashboardMode === 'restaurant' ? (
          <UtensilsCrossed className="h-3.5 w-3.5 text-blue-600" />
        ) : (
          <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
        )}
        <span className="hidden sm:inline">
          {dashboardMode === 'restaurant' ? 'Restaurant View' : 'Admin SaaS View'}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white shadow-lg p-1.5 z-50 animate-fadeIn">
          <div className="px-3 py-2 border-b border-slate-100 mb-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Dashboard View
            </p>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Switch operational command centers
            </p>
          </div>

          {/* Restaurant Dashboard Option */}
          <button
            onClick={() => handleSelectMode('restaurant')}
            className={`w-full flex items-start gap-2.5 p-2 rounded-lg text-left transition-colors ${
              dashboardMode === 'restaurant'
                ? 'bg-blue-50 text-blue-900 border border-blue-100'
                : 'hover:bg-slate-50 text-slate-700'
            }`}
          >
            <div className="p-1.5 rounded-md bg-blue-100 text-blue-600 shrink-0 mt-0.5">
              <UtensilsCrossed className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-900">Restaurant Dashboard</p>
                {dashboardMode === 'restaurant' && <Check className="h-3.5 w-3.5 text-blue-600" />}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">POS, Live Orders & Table Grid</p>
            </div>
          </button>

          {/* Admin Dashboard Option */}
          <button
            onClick={() => handleSelectMode('admin')}
            disabled={!canAccessAdmin}
            className={`w-full flex items-start gap-2.5 p-2 rounded-lg text-left transition-colors mt-1 ${
              !canAccessAdmin
                ? 'opacity-60 cursor-not-allowed bg-slate-50 text-slate-400'
                : dashboardMode === 'admin'
                ? 'bg-teal-50 text-teal-900 border border-teal-100'
                : 'hover:bg-slate-50 text-slate-700'
            }`}
          >
            <div className="p-1.5 rounded-md bg-teal-100 text-teal-700 shrink-0 mt-0.5">
              {canAccessAdmin ? <ShieldCheck className="h-4 w-4" /> : <Lock className="h-4 w-4 text-slate-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-900">Admin Dashboard</p>
                {dashboardMode === 'admin' && <Check className="h-3.5 w-3.5 text-teal-600" />}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {canAccessAdmin ? 'SaaS, Health, RBAC & Logs' : '🔒 Administrator permission required'}
              </p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
