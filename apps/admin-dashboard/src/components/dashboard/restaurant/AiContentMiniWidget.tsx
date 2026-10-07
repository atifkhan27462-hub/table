'use client';

import React from 'react';
import { Sparkles, Image as ImageIcon, ArrowRight, CheckCircle2, Clock } from 'lucide-react';

interface AiContentProps {
  totalGenerations: number;
  pendingCount?: number;
  failedCount?: number;
  recentGenerations?: Array<{
    id?: string;
    type: string;
    prompt?: string;
    status?: string;
    created_at?: string;
  }>;
  onOpenAiStudio: () => void;
  className?: string;
}

export const AiContentMiniWidget: React.FC<AiContentProps> = ({
  totalGenerations,
  pendingCount = 0,
  failedCount = 0,
  recentGenerations = [],
  onOpenAiStudio,
  className = '',
}) => {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-xs p-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 border border-purple-100">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">AI Culinary Media Engine</h3>
            <p className="text-[11px] text-slate-500">Dish visuals & seasonal campaign studio</p>
          </div>
        </div>

        <button
          onClick={onOpenAiStudio}
          className="flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-700"
        >
          <span>Open AI Studio</span>
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {/* Counters */}
      <div className="grid grid-cols-3 gap-2.5 my-3.5 text-center">
        <div className="p-2.5 rounded-lg bg-purple-50/50 border border-purple-100">
          <span className="text-[10px] font-bold text-purple-700 uppercase block">Generated</span>
          <span className="text-lg font-black text-purple-900">{totalGenerations}</span>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-[10px] font-bold text-slate-600 uppercase block">Pending</span>
          <span className="text-lg font-black text-slate-800">{pendingCount}</span>
        </div>
        <div className="p-2.5 rounded-lg bg-rose-50/50 border border-rose-100">
          <span className="text-[10px] font-bold text-rose-700 uppercase block">Failed</span>
          <span className="text-lg font-black text-rose-900">{failedCount}</span>
        </div>
      </div>

      {/* Quick Action Button & Guard Notice */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[10px] text-slate-400 font-medium">
          Deterministic pricing &amp; tax safety locked
        </span>
        <button
          onClick={onOpenAiStudio}
          className="px-3 py-1 text-xs font-bold rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors shadow-xs"
        >
          + Generate Image
        </button>
      </div>
    </div>
  );
};
