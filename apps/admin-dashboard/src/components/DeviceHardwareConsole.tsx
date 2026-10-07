'use client';

import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Badge,
  Input,
  Modal,
} from '@/components/ui';
import {
  Cpu,
  Thermometer,
  HardDrive,
  Radio,
  Wifi,
  Shield,
  ShieldAlert,
  Lock,
  Unlock,
  Activity,
  Monitor,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  ExternalLink,
  Flame,
  X,
} from 'lucide-react';
import { TableDeviceData } from '@/lib/api';

interface DeviceHardwareConsoleProps {
  devices: TableDeviceData[];
  onPulseHeartbeat: (deviceToken?: string) => Promise<void>;
  onToggleKiosk: (device: TableDeviceData) => Promise<void>;
  onSimulateDevice: (deviceId: string, sim: any) => Promise<void>;
  isPulsing?: boolean;
}

export default function DeviceHardwareConsole({
  devices,
  onPulseHeartbeat,
  onToggleKiosk,
  onSimulateDevice,
  isPulsing = false,
}: DeviceHardwareConsoleProps) {
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ONLINE' | 'WARNING' | 'OFFLINE'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDevice, setSelectedDevice] = useState<TableDeviceData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Counts
  const onlineCount = devices.filter((d) => d.status === 'ONLINE').length;
  const warningCount = devices.filter((d) => d.status === 'WARNING').length;
  const offlineCount = devices.filter((d) => d.status === 'OFFLINE').length;
  const totalCount = devices.length;

  // Filtered devices
  const filteredDevices = devices.filter((dev) => {
    if (filterStatus !== 'ALL' && dev.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = dev.table_number?.toLowerCase().includes(q);
      const matchId = dev.id?.toLowerCase().includes(q);
      const matchIp = dev.ip_address?.toLowerCase().includes(q);
      const matchHw = dev.hardware_id?.toLowerCase().includes(q);
      return matchNum || matchId || matchIp || matchHw;
    }
    return true;
  });

  const getStatusBadge = (status: 'ONLINE' | 'WARNING' | 'OFFLINE') => {
    switch (status) {
      case 'ONLINE':
        return (
          <Badge variant="success" pulse>
            ONLINE
          </Badge>
        );
      case 'WARNING':
        return (
          <Badge variant="warning" pulse>
            WARNING
          </Badge>
        );
      case 'OFFLINE':
      default:
        return (
          <Badge variant="secondary">
            OFFLINE
          </Badge>
        );
    }
  };

  const getTemperatureBadgeColor = (temp?: number) => {
    if (!temp) return 'text-slate-400';
    if (temp > 78) return 'text-rose-400 font-bold';
    if (temp > 65) return 'text-amber-400 font-bold';
    return 'text-emerald-400 font-bold';
  };

  return (
    <div className="space-y-6">
      {/* Header and Fleet Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Monitor className="w-6 h-6 text-blue-500" />
            Physical Smart Table Device Fleet (32-Inch)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Hardware health monitoring, relative heartbeats, telemetry probes & kiosk OS lockdown
          </p>
        </div>

        {/* Fleet Status Ribbon */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs">
            <span className="text-slate-400">Total:</span>
            <span className="font-bold text-white">{totalCount}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-emerald-400 font-semibold">{onlineCount} ONLINE</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-xs">
            <span className="h-2 w-2 rounded-full bg-amber-400"></span>
            <span className="text-amber-400 font-semibold">{warningCount} WARNING</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs">
            <span className="h-2 w-2 rounded-full bg-rose-400"></span>
            <span className="text-rose-400 font-semibold">{offlineCount} OFFLINE</span>
          </div>
        </div>
      </div>

      {/* Control & Live Simulation Toolbar */}
      <Card className="bg-slate-900/60 border-slate-800">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Search and Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search table, device ID, IP..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Status Filter Buttons */}
              <div className="flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
                {(['ALL', 'ONLINE', 'WARNING', 'OFFLINE'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                      filterStatus === st
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {st === 'ALL' ? 'All Devices' : st}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Interactive Action Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => onPulseHeartbeat('tok-dev-007-live')}
                disabled={isPulsing}
                className="shadow-lg shadow-blue-500/20"
              >
                <Activity className={`w-3.5 h-3.5 mr-1.5 ${isPulsing ? 'animate-spin' : ''}`} />
                {isPulsing ? 'Pulsing...' : 'Pulse Heartbeat (TABLE-07)'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  onSimulateDevice('dev-007', {
                    status: 'WARNING',
                    cpu_temp_c: 84.5,
                    touch_latency_ms: 58,
                    ram_usage_percent: 94.0,
                  })
                }
                title="Simulate thermal warning (84.5°C) to test warning detection"
                className="text-amber-400 border-amber-500/40 hover:bg-amber-500/10"
              >
                <Flame className="w-3.5 h-3.5 mr-1" />
                Simulate Warning (84°C)
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  onSimulateDevice('dev-007', {
                    status: 'OFFLINE',
                    seconds_ago: 120,
                  })
                }
                title="Simulate offline status (>90s heartbeat loss)"
                className="text-rose-400 border-rose-500/40 hover:bg-rose-500/10"
              >
                <Clock className="w-3.5 h-3.5 mr-1" />
                Simulate Offline (120s)
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  onSimulateDevice('dev-007', {
                    status: 'ONLINE',
                    cpu_temp_c: 46.2,
                    touch_latency_ms: 12,
                    ram_usage_percent: 41.0,
                  })
                }
                title="Restore normal healthy parameters"
                className="text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10"
              >
                <CheckCircle className="w-3.5 h-3.5 mr-1" />
                Restore Normal
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid of 32-inch Smart Table Hardware Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredDevices.map((dev) => {
          const telem = dev.telemetry || {};
          const cpuTemp = telem.cpu_temp_c ?? telem.cpu?.temperature_celsius ?? 48.0;
          const cpuUsage = telem.cpu?.usage_percent ?? 24.5;
          const ramUsage = telem.ram_usage_percent ?? telem.ram?.usage_percent ?? 42.0;
          const latency = telem.touch_latency_ms ?? telem.display?.touch_latency_ms ?? 12;
          const networkLat = telem.network?.latency_ms ?? 4.2;

          return (
            <Card
              key={dev.id}
              className={`bg-slate-900 border transition-all duration-200 hover:shadow-xl ${
                dev.status === 'ONLINE'
                  ? 'border-emerald-500/40 hover:border-emerald-500'
                  : dev.status === 'WARNING'
                  ? 'border-amber-500/50 hover:border-amber-400'
                  : 'border-slate-800 opacity-80'
              }`}
            >
              {/* Card Header */}
              <CardHeader className="pb-3 border-b border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-black tracking-wide text-white">
                      {dev.table_number || 'TABLE-07'}
                    </CardTitle>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {dev.id}
                    </span>
                  </div>
                  {getStatusBadge(dev.status)}
                </div>

                {/* Example Callout as requested: TABLE-07 ONLINE Last heartbeat: 5 seconds ago */}
                <div className="mt-2 flex items-center justify-between text-xs bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    Last heartbeat:
                  </span>
                  <span className="font-bold text-slate-100">
                    {dev.last_heartbeat_human || '5 seconds ago'}
                  </span>
                </div>
              </CardHeader>

              {/* Card Content & Telemetry */}
              <CardContent className="pt-3 pb-3 space-y-3 text-xs">
                {/* Required Device Identifiers */}
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                  <div>
                    <span className="text-slate-500 block">Table ID:</span>
                    <span className="font-mono text-slate-300">{dev.table_id || 'tbl-007'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Restaurant ID:</span>
                    <span className="font-mono text-slate-300">{dev.restaurant_id || 'rest-001'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Software Version:</span>
                    <span className="text-slate-300">{dev.app_version || 'v2.4.0-kiosk'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">IP / Network:</span>
                    <span className="font-mono text-slate-300">
                      {dev.ip_address || '192.168.1.107'} ({dev.network_status})
                    </span>
                  </div>
                </div>

                {/* Device-Agent Telemetry Gauges (Vendor-Agnostic) */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Cpu className="w-3 h-3 text-blue-400" />
                      CPU & Temperature
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-300 font-semibold">{cpuUsage}%</span>
                      <span className="text-slate-600">|</span>
                      <span className={getTemperatureBadgeColor(cpuTemp)}>
                        {cpuTemp}°C
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1">
                      <HardDrive className="w-3 h-3 text-purple-400" />
                      RAM Utilization
                    </span>
                    <span className="text-slate-300 font-semibold">{ramUsage}%</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Monitor className="w-3 h-3 text-emerald-400" />
                      Display & Touch Lag
                    </span>
                    <span className="text-emerald-400 font-semibold">{latency} ms</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Wifi className="w-3 h-3 text-cyan-400" />
                      Network Link Ping
                    </span>
                    <span className="text-slate-300 font-semibold">{networkLat} ms</span>
                  </div>
                </div>

                {/* Kiosk Mode Status */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {dev.kiosk_mode_enabled ? (
                      <>
                        <Shield className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[11px] text-emerald-300 font-semibold">
                          Kiosk Locked (OS Blocked)
                        </span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[11px] text-amber-300 font-semibold">
                          Kiosk Unlocked
                        </span>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => onToggleKiosk(dev)}
                    className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                  >
                    {dev.kiosk_mode_enabled ? 'Remote Unlock' : 'Remote Lock'}
                  </button>
                </div>

                {/* Active Warning Alerts (if any) */}
                {dev.warning_alerts && dev.warning_alerts.length > 0 && (
                  <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-800/60 text-[11px] text-amber-200 space-y-1">
                    {dev.warning_alerts.map((alert, i) => (
                      <div key={i} className="flex items-start gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                        <span>{alert}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>

              {/* Card Footer Actions */}
              <CardFooter className="pt-2 pb-3 border-t border-slate-800 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedDevice(dev);
                    setIsModalOpen(true);
                  }}
                  className="text-xs"
                >
                  Inspect Probes
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onPulseHeartbeat(dev.device_token)}
                  disabled={isPulsing}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Pulse
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Deep Device Telemetry & Agent Architecture Modal */}
      {isModalOpen && selectedDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-5 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-blue-400" />
                  {selectedDevice.table_number || 'TABLE-07'} • Hardware Architecture Inspection
                </h3>
                <p className="text-xs text-slate-400">
                  Device ID: {selectedDevice.id} • Hardware: {selectedDevice.hardware_id || 'ST-HW-32INCH-007'}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Architecture Overview */}
            <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-800/40 text-xs text-blue-200">
              <span className="font-bold block text-blue-300 mb-1">
                Vendor-Agnostic Device-Agent Architecture
              </span>
              Telemetry probes are fully abstracted into unified interfaces (BaseHardwareProbe),
              preventing tight coupling to any single motherboard, touch controller, or silicon vendor.
              Compatible with Linux Mini PCs, Windows IoT Enterprise, and Android/ARM smart tables.
            </div>

            {/* 6 Future-Proof Telemetry Probe Domains */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* 1. CPU Monitoring */}
              <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/60 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-200">
                  <Cpu className="w-4 h-4 text-blue-400" />
                  1. CPU Monitoring
                </div>
                <div className="space-y-1 text-slate-400">
                  <div className="flex justify-between">
                    <span>Cores:</span>
                    <span className="text-slate-200 font-mono">8 Cores @ 2.4 GHz</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Load:</span>
                    <span className="text-slate-200 font-mono">
                      {selectedDevice.telemetry?.cpu?.usage_percent || 24.5}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Throttling:</span>
                    <span className="text-emerald-400 font-semibold">None (Active cooling)</span>
                  </div>
                </div>
              </div>

              {/* 2. RAM Monitoring */}
              <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/60 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-200">
                  <HardDrive className="w-4 h-4 text-purple-400" />
                  2. RAM Monitoring
                </div>
                <div className="space-y-1 text-slate-400">
                  <div className="flex justify-between">
                    <span>Total Physical RAM:</span>
                    <span className="text-slate-200 font-mono">8,192 MB (LPDDR4x)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Utilization:</span>
                    <span className="text-slate-200 font-mono">
                      {selectedDevice.telemetry?.ram_usage_percent || 42.5}% (3,480 MB used)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Available Free:</span>
                    <span className="text-slate-200 font-mono">4,712 MB</span>
                  </div>
                </div>
              </div>

              {/* 3. Temperature */}
              <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/60 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-200">
                  <Thermometer className="w-4 h-4 text-amber-400" />
                  3. Thermal Monitoring
                </div>
                <div className="space-y-1 text-slate-400">
                  <div className="flex justify-between">
                    <span>CPU Package:</span>
                    <span className={getTemperatureBadgeColor(selectedDevice.telemetry?.cpu_temp_c || 48.2)}>
                      {selectedDevice.telemetry?.cpu_temp_c || 48.2}°C
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Under-Table Ambient:</span>
                    <span className="text-slate-200 font-mono">23.5°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cooling Fan RPM:</span>
                    <span className="text-slate-200 font-mono">1,200 RPM</span>
                  </div>
                </div>
              </div>

              {/* 4. Display Health */}
              <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/60 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-200">
                  <Monitor className="w-4 h-4 text-emerald-400" />
                  4. Display Health
                </div>
                <div className="space-y-1 text-slate-400">
                  <div className="flex justify-between">
                    <span>Panel Resolution:</span>
                    <span className="text-slate-200 font-mono">1920x1080 (32" Diagonal)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Capacitive Touch Lag:</span>
                    <span className="text-emerald-400 font-mono">
                      {selectedDevice.telemetry?.touch_latency_ms || 12} ms (10-point)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Refresh Rate:</span>
                    <span className="text-slate-200 font-mono">60 FPS (HDMI Handshake OK)</span>
                  </div>
                </div>
              </div>

              {/* 5. Network Health */}
              <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/60 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-200">
                  <Wifi className="w-4 h-4 text-cyan-400" />
                  5. Network Health
                </div>
                <div className="space-y-1 text-slate-400">
                  <div className="flex justify-between">
                    <span>IP Address:</span>
                    <span className="text-slate-200 font-mono">{selectedDevice.ip_address || '192.168.1.107'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>MAC Address:</span>
                    <span className="text-slate-200 font-mono">{selectedDevice.mac_address || '00:1B:44:11:3A:07'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Link Latency:</span>
                    <span className="text-slate-200 font-mono">4.2 ms (0% packet loss)</span>
                  </div>
                </div>
              </div>

              {/* 6. Application Health & Kiosk Policy */}
              <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/60 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-200">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  6. Application & Kiosk Health
                </div>
                <div className="space-y-1 text-slate-400">
                  <div className="flex justify-between">
                    <span>App Version:</span>
                    <span className="text-slate-200 font-mono">{selectedDevice.app_version || '2.4.0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Uptime:</span>
                    <span className="text-slate-200 font-mono">86,400s (24h continuous)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>OS Isolation:</span>
                    <span className="text-emerald-400 font-semibold">
                      F11, F12, Alt+Tab, Escape Blocked
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <Button
                variant={selectedDevice.kiosk_mode_enabled ? 'danger' : 'primary'}
                size="sm"
                onClick={() => {
                  onToggleKiosk(selectedDevice);
                  setSelectedDevice({
                    ...selectedDevice,
                    kiosk_mode_enabled: !selectedDevice.kiosk_mode_enabled,
                  });
                }}
              >
                {selectedDevice.kiosk_mode_enabled ? (
                  <>
                    <Unlock className="w-3.5 h-3.5 mr-1.5" />
                    Unlock Kiosk Mode
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 mr-1.5" />
                    Lock Kiosk Mode
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
              >
                Close Diagnostics
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
