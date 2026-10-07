'use client';

import React, { useState } from 'react';
import {
  LayoutDashboard,
  Building2,
  Store,
  GitBranch,
  Users,
  ShieldCheck,
  Shield,
  Table as TableIcon,
  Monitor,
  Receipt,
  UtensilsCrossed,
  Layers,
  ChefHat,
  UserCheck,
  CreditCard,
  Sparkles,
  Gamepad2,
  BarChart3,
  FileSpreadsheet,
  Activity,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';

export interface AdminNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

export interface AdminNavGroup {
  title: string;
  items: AdminNavItem[];
}

interface AdminSidebarProps {
  currentTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentTab,
  onTabChange,
  className = '',
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const groups: AdminNavGroup[] = [
    {
      title: 'Enterprise & SaaS',
      items: [
        { id: 'dashboard', label: 'System Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
        { id: 'restaurants', label: 'Restaurants & Tenants', icon: <Building2 className="h-4 w-4" /> },
      ],
    },
    {
      title: 'Infrastructure & Hardware',
      items: [
        { id: 'tables', label: 'Tables & Devices', icon: <TableIcon className="h-4 w-4" /> },
        { id: 'system-health', label: 'System Health', icon: <Activity className="h-4 w-4" />, badge: 'Live' },
      ],
    },
    {
      title: 'Operations',
      items: [
        { id: 'orders', label: 'Orders Management', icon: <Receipt className="h-4 w-4" /> },
        { id: 'products', label: 'Product Catalog', icon: <UtensilsCrossed className="h-4 w-4" /> },
        { id: 'menu', label: 'Menu Taxonomy', icon: <Layers className="h-4 w-4" /> },
        { id: 'kitchen', label: 'Kitchen (KDS)', icon: <ChefHat className="h-4 w-4" /> },
      ],
    },
    {
      title: 'Intelligence & Guests',
      items: [
        { id: 'customers', label: 'Customers', icon: <UserCheck className="h-4 w-4" /> },
        { id: 'ai-content', label: 'AI Services', icon: <Sparkles className="h-4 w-4" /> },
        { id: 'games', label: 'Table Games', icon: <Gamepad2 className="h-4 w-4" /> },
        { id: 'analytics', label: 'Analytics & Sales', icon: <BarChart3 className="h-4 w-4" /> },
      ],
    },
    {
      title: 'Security & Governance',
      items: [
        { id: 'users', label: 'Users & RBAC', icon: <Users className="h-4 w-4" /> },
        { id: 'audit-logs', label: 'Audit Trail', icon: <FileText className="h-4 w-4" /> },
        { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
      ],
    },
  ];

  return (
    <aside
      className={`h-screen bg-white border-r border-slate-200 flex flex-col select-none transition-all duration-300 z-20 ${
        collapsed ? 'w-18' : 'w-64'
      } ${className}`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
        {!collapsed && (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-teal-700 to-emerald-700 text-white flex items-center justify-center font-black text-xs shadow-xs shrink-0">
              AAF
            </div>
            <div className="flex flex-col truncate">
              <span className="text-xs font-black text-slate-900 tracking-tight leading-snug truncate">
                Atif &amp; Abdullah Foods
              </span>
              <span className="text-[10px] text-teal-700 font-bold uppercase tracking-wider">
                Enterprise Cloud Admin
              </span>
            </div>
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors mx-auto"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-thin">
        {groups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            {!collapsed && (
              <h6 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                {group.title}
              </h6>
            )}
            {group.items.map((item) => {
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center ${
                    collapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'
                  } text-xs font-semibold rounded-lg transition-all ${
                    isActive
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={isActive ? 'text-white' : 'text-slate-500'}>{item.icon}</span>
                    {!collapsed && <span>{item.label}</span>}
                  </div>

                  {!collapsed && item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
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

      {/* Footer Profile & Sign Out */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="h-7 w-7 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs shrink-0">
              SA
            </div>
            <div className="flex flex-col truncate">
              <span className="text-xs font-bold text-slate-900 truncate">Platform Super Admin</span>
              <span className="text-[10px] text-teal-700 font-semibold">Tier 1 Access</span>
            </div>
          </div>
        )}
        <button
          onClick={() => {
            localStorage.removeItem('access_token');
            localStorage.removeItem('token');
            window.location.reload();
          }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors mx-auto"
          title="Sign Out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
};
