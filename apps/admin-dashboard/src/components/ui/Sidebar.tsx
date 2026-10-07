'use client';

import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  UtensilsCrossed,
  ChefHat,
  Table as TableIcon,
  Layers,
  LogOut,
  ExternalLink,
} from 'lucide-react';

export interface NavItemConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
}

export interface SidebarProps {
  currentTab: string;
  onTabChange: (id: string) => void;
  className?: string;
  ordersCount?: number;
  tablesCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  className = '',
  ordersCount = 0,
  tablesCount = 16,
}) => {
  const essentialNavItems: NavItemConfig[] = [
    {
      id: 'dashboard',
      label: 'Command Center',
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      id: 'orders',
      label: 'Live Orders',
      icon: <Receipt className="h-4 w-4" />,
      badge: ordersCount > 0 ? `${ordersCount} Live` : undefined,
    },
    {
      id: 'tables',
      label: 'Dining Tables',
      icon: <TableIcon className="h-4 w-4" />,
      badge: `${tablesCount} Tables`,
    },
    {
      id: 'categories',
      label: 'Food Categories',
      icon: <Layers className="h-4 w-4" />,
    },
    {
      id: 'products',
      label: 'Menu & Dishes',
      icon: <UtensilsCrossed className="h-4 w-4" />,
    },
    {
      id: 'kitchen',
      label: 'Kitchen (KDS)',
      icon: <ChefHat className="h-4 w-4" />,
    },
  ];

  return (
    <aside
      className={`w-64 bg-white/95 backdrop-blur-md border-r border-stone-200/80 flex flex-col h-screen text-stone-700 select-none shadow-xs transition-all shrink-0 ${className}`}
    >
      {/* Brand Header — Atif and Abdullah Foods */}
      <div className="h-20 px-5 flex items-center gap-3 border-b border-stone-100 bg-stone-50/40">
        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20 font-black text-sm tracking-wider shrink-0 border border-orange-300">
          AAF
        </div>
        <div className="flex flex-col truncate">
          <span className="text-xs font-black text-stone-900 tracking-tight leading-snug truncate">
            ATIF &amp; ABDULLAH FOODS
          </span>
          <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wide flex items-center gap-1.5 mt-0.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            POS &amp; Dining Suite
          </span>
        </div>
      </div>

      {/* Simplified Essential Navigation */}
      <div className="flex-1 overflow-y-auto px-3.5 py-5 space-y-2">
        <h6 className="px-3 text-[10px] font-black text-stone-400 uppercase tracking-wider mb-2">
          Daily Operations
        </h6>

        {essentialNavItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-3 text-xs font-bold rounded-2xl transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/25 ring-2 ring-amber-300/50'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={isActive ? 'text-white' : 'text-stone-500'}>
                  {item.icon}
                </span>
                <span className="font-extrabold">{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                    isActive
                      ? 'bg-white/25 text-white'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Quick Launch Shortcuts Box */}
        <div className="pt-6">
          <h6 className="px-3 text-[10px] font-black text-stone-400 uppercase tracking-wider mb-2.5">
            Live Quick Links
          </h6>
          <div className="space-y-1.5 p-3 bg-stone-50 rounded-2xl border border-stone-200/80 text-xs text-stone-700">
            <a
              href="http://localhost:3001/?table=1"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-2 rounded-xl hover:bg-white hover:text-amber-700 hover:shadow-xs transition-all font-bold text-[11px]"
            >
              <span>Customer Table 01 (3001)</span>
              <ExternalLink className="h-3.5 w-3.5 text-stone-400" />
            </a>
            <a
              href="http://localhost:3002"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-2 rounded-xl hover:bg-white hover:text-amber-700 hover:shadow-xs transition-all font-bold text-[11px]"
            >
              <span>Kitchen Screen (3002)</span>
              <ExternalLink className="h-3.5 w-3.5 text-stone-400" />
            </a>
          </div>
        </div>
      </div>

      {/* Staff Profile / Bottom Bar */}
      <div className="p-3.5 border-t border-stone-100 bg-stone-50/50 flex items-center justify-between">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="h-9 w-9 rounded-2xl bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center text-xs font-black shrink-0">
            MA
          </div>
          <div className="flex flex-col truncate">
            <span className="text-xs font-black text-stone-900 truncate">
              Muhammad Atif
            </span>
            <span className="text-[10px] text-emerald-700 flex items-center gap-1 font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              General Manager
            </span>
          </div>
        </div>
        <button
          onClick={() => {
            localStorage.removeItem('access_token');
            localStorage.removeItem('token');
            window.location.reload();
          }}
          title="Sign Out"
          className="p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
};
