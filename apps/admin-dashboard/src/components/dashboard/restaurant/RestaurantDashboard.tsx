'use client';

import React from 'react';
import { KpiCard } from '../shared/KpiCard';
import { LiveTableFloor, TableItem } from './LiveTableFloor';
import { LiveOrderFeed, LiveOrderRecord } from './LiveOrderFeed';
import { KitchenPerformanceWidget } from './KitchenPerformanceWidget';
import { PopularProductsWidget, PopularProductItem } from './PopularProductsWidget';
import { DeviceMonitorWidget } from './DeviceMonitorWidget';
import { AiContentMiniWidget } from './AiContentMiniWidget';
import { RestaurantQuickActions } from './RestaurantQuickActions';
import { TableDeviceData } from '@/lib/api';
import {
  DollarSign,
  Receipt,
  Table as TableIcon,
  ChefHat,
  Scale,
  Clock,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

interface RestaurantDashboardProps {
  orders: LiveOrderRecord[];
  tables: TableItem[];
  devices: TableDeviceData[];
  analytics: any;
  aiUsage: any;
  isLoading: boolean;
  onUpdateOrderStatus: (orderId: string, status: string) => Promise<void>;
  onSelectTable: (table: TableItem) => void;
  onViewOrder: (order: LiveOrderRecord) => void;
  onOpenDeviceConsole: (device?: TableDeviceData) => void;
  onOpenKitchen: () => void;
  onOpenAiStudio: () => void;
  onNewProduct: () => void;
  onNewCategory: () => void;
  onNewUser: () => void;
  onOpenReports: () => void;
  onOpenTableManagement: () => void;
}

export const RestaurantDashboard: React.FC<RestaurantDashboardProps> = ({
  orders,
  tables,
  devices,
  analytics,
  aiUsage,
  isLoading,
  onUpdateOrderStatus,
  onSelectTable,
  onViewOrder,
  onOpenDeviceConsole,
  onOpenKitchen,
  onOpenAiStudio,
  onNewProduct,
  onNewCategory,
  onNewUser,
  onOpenReports,
  onOpenTableManagement,
}) => {
  // Compute Real Operational KPIs from current active data (Zero Dummy Data)
  const realOrdersRevenue = orders.reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0);
  const totalRevenue = realOrdersRevenue > 0 ? realOrdersRevenue : (analytics?.sales?.gross_sales || analytics?.today_revenue || 0);
  const ordersTodayCount = orders.length > 0 ? orders.length : (analytics?.orders?.total_orders || 0);
  const occupiedTablesCount = tables.filter((t) =>
    ['OCCUPIED', 'ORDERING', 'WAITING', 'PREPARING', 'READY', 'PAYMENT'].includes(
      t.status?.toUpperCase()
    )
  ).length;
  const totalTablesCount = tables.length > 0 ? tables.length : 16;
  const kitchenOrdersCount = orders.filter((o) =>
    ['PENDING', 'ACCEPTED', 'PREPARING'].includes((o.status || '').toUpperCase())
  ).length;
  const aov = ordersTodayCount > 0 ? Math.round(totalRevenue / ordersTodayCount) : 0;
  const avgPrepTime = ordersTodayCount > 0 ? (analytics?.kitchen_performance?.average_prep_time_minutes || 0) : 0;

  // Kitchen Metrics
  const waitingCount = orders.filter((o) => (o.status || '').toUpperCase() === 'PENDING').length;
  const preparingCount = orders.filter((o) => (o.status || '').toUpperCase() === 'PREPARING').length;
  const readyCount = orders.filter((o) => (o.status || '').toUpperCase() === 'READY').length;
  const delayedCount = orders.filter((o) => (o.status || '').toUpperCase() === 'PREPARING' && (o.elapsed_minutes || 0) > 20).length;
  const stationThroughput = analytics?.kitchen_performance?.station_throughput || {
    GRILL: 0,
    SAUTE: 0,
    BAR: 0,
    OVEN: 0,
  };

  // Popular Products (Zero hardcoded fake dishes)
  const popularProducts: PopularProductItem[] =
    analytics?.popular_products && analytics.popular_products.length > 0
      ? analytics.popular_products
      : [];

  return (
    <div className="p-5 lg:p-6 space-y-6 max-w-[1920px] mx-auto animate-fadeIn">
      {/* RestroPOS Executive Header Bar */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 rounded-2xl p-5 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30 backdrop-blur-xs">
              Live Floor Active
            </span>
            <span className="text-blue-100 text-xs font-semibold">
              ● Synchronized with 32-inch table displays
            </span>
          </div>
          <h2 className="text-xl font-black tracking-tight text-white mt-1">
            Atif and Abdullah Foods — Operations Hub
          </h2>
          <p className="text-xs text-blue-100 mt-0.5">
            Real-time table dining flow, kitchen ticket velocity, and POS service management
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onNewProduct}
            className="px-3.5 py-2 rounded-xl bg-white text-blue-900 font-bold text-xs hover:bg-blue-50 transition-colors shadow-2xs flex items-center gap-1.5"
          >
            <span>+ Add Menu Dish</span>
          </button>
          <button
            onClick={onOpenKitchen}
            className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs transition-colors border border-white/20 flex items-center gap-1.5"
          >
            <span>Kitchen KDS &rarr;</span>
          </button>
        </div>
      </div>

      {/* 1. RESTAURANT KPI CARDS (6 Operational Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        <KpiCard
          title="Today's Sales"
          value={totalRevenue > 0 ? totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
          prefix="PKR "
          change={totalRevenue > 0 ? analytics?.sales?.growth_rate : undefined}
          changePeriod={totalRevenue > 0 ? "vs yesterday" : undefined}
          icon={<DollarSign className="h-5 w-5" />}
          variant="blue"
          loading={isLoading}
        />
        <KpiCard
          title="Orders Today"
          value={ordersTodayCount}
          change={ordersTodayCount > 0 ? analytics?.orders?.growth_rate : undefined}
          changePeriod={ordersTodayCount > 0 ? "vs yesterday" : undefined}
          icon={<Receipt className="h-5 w-5" />}
          variant="teal"
          loading={isLoading}
        />
        <KpiCard
          title="Active Tables"
          value={`${occupiedTablesCount} / ${totalTablesCount}`}
          suffix={`(${Math.round((occupiedTablesCount / Math.max(1, totalTablesCount)) * 100)}%)`}
          icon={<TableIcon className="h-5 w-5" />}
          variant="emerald"
          loading={isLoading}
        />
        <KpiCard
          title="Kitchen Orders"
          value={`${kitchenOrdersCount} Active`}
          icon={<ChefHat className="h-5 w-5" />}
          variant="amber"
          loading={isLoading}
        />
        <KpiCard
          title="Average Order Value"
          value={aov > 0 ? aov.toLocaleString() : "0"}
          prefix="PKR "
          icon={<Scale className="h-5 w-5" />}
          variant="purple"
          loading={isLoading}
        />
        <KpiCard
          title="Avg Prep Time"
          value={ordersTodayCount > 0 && avgPrepTime > 0 ? `${avgPrepTime} min` : '0 min'}
          icon={<Clock className="h-5 w-5" />}
          variant="rose"
          loading={isLoading}
        />
      </div>

      {/* 2. OPERATIONAL QUICK ACTIONS BAR */}
      <RestaurantQuickActions
        onNewProduct={onNewProduct}
        onNewCategory={onNewCategory}
        onNewUser={onNewUser}
        onOpenKitchen={onOpenKitchen}
        onOpenAiStudio={onOpenAiStudio}
        onOpenDeviceConsole={() => onOpenDeviceConsole()}
        onOpenReports={onOpenReports}
        onOpenTableManagement={onOpenTableManagement}
      />

      {/* 3. PRIMARY SPLIT: LIVE TABLE FLOOR (Left 65%) + LIVE ORDER FEED (Right 35%) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Visual Table Section */}
        <div className="xl:col-span-8">
          <LiveTableFloor
            tables={tables}
            onSelectTable={onSelectTable}
          />
        </div>

        {/* Live Order Kanban / Feed */}
        <div className="xl:col-span-4">
          <LiveOrderFeed
            orders={orders}
            onUpdateStatus={onUpdateOrderStatus}
            onViewOrder={onViewOrder}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* 4. SECONDARY OPERATIONAL MODULES (KDS, Popular Dishes, Devices, AI) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Kitchen Performance Card */}
        <KitchenPerformanceWidget
          waitingCount={waitingCount}
          preparingCount={preparingCount}
          readyCount={readyCount}
          delayedCount={delayedCount}
          completedTodayCount={ordersTodayCount - kitchenOrdersCount}
          avgPrepMinutes={avgPrepTime}
          stationThroughput={stationThroughput}
          onOpenKds={onOpenKitchen}
        />

        {/* Popular Products Widget */}
        <PopularProductsWidget products={popularProducts} currencyPrefix="PKR " />

        {/* Smart Table Device Monitoring Widget */}
        <DeviceMonitorWidget
          devices={devices}
          onOpenDeviceConsole={onOpenDeviceConsole}
        />

        {/* AI Content Engine Widget */}
        <AiContentMiniWidget
          totalGenerations={aiUsage?.total_generations || 0}
          pendingCount={aiUsage?.pending_count || 0}
          failedCount={aiUsage?.failed_count || 0}
          onOpenAiStudio={onOpenAiStudio}
        />
      </div>
    </div>
  );
};
