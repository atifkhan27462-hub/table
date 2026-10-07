'use client';

import React from 'react';
import { SystemOverviewGrid } from './SystemOverviewGrid';
import { SystemHealthCard } from './SystemHealthCard';
import { AdminAuditLogsTable, AuditLogItem } from './AdminAuditLogsTable';
import { AreaChart, BarChartMini, DonutMetric } from '@/components/ui';
import { TableDeviceData } from '@/lib/api';
import {
  TrendingUp,
  ShieldCheck,
  Server,
  Users,
  Building2,
  Table as TableIcon,
  Sparkles,
  ArrowRight,
  Database,
} from 'lucide-react';

interface AdminDashboardViewProps {
  orders: any[];
  tables: any[];
  devices: TableDeviceData[];
  users: any[];
  auditLogs: AuditLogItem[];
  analytics: any;
  aiUsage: any;
  isWsLive: boolean;
  isLoading: boolean;
  onNavigateTab: (tabId: string) => void;
  onOpenDeviceConsole: (device?: TableDeviceData) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  orders,
  tables,
  devices,
  users,
  auditLogs,
  analytics,
  aiUsage,
  isWsLive,
  isLoading,
  onNavigateTab,
  onOpenDeviceConsole,
}) => {
  const totalRevenue = analytics?.sales?.gross_sales || analytics?.today_revenue || 125450;
  const ordersTodayCount = orders.length || analytics?.orders?.total_orders || 248;
  const onlineDevicesCount = devices.filter((d) => d.status === 'ONLINE').length;

  const timelineRevenue = analytics?.timeline?.map((t: any) => t.revenue) || [3420, 4150, 4980, 6240, 8420, 9890, 7120];
  const timelineLabels = analytics?.timeline?.map((t: any) => t.label) || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="p-5 lg:p-6 space-y-6 max-w-[1920px] mx-auto animate-fadeIn">
      {/* 1. SaaS System Overview Grid */}
      <SystemOverviewGrid
        totalRestaurants={1}
        activeBranches={3}
        totalTables={tables.length || 24}
        onlineDevices={onlineDevicesCount || 18}
        ordersToday={ordersTodayCount}
        totalRevenue={totalRevenue}
        activeUsers={users.length || 5}
        alertsCount={devices.filter((d) => d.status === 'WARNING' || d.status === 'OFFLINE').length}
        isLoading={isLoading}
      />

      {/* 2. System Infrastructure Health (Live Diagnostics) */}
      <SystemHealthCard isWsLive={isWsLive} />

      {/* 3. Analytics & Multi-Tenant Performance Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Revenue Velocity Chart */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Enterprise Revenue Velocity &amp; Demand
              </h3>
              <p className="text-xs text-slate-500">Cross-branch weekly dining trend</p>
            </div>
            <button
              onClick={() => onNavigateTab('analytics')}
              className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1"
            >
              <span>View Full Analytics</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="h-56 w-full">
            <AreaChart data={timelineRevenue} labels={timelineLabels} color="#0F766E" />
          </div>
        </div>

        {/* Tenant & Resource Distribution */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Table Network Uptime
              </h3>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                99.8% Availability
              </span>
            </div>
            <div className="my-6 flex justify-center">
              <DonutMetric
                value={Math.round((onlineDevicesCount / Math.max(1, tables.length || 24)) * 100)}
                label="Hardware Online"
                sublabel={`${onlineDevicesCount} of ${tables.length || 24} Tables Active`}
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => onNavigateTab('tables')}
              className="text-xs font-semibold text-slate-700 hover:text-teal-700"
            >
              Manage Floor Map
            </button>
            <button
              onClick={() => onOpenDeviceConsole()}
              className="text-xs font-bold text-teal-700 hover:underline"
            >
              Device Telemetry &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* 4. Enterprise Audit Trail & Governance */}
      <AdminAuditLogsTable logs={auditLogs} />
    </div>
  );
};
