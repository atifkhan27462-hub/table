'use client';

import React from 'react';
import { TableDeviceData } from '@/lib/api';
import { Monitor, Wifi, Thermometer, Cpu, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

interface DeviceMonitorProps {
  devices: TableDeviceData[];
  onOpenDeviceConsole: (device?: TableDeviceData) => void;
  className?: string;
}

export const DeviceMonitorWidget: React.FC<DeviceMonitorProps> = ({
  devices,
  onOpenDeviceConsole,
  className = '',
}) => {
  const onlineCount = devices.filter((d) => d.status === 'ONLINE').length;
  const warningCount = devices.filter((d) => d.status === 'WARNING').length;
  const offlineCount = devices.filter((d) => d.status === 'OFFLINE').length;

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-xs p-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-teal-50 text-teal-700 border border-teal-100">
            <Monitor className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Table Hardware Status
            </h3>
            <p className="text-[11px] text-slate-500">32-inch interactive surface telemetry</p>
          </div>
        </div>

        <button
          onClick={() => onOpenDeviceConsole()}
          className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          <span>Hardware Console</span>
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-3 gap-2.5 my-3.5 text-center">
        <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100">
          <span className="text-[10px] font-bold text-emerald-700 uppercase block">Online</span>
          <span className="text-lg font-black text-emerald-900">{onlineCount}</span>
        </div>
        <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-100">
          <span className="text-[10px] font-bold text-amber-700 uppercase block">Degraded</span>
          <span className="text-lg font-black text-amber-900">{warningCount}</span>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">Offline</span>
          <span className="text-lg font-black text-slate-700">{offlineCount}</span>
        </div>
      </div>

      {/* Live Device List */}
      <div className="space-y-2 mt-1">
        {devices.slice(0, 4).map((device) => {
          const isOnline = device.status === 'ONLINE';
          const isWarning = device.status === 'WARNING';

          return (
            <div
              key={device.id}
              onClick={() => onOpenDeviceConsole(device)}
              className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isOnline ? 'bg-emerald-500 animate-pulse' : isWarning ? 'bg-amber-500' : 'bg-slate-400'
                  }`}
                />
                <div>
                  <h5 className="text-xs font-bold text-slate-900 leading-snug">
                    {device.table_number}
                  </h5>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    v{device.app_version} • {device.last_heartbeat_human || 'Active'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-600">
                {device.telemetry?.cpu_temp_c !== undefined && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                    <Thermometer className="h-3 w-3 text-slate-400" />
                    {device.telemetry.cpu_temp_c.toFixed(0)}°C
                  </span>
                )}
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    isOnline
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : isWarning
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {device.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
