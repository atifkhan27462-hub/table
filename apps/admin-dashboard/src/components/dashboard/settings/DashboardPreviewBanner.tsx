'use client';

import React from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import { Eye, Check, X } from 'lucide-react';

export const DashboardPreviewBanner: React.FC = () => {
  const { previewMode, exitPreview, savePreference } = useDashboard();

  if (!previewMode) return null;

  return (
    <div className="bg-amber-500 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-md z-50">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 text-amber-100" />
        <span>
          <strong>PREVIEW MODE ACTIVE:</strong> You are previewing the{' '}
          <span className="uppercase font-bold underline">
            {previewMode === 'restaurant' ? 'Restaurant Operations Dashboard' : 'Admin SaaS Dashboard'}
          </span>
          .
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            savePreference(previewMode);
            exitPreview();
          }}
          className="px-3 py-1 rounded bg-white text-slate-900 font-bold hover:bg-slate-100 transition-colors flex items-center gap-1 shadow-xs"
        >
          <Check className="h-3.5 w-3.5 text-emerald-600" />
          <span>Apply as Default</span>
        </button>
        <button
          onClick={exitPreview}
          className="px-2.5 py-1 rounded bg-amber-600/80 hover:bg-amber-600 text-white font-medium transition-colors flex items-center gap-1"
        >
          <X className="h-3.5 w-3.5" />
          <span>Exit Preview</span>
        </button>
      </div>
    </div>
  );
};
