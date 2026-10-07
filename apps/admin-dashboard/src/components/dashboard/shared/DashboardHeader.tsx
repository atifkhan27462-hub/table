'use client';

import React, { useState } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import { DashboardSwitcher } from './DashboardSwitcher';
import {
  Search,
  Bell,
  RefreshCw,
  Store,
  ChevronDown,
  Wifi,
  User,
  Shield,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react';

interface DashboardHeaderProps {
  restaurantName?: string;
  branchName?: string;
  isWsLive: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSync: () => void;
  isLoading: boolean;
  onOpenAlerts?: () => void;
  unreadAlertCount?: number;
  onToast: (msg: string) => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  restaurantName = 'Atif and Abdullah Foods',
  branchName = 'Main Dining Branch',
  isWsLive,
  searchQuery,
  onSearchChange,
  onSync,
  isLoading,
  onOpenAlerts,
  unreadAlertCount = 0,
  onToast,
}) => {
  const { currentUser, dashboardMode } = useDashboard();
  const [isBranchMenuOpen, setIsBranchMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <header className="h-16 px-5 lg:px-6 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-xs z-30">
      {/* Left: Restaurant & Branch Selector + Connection Status */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setIsBranchMenuOpen(!isBranchMenuOpen)}
            className="flex items-center gap-2 text-left hover:bg-slate-50 p-1.5 rounded-lg transition-colors"
          >
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
              <Store className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 tracking-tight leading-none">
                  {restaurantName}
                </span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </div>
              <span className="text-[11px] font-medium text-slate-500 leading-none">
                Branch: {branchName}
              </span>
            </div>
          </button>

          {isBranchMenuOpen && (
            <div className="absolute left-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-lg p-1.5 z-50">
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Select Branch
              </div>
              <button
                onClick={() => setIsBranchMenuOpen(false)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-blue-600 bg-blue-50/60 rounded-lg"
              >
                <span>Main Dining Branch</span>
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              </button>
              <button
                onClick={() => setIsBranchMenuOpen(false)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
              >
                <span>Patio & Rooftop Lounge</span>
              </button>
              <button
                onClick={() => setIsBranchMenuOpen(false)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
              >
                <span>Express Takeout Counter</span>
              </button>
            </div>
          )}
        </div>

        {/* Real-time Connection Indicator */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className={`h-2 w-2 rounded-full bg-emerald-500 ${isWsLive ? 'animate-pulse' : ''}`} />
          <span>{isWsLive ? 'System Online • Live' : 'Connecting...'}</span>
        </div>
      </div>

      {/* Middle: Global Search */}
      <div className="hidden lg:block w-72">
        <div className="relative">
          <input
            type="text"
            placeholder="Search orders, tables, items..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-slate-50/60 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white transition-colors"
          />
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Right: Actions, Notifications, Switcher, Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Sync Button */}
        <button
          onClick={onSync}
          disabled={isLoading}
          className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          title="Sync Realtime Data"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
        </button>

        {/* Notifications & Operational Alerts */}
        <button
          onClick={onOpenAlerts}
          className="relative p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          title="Operational Alerts"
        >
          <Bell className="h-4 w-4" />
          {unreadAlertCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-white">
              {unreadAlertCount}
            </span>
          )}
        </button>

        {/* Dashboard Mode Switcher */}
        <DashboardSwitcher onSwitchToast={onToast} />

        <div className="h-5 w-px bg-slate-200 hidden sm:block" />

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 p-1 pl-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <div className="h-7 w-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
              {currentUser?.full_name ? currentUser.full_name.charAt(0).toUpperCase() : 'M'}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-900 leading-tight">
                {currentUser?.full_name || 'Muhammad Atif'}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                {currentUser?.role_code || 'SUPER_ADMIN'}
              </span>
            </div>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-lg p-1.5 z-50 animate-fadeIn">
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <p className="text-xs font-bold text-slate-900">
                  {currentUser?.full_name || 'Muhammad Atif'}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {currentUser?.email || 'admin@smarttable.io'}
                </p>
                <span className="inline-block mt-1 px-1.5 py-0.5 text-[9px] font-bold rounded bg-blue-50 text-blue-700 border border-blue-200">
                  {currentUser?.role_code || 'SUPER_ADMIN'}
                </span>
              </div>

              <div className="px-1 py-1 space-y-0.5 text-xs text-slate-700">
                <div className="px-2 py-1.5 text-slate-500 font-medium flex items-center justify-between">
                  <span>Current View</span>
                  <span className="font-bold text-slate-800 uppercase text-[10px]">
                    {dashboardMode}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-100 mt-1 pt-1">
                <button
                  onClick={() => {
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('token');
                    window.location.reload();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
