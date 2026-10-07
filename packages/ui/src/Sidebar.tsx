'use client';

import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  UtensilsCrossed,
  Layers,
  ChefHat,
  Users,
  Sparkles,
  Gamepad2,
  BarChart3,
  ShieldCheck,
  Settings,
  FileText,
  Table as TableIcon,
  LogOut,
  ChevronRight,
} from 'lucide-react';

export interface NavItemConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
  badgeVariant?: 'primary' | 'warning' | 'danger';
}

export interface NavSection {
  title: string;
  items: NavItemConfig[];
}

export interface SidebarProps {
  currentTab: string;
  onTabChange: (id: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

export const adminNavSections: NavSection[] = [
  {
    title: 'Operations',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
      { id: 'orders', label: 'Orders', icon: <Receipt className="h-4 w-4" />, badge: '5 Live' },
      { id: 'tables', label: 'Tables & Devices', icon: <TableIcon className="h-4 w-4" />, badge: '14/16' },
      { id: 'kitchen', label: 'Kitchen (KDS)', icon: <ChefHat className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Food & Menu',
    items: [
      { id: 'menu', label: 'Menu Categories', icon: <Layers className="h-4 w-4" /> },
      { id: 'products', label: 'Product Catalog', icon: <UtensilsCrossed className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Intelligence & Guests',
    items: [
      { id: 'customers', label: 'Customer CRM', icon: <Users className="h-4 w-4" /> },
      { id: 'ai-content', label: 'AI Visuals & Chef', icon: <Sparkles className="h-4 w-4" />, badge: 'New' },
      { id: 'games', label: 'Table Games', icon: <Gamepad2 className="h-4 w-4" /> },
      { id: 'analytics', label: 'Analytics & Sales', icon: <BarChart3 className="h-4 w-4" /> },
      { id: 'reports', label: 'Reports & Export', icon: <FileText className="h-4 w-4" /> },
    ],
  },
  {
    title: 'System & Admin',
    items: [
      { id: 'users', label: 'Staff & Roles', icon: <ShieldCheck className="h-4 w-4" /> },
      { id: 'audit-logs', label: 'Audit Logs', icon: <FileText className="h-4 w-4" /> },
      { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  className = '',
}) => {
  return (
    <aside
      className={`w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen text-slate-300 select-none ${className}`}
    >
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-800 bg-slate-950/40">
        <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm font-black text-sm tracking-wider">
          ST
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-white tracking-tight leading-none flex items-center gap-1.5">
            SMART TABLE
            <span className="text-[10px] px-1.5 py-0.2 font-semibold bg-blue-500/20 text-blue-400 rounded-sm border border-blue-500/30">
              PRO
            </span>
          </span>
          <span className="text-[11px] text-slate-400 font-medium mt-1">Management Suite</span>
        </div>
      </div>

      {/* Nav Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin">
        {adminNavSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            <h6 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              {section.title}
            </h6>
            {section.items.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Staff Profile / Bottom Bar */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
            AN
          </div>
          <div className="flex flex-col truncate">
            <span className="text-xs font-semibold text-white truncate">Abdullah & Atif</span>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Online • Table 01-16
            </span>
          </div>
        </div>
        <button
          title="Sign Out"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
};
