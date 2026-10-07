'use client';

import React from 'react';
import { ChefHat, Flame, Clock, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';

interface KitchenPerformanceProps {
  waitingCount: number;
  preparingCount: number;
  readyCount: number;
  delayedCount: number;
  completedTodayCount: number;
  avgPrepMinutes: number;
  stationThroughput?: {
    GRILL?: number;
    SAUTE?: number;
    BAR?: number;
    OVEN?: number;
    [key: string]: number | undefined;
  };
  onOpenKds?: () => void;
}

export const KitchenPerformanceWidget: React.FC<KitchenPerformanceProps> = ({
  waitingCount,
  preparingCount,
  readyCount,
  delayedCount,
  completedTodayCount,
  avgPrepMinutes,
  stationThroughput = { GRILL: 0, SAUTE: 0, BAR: 0, OVEN: 0 },
  onOpenKds,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-orange-50 text-orange-600 border border-orange-100">
            <ChefHat className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Kitchen Operations (KDS)</h3>
            <p className="text-[11px] text-slate-500">Live ticket queue & station efficiency</p>
          </div>
        </div>

        {onOpenKds && (
          <button
            onClick={onOpenKds}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            <span>Open KDS Station</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Ticket Stage Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3.5">
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Orders Waiting</span>
          <span className="text-xl font-black text-slate-900">{waitingCount}</span>
        </div>
        <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-100">
          <span className="text-[10px] font-bold uppercase text-amber-700 block">Preparing</span>
          <span className="text-xl font-black text-amber-900">{preparingCount}</span>
        </div>
        <div className="p-3 rounded-lg bg-teal-50/60 border border-teal-100">
          <span className="text-[10px] font-bold uppercase text-teal-700 block">Ready to Serve</span>
          <span className="text-xl font-black text-teal-900">{readyCount}</span>
        </div>
        <div className="p-3 rounded-lg bg-rose-50/60 border border-rose-100">
          <span className="text-[10px] font-bold uppercase text-rose-700 block">Delayed (&gt;20m)</span>
          <span className="text-xl font-black text-rose-900">{delayedCount}</span>
        </div>
      </div>

      {/* Speed & Throughput */}
      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-slate-400" />
          <span className="text-slate-600 font-medium">Avg Ticket Preparation Time:</span>
          <span className="font-bold text-slate-900">{avgPrepMinutes} minutes</span>
        </div>

        {/* Station Breakdown Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {Object.entries(stationThroughput).map(([stn, count]) => (
            <span
              key={stn}
              className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200"
            >
              {stn}: <strong className="text-slate-900">{count}</strong>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
