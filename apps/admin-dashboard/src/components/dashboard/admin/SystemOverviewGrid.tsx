'use client';

import React from 'react';
import { KpiCard } from '../shared/KpiCard';
import {
  Building2,
  Store,
  Table as TableIcon,
  Monitor,
  Receipt,
  DollarSign,
  Users,
  ShieldAlert,
} from 'lucide-react';

interface SystemOverviewProps {
  totalRestaurants?: number;
  activeBranches?: number;
  totalTables: number;
  onlineDevices: number;
  ordersToday: number;
  totalRevenue: number;
  activeUsers: number;
  alertsCount?: number;
  isLoading?: boolean;
}

export const SystemOverviewGrid: React.FC<SystemOverviewProps> = ({
  totalRestaurants = 1,
  activeBranches = 3,
  totalTables,
  onlineDevices,
  ordersToday,
  totalRevenue,
  activeUsers,
  alertsCount = 0,
  isLoading = false,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      <KpiCard
        title="Organizations / Tenants"
        value={`${totalRestaurants} Active`}
        changePeriod={`${activeBranches} active branches`}
        icon={<Building2 className="h-5 w-5" />}
        variant="blue"
        loading={isLoading}
      />
      <KpiCard
        title="Total Interactive Tables"
        value={totalTables}
        changePeriod={`${onlineDevices} devices online`}
        icon={<TableIcon className="h-5 w-5" />}
        variant="teal"
        loading={isLoading}
      />
      <KpiCard
        title="Platform Orders Today"
        value={ordersToday}
        change={8.2}
        icon={<Receipt className="h-5 w-5" />}
        variant="emerald"
        loading={isLoading}
      />
      <KpiCard
        title="Total Platform Revenue"
        value={totalRevenue.toLocaleString()}
        prefix="PKR "
        change={12.4}
        icon={<DollarSign className="h-5 w-5" />}
        variant="purple"
        loading={isLoading}
      />
      <KpiCard
        title="Active Staff & Users"
        value={activeUsers}
        changePeriod="Enterprise RBAC active"
        icon={<Users className="h-5 w-5" />}
        variant="teal"
        loading={isLoading}
      />
      <KpiCard
        title="Connected Devices"
        value={`${onlineDevices} / ${totalTables}`}
        suffix={`(${Math.round((onlineDevices / Math.max(1, totalTables)) * 100)}%)`}
        icon={<Monitor className="h-5 w-5" />}
        variant="blue"
        loading={isLoading}
      />
      <KpiCard
        title="Active System Alerts"
        value={alertsCount}
        changePeriod={alertsCount === 0 ? 'No operational warnings' : 'Requires attention'}
        icon={<ShieldAlert className="h-5 w-5" />}
        variant={alertsCount > 0 ? 'rose' : 'emerald'}
        loading={isLoading}
      />
      <KpiCard
        title="Multi-Branch Infrastructure"
        value={`${activeBranches} Branches`}
        changePeriod="Shared DB & Multi-tenant isolation"
        icon={<Store className="h-5 w-5" />}
        variant="amber"
        loading={isLoading}
      />
    </div>
  );
};
