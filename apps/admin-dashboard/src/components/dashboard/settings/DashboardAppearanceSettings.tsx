'use client';

import React, { useState } from 'react';
import { useDashboard, DashboardMode } from '@/lib/dashboard-context';
import {
  UtensilsCrossed,
  ShieldCheck,
  Check,
  Eye,
  Save,
  Lock,
  Sparkles,
  Info,
  CheckCircle2,
} from 'lucide-react';

interface AppearanceSettingsProps {
  onShowToast: (msg: string) => void;
}

export const DashboardAppearanceSettings: React.FC<AppearanceSettingsProps> = ({
  onShowToast,
}) => {
  const {
    dashboardMode,
    savedPreference,
    savePreference,
    startPreview,
    canAccessAdmin,
    currentUser,
  } = useDashboard();

  const [selectedDraft, setSelectedDraft] = useState<DashboardMode>(savedPreference);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    savePreference(selectedDraft);
    setSavedSuccess(true);
    onShowToast('Dashboard preference updated successfully.');
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-100">
        <h3 className="text-base font-bold text-slate-900 tracking-tight">
          Appearance &amp; Dashboard Interface
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Customize your default operating environment. Choose between a fast-paced restaurant POS command center or an enterprise SaaS management console.
        </p>
      </div>

      {/* Role-Aware Defaults Notice */}
      <div className="p-3.5 rounded-lg bg-blue-50/60 border border-blue-200 flex items-start gap-3">
        <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900">
          <p className="font-bold">Role-Aware System Defaults Active</p>
          <p className="text-blue-700 mt-0.5 leading-relaxed">
            Your authenticated role is <strong className="uppercase">{currentUser?.role_code || 'SUPER_ADMIN'}</strong>.
            By default, administrators land in the <strong>Admin Dashboard</strong>, while restaurant managers, floor staff, and kitchen stations default to the <strong>Restaurant Dashboard</strong>. You can override your personal view preference below.
          </p>
        </div>
      </div>

      {/* Visual Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Restaurant Dashboard */}
        <div
          onClick={() => setSelectedDraft('restaurant')}
          className={`rounded-xl border-2 p-5 transition-all cursor-pointer relative bg-white flex flex-col justify-between ${
            selectedDraft === 'restaurant'
              ? 'border-blue-600 ring-2 ring-blue-600/10 shadow-md'
              : 'border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          {selectedDraft === 'restaurant' && (
            <div className="absolute top-4 right-4 h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Check className="h-4 w-4" />
            </div>
          )}

          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                <UtensilsCrossed className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Restaurant Dashboard</h4>
                <span className="text-[11px] font-semibold text-blue-600">
                  Restaurant Operations &amp; POS Optimized
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Designed for restaurant managers and floor hosts. Features real-time visual table management (9 states), live order queue, KDS kitchen metrics, quick dish ordering, and operational sales KPIs.
            </p>

            {/* Mock Visual Layout Preview */}
            <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-[10px] space-y-1.5 font-mono text-slate-600 select-none">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200 font-bold text-slate-800">
                <span>[POS Command Center]</span>
                <span className="text-emerald-600">● LIVE FEED</span>
              </div>
              <div className="grid grid-cols-3 gap-1 py-1">
                <span className="p-1 rounded bg-white border text-center">Table 01: READY</span>
                <span className="p-1 rounded bg-white border text-center">Table 02: PREP</span>
                <span className="p-1 rounded bg-white border text-center">Table 03: OPEN</span>
              </div>
              <div className="text-[9px] text-slate-400">Order #1048 • 2x Burger • PKR 3,250</div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                startPreview('restaurant');
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Preview Interface</span>
            </button>

            <span
              className={`px-3 py-1 rounded-lg text-xs font-bold ${
                selectedDraft === 'restaurant'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {selectedDraft === 'restaurant' ? 'Active Selection' : 'Select'}
            </span>
          </div>
        </div>

        {/* Card 2: Admin Dashboard */}
        <div
          onClick={() => {
            if (canAccessAdmin) setSelectedDraft('admin');
          }}
          className={`rounded-xl border-2 p-5 transition-all relative bg-white flex flex-col justify-between ${
            !canAccessAdmin
              ? 'opacity-60 cursor-not-allowed border-slate-200 bg-slate-50/50'
              : selectedDraft === 'admin'
              ? 'border-teal-600 ring-2 ring-teal-600/10 shadow-md cursor-pointer'
              : 'border-slate-200 hover:border-slate-300 shadow-xs cursor-pointer'
          }`}
        >
          {selectedDraft === 'admin' && (
            <div className="absolute top-4 right-4 h-6 w-6 rounded-full bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Check className="h-4 w-4" />
            </div>
          )}

          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 rounded-lg bg-teal-50 text-teal-700 border border-teal-100">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Admin Dashboard</h4>
                <span className="text-[11px] font-semibold text-teal-700">
                  System Administration &amp; SaaS Analytics
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Designed for system owners and enterprise administrators. Features multi-tenant restaurant and branch controls, user RBAC privileges, live API/DB health telemetry, audit trails, and global SaaS analytics.
            </p>

            {/* Mock Visual Layout Preview */}
            <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-[10px] space-y-1.5 font-mono text-slate-600 select-none">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200 font-bold text-slate-800">
                <span>[SaaS Admin Console]</span>
                <span className="text-teal-700">99.8% HEALTHY</span>
              </div>
              <div className="grid grid-cols-3 gap-1 py-1">
                <span className="p-1 rounded bg-white border text-center">API: 8ms</span>
                <span className="p-1 rounded bg-white border text-center">DB: UP</span>
                <span className="p-1 rounded bg-white border text-center">WS: SYNC</span>
              </div>
              <div className="text-[9px] text-slate-400">Tenants • Users &amp; RBAC • Security Logs</div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
            {canAccessAdmin ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  startPreview('admin');
                }}
                className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Preview Interface</span>
              </button>
            ) : (
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                <Lock className="h-3.5 w-3.5" />
                <span>Administrator Permission Required</span>
              </span>
            )}

            <span
              className={`px-3 py-1 rounded-lg text-xs font-bold ${
                !canAccessAdmin
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  : selectedDraft === 'admin'
                  ? 'bg-teal-700 text-white'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {selectedDraft === 'admin' ? 'Active Selection' : 'Select'}
            </span>
          </div>
        </div>
      </div>

      {/* Save Action & Feedback */}
      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
        <div>
          {savedSuccess && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              <CheckCircle2 className="h-4 w-4" />
              <span>Dashboard preference saved and active!</span>
            </span>
          )}
        </div>

        <button
          onClick={handleSave}
          className="px-5 py-2 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          <span>Save Preference</span>
        </button>
      </div>
    </div>
  );
};
