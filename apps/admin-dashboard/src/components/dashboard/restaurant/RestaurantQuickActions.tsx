'use client';

import React from 'react';
import {
  Plus,
  UtensilsCrossed,
  Layers,
  ChefHat,
  Sparkles,
  UserPlus,
  FileSpreadsheet,
  Monitor,
  Table as TableIcon,
} from 'lucide-react';

interface QuickActionsProps {
  onNewProduct: () => void;
  onNewCategory: () => void;
  onNewUser: () => void;
  onOpenKitchen: () => void;
  onOpenAiStudio: () => void;
  onOpenDeviceConsole: () => void;
  onOpenReports: () => void;
  onOpenTableManagement: () => void;
}

export const RestaurantQuickActions: React.FC<QuickActionsProps> = ({
  onNewProduct,
  onNewCategory,
  onNewUser,
  onOpenKitchen,
  onOpenAiStudio,
  onOpenDeviceConsole,
  onOpenReports,
  onOpenTableManagement,
}) => {
  const actions = [
    {
      label: 'Add Product',
      icon: <UtensilsCrossed className="h-3.5 w-3.5 text-blue-600" />,
      onClick: onNewProduct,
    },
    {
      label: 'Add Category',
      icon: <Layers className="h-3.5 w-3.5 text-teal-600" />,
      onClick: onNewCategory,
    },
    {
      label: 'Open Table',
      icon: <TableIcon className="h-3.5 w-3.5 text-emerald-600" />,
      onClick: onOpenTableManagement,
    },
    {
      label: 'Kitchen (KDS)',
      icon: <ChefHat className="h-3.5 w-3.5 text-orange-600" />,
      onClick: onOpenKitchen,
    },
    {
      label: 'AI Visuals',
      icon: <Sparkles className="h-3.5 w-3.5 text-purple-600" />,
      onClick: onOpenAiStudio,
    },
    {
      label: 'Add Staff',
      icon: <UserPlus className="h-3.5 w-3.5 text-indigo-600" />,
      onClick: onNewUser,
    },
    {
      label: 'Daily Reports',
      icon: <FileSpreadsheet className="h-3.5 w-3.5 text-slate-600" />,
      onClick: onOpenReports,
    },
    {
      label: 'Hardware Telemetry',
      icon: <Monitor className="h-3.5 w-3.5 text-cyan-600" />,
      onClick: onOpenDeviceConsole,
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Operational Quick Actions
        </h4>
        <span className="text-[11px] text-slate-400 font-medium">Fast Execution</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {actions.map((act, idx) => (
          <button
            key={idx}
            onClick={act.onClick}
            className="flex flex-col items-center justify-center p-2.5 rounded-lg border border-slate-100 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-200 transition-all text-center gap-1.5"
          >
            <div className="p-1.5 rounded-md bg-white shadow-xs border border-slate-100">
              {act.icon}
            </div>
            <span className="text-[11px] font-bold text-slate-800 leading-tight">
              {act.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
