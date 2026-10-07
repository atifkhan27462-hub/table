'use client';

import React, { useState } from 'react';
import { StatusBadge } from '../shared/StatusBadge';
import {
  Users,
  Clock,
  Receipt,
  Sparkles,
  WifiOff,
  Eye,
  CheckCircle,
  Coffee,
  AlertCircle,
  ChefHat,
  Utensils,
  CreditCard,
  Sparkle,
  Plus,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export interface TableItem {
  id: string;
  table_number: string;
  seats?: number;
  section?: string;
  status: string; // AVAILABLE, OCCUPIED, ORDERING, WAITING, PREPARING, READY, PAYMENT, CLEANING, OFFLINE
  guests?: number;
  current_order_id?: string;
  current_order_number?: string;
  order_total?: number;
  elapsed_minutes?: number;
  ip?: string;
  latency?: string;
  hardware_status?: string;
}

interface LiveTableFloorProps {
  tables: TableItem[];
  onSelectTable: (table: TableItem) => void;
  onQuickAction?: (table: TableItem, action: string) => void;
}

export const LiveTableFloor: React.FC<LiveTableFloorProps> = ({
  tables,
  onSelectTable,
  onQuickAction,
}) => {
  const [filterSection, setFilterSection] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Extract unique sections
  const defaultSections = ['Main Dining Hall', 'Patio & Terrace', 'VIP Lounge', 'Family Suite'];
  const extractedSections = Array.from(
    new Set(tables.map((t) => t.section || 'Main Dining Hall').filter(Boolean))
  );
  const sections = extractedSections.length > 1 ? extractedSections : defaultSections;

  // Status Counts
  const availableCount = tables.filter((t) => t.status?.toUpperCase() === 'AVAILABLE').length;
  const occupiedCount = tables.filter(
    (t) =>
      ['OCCUPIED', 'ORDERING', 'WAITING', 'PREPARING', 'READY', 'PAYMENT'].includes(
        t.status?.toUpperCase()
      )
  ).length;
  const readyCount = tables.filter((t) => t.status?.toUpperCase() === 'READY').length;
  const offlineCount = tables.filter((t) => t.status?.toUpperCase() === 'OFFLINE').length;
  const occupancyPercent = tables.length > 0 ? Math.round((occupiedCount / tables.length) * 100) : 0;

  const filteredTables = tables.filter((t) => {
    const matchesSection = filterSection === 'ALL' || (t.section || 'Main Dining Hall') === filterSection;
    const matchesStatus = filterStatus === 'ALL' || t.status?.toUpperCase() === filterStatus;
    return matchesSection && matchesStatus;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 lg:p-6 transition-all">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100/80 shadow-2xs">
              <Utensils className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                Interactive Dining Floor
                <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {tables.length} Tables Connected
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Live seating, guest session timers, and instant kitchen order states
              </p>
            </div>
          </div>
        </div>

        {/* Real-time Floor Statistics Pill */}
        <div className="flex items-center gap-3 bg-slate-50 p-1.5 px-3 rounded-xl border border-slate-200/60 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Floor Load:</span>
            <div className="w-20 bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${occupancyPercent}%` }}
              />
            </div>
            <span className="font-bold text-slate-800">{occupancyPercent}%</span>
          </div>
          <div className="h-3 w-px bg-slate-200" />
          <span className="text-emerald-600 font-bold flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            {availableCount} Free
          </span>
        </div>
      </div>

      {/* Modern Section Tabs & Status Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 pb-3">
        {/* Section Segmented Control */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setFilterSection('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              filterSection === 'ALL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
            }`}
          >
            All Sections ({tables.length})
          </button>
          {sections.map((sec) => {
            const count = tables.filter((t) => (t.section || 'Main Dining Hall') === sec).length;
            return (
              <button
                key={sec}
                onClick={() => setFilterSection(sec)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  filterSection === sec
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                {sec} {count > 0 && `(${count})`}
              </button>
            );
          })}
        </div>

        {/* Status Dropdown */}
        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-8.5 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:border-slate-300 focus:outline-hidden focus:border-blue-500 shadow-2xs"
          >
            <option value="ALL">All Table Statuses</option>
            <option value="AVAILABLE">Available ({availableCount})</option>
            <option value="OCCUPIED">Occupied ({occupiedCount})</option>
            <option value="ORDERING">Ordering</option>
            <option value="PREPARING">Preparing</option>
            <option value="READY">Ready to Serve ({readyCount})</option>
            <option value="PAYMENT">Payment / Bill</option>
            <option value="CLEANING">Cleaning</option>
            <option value="OFFLINE">Offline ({offlineCount})</option>
          </select>
        </div>
      </div>

      {/* Visual Table Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 mt-2">
        {filteredTables.map((table) => {
          const status = (table.status || 'AVAILABLE').toUpperCase();
          const isAvailable = status === 'AVAILABLE';
          const isOffline = status === 'OFFLINE';
          const isReady = status === 'READY';
          const isPreparing = status === 'PREPARING';
          const isPayment = status === 'PAYMENT' || status === 'BILL_REQUESTED';
          const isOrdering = status === 'ORDERING';

          return (
            <div
              key={table.id}
              onClick={() => onSelectTable(table)}
              className={`rounded-2xl border p-4.5 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between group hover:-translate-y-0.5 hover:shadow-md ${
                isReady
                  ? 'border-emerald-300 bg-emerald-50/20 ring-2 ring-emerald-400/40 shadow-xs'
                  : isPreparing
                  ? 'border-amber-300 bg-amber-50/20 shadow-xs'
                  : isPayment
                  ? 'border-purple-300 bg-purple-50/20 ring-1 ring-purple-300 shadow-xs'
                  : isOrdering
                  ? 'border-cyan-300 bg-cyan-50/20'
                  : isOffline
                  ? 'border-slate-200 bg-slate-50/90 opacity-80'
                  : isAvailable
                  ? 'border-slate-200/90 bg-white hover:border-emerald-300 hover:ring-1 hover:ring-emerald-200'
                  : 'border-blue-200 bg-blue-50/15'
              }`}
            >
              <div>
                {/* Top Row: Table Number + Section + Status Badge */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center font-black text-xs shadow-2xs ${
                        isAvailable
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : isReady
                          ? 'bg-emerald-600 text-white'
                          : isPreparing
                          ? 'bg-amber-500 text-white'
                          : isPayment
                          ? 'bg-purple-600 text-white'
                          : isOffline
                          ? 'bg-slate-200 text-slate-600'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      {table.table_number.replace(/[^0-9]/g, '') ? `T${table.table_number.replace(/[^0-9]/g, '')}` : 'TBL'}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 tracking-tight leading-none">
                        {table.table_number}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-semibold mt-1 block">
                        {table.section || 'Main Dining'}
                      </span>
                    </div>
                  </div>

                  <StatusBadge status={status} type="table" size="sm" pulse={isReady || isPreparing} />
                </div>

                {/* Table Body Operational State */}
                {isAvailable ? (
                  <div className="py-4 px-3 rounded-xl bg-slate-50/60 border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                      <Users className="h-4 w-4 text-emerald-600" />
                      <span>{table.seats || 4} Seats Ready</span>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Open Table
                    </span>
                  </div>
                ) : isOffline ? (
                  <div className="py-4 px-3 rounded-xl bg-slate-100/60 border border-slate-200 flex items-center gap-2 text-xs text-slate-500">
                    <WifiOff className="h-4 w-4 text-slate-400" />
                    <span className="font-medium">32" Display Offline / Standby</span>
                  </div>
                ) : (
                  <div className="space-y-2 py-1 text-xs">
                    {/* Guest Count & Elapsed Timer */}
                    <div className="flex items-center justify-between text-slate-600 bg-slate-50/80 p-2 rounded-xl border border-slate-100">
                      <span className="flex items-center gap-1.5 font-bold text-slate-800">
                        <Users className="h-3.5 w-3.5 text-blue-600" />
                        {table.guests || table.seats || 2} Guests Seated
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                        <Clock className="h-3 w-3 text-slate-400" />
                        {table.elapsed_minutes || 14}m dining
                      </span>
                    </div>

                    {/* Order Details & Bill Total in PKR */}
                    <div className="flex items-center justify-between pt-1 px-1">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block leading-none">
                          Current Order
                        </span>
                        <span className="text-xs font-bold text-blue-700 leading-tight">
                          {table.current_order_number || 'ORD-ACTIVE'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block leading-none">
                          Bill Amount
                        </span>
                        <span className="text-xs font-black text-slate-900 leading-tight">
                          PKR {(table.order_total || 3450).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer: Fast POS Actions */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-medium group-hover:text-slate-600 transition-colors">
                  {isAvailable ? 'Click to seat guests' : 'Click to view ticket'}
                </span>
                <span className="font-bold text-blue-600 group-hover:text-blue-700 flex items-center gap-1 transition-colors">
                  <span>Manage</span>
                  <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
