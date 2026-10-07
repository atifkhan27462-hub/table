'use client';

import React from 'react';
import {
  X,
  AlertTriangle,
  Clock,
  WifiOff,
  Flame,
  CheckCircle,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

export interface OperationalAlert {
  id: string;
  type: 'offline_table' | 'delayed_order' | 'kitchen_delay' | 'system_warning';
  title: string;
  description: string;
  timestamp: string;
  severity: 'high' | 'medium' | 'low';
  targetTab?: string;
}

interface AlertCenterProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: OperationalAlert[];
  onNavigateTab: (tabId: string) => void;
}

export const AlertCenter: React.FC<AlertCenterProps> = ({
  isOpen,
  onClose,
  alerts,
  onNavigateTab,
}) => {
  if (!isOpen) return null;

  const getAlertIcon = (type: OperationalAlert['type']) => {
    switch (type) {
      case 'offline_table':
        return <WifiOff className="h-4 w-4 text-rose-600" />;
      case 'delayed_order':
        return <Clock className="h-4 w-4 text-amber-600" />;
      case 'kitchen_delay':
        return <Flame className="h-4 w-4 text-orange-600" />;
      default:
        return <ShieldAlert className="h-4 w-4 text-blue-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/30 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-slideIn">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Operational Alert Center</h3>
              <p className="text-xs text-slate-500">Live issues requiring management action</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Alerts Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {alerts.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <CheckCircle className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">All Operations Optimal</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                No offline table displays, delayed kitchen orders, or system bottlenecks detected.
              </p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                onClick={() => {
                  if (alert.targetTab) {
                    onNavigateTab(alert.targetTab);
                    onClose();
                  }
                }}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  alert.severity === 'high'
                    ? 'border-rose-200 bg-rose-50/30 hover:bg-rose-50/60'
                    : alert.severity === 'medium'
                    ? 'border-amber-200 bg-amber-50/30 hover:bg-amber-50/60'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-white border border-slate-100 shadow-xs shrink-0">
                    {getAlertIcon(alert.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-slate-900 truncate">{alert.title}</h5>
                      <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-2">
                        {alert.timestamp}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                      {alert.description}
                    </p>
                    {alert.targetTab && (
                      <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-blue-600">
                        <span>Resolve in {alert.targetTab.toUpperCase()}</span>
                        <ChevronRight className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>{alerts.length} active notifications</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-100"
          >
            Dismiss All
          </button>
        </div>
      </div>
    </div>
  );
};
