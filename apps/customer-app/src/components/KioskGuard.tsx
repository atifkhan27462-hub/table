'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Shield, ShieldAlert, Lock, Unlock, Cpu, Wifi, Eye, RefreshCw, X, Maximize2, Minimize2 } from 'lucide-react';

interface KioskGuardProps {
  tableNumber?: string;
  deviceId?: string;
  defaultPin?: string;
}

export default function KioskGuard({
  tableNumber = 'Table 01',
  deviceId = 'dev-001',
  defaultPin = '7788',
}: KioskGuardProps) {
  const [isKioskLocked, setIsKioskLocked] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showManagerModal, setShowManagerModal] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [heartbeatStatus, setHeartbeatStatus] = useState<'ONLINE' | 'WARNING' | 'OFFLINE'>('ONLINE');
  const [lastHeartbeatTime, setLastHeartbeatTime] = useState<string>('Just now');
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  const [tapCounter, setTapCounter] = useState<number>(0);

  // Hardware metrics state
  const [telemetry, setTelemetry] = useState({
    cpuTemp: 47.8,
    ramUsage: 41.2,
    touchLatency: 12,
    fps: 60,
    networkStatus: 'CONNECTED',
    ip: '192.168.1.107',
    uptimeSeconds: 86400,
  });

  // 1. Enforce OS Shortcut & Mouse/Touch Interception
  useEffect(() => {
    if (!isKioskLocked) return;

    // Prevent context menu (right click & long-touch)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Block keyboard shortcuts that could break out of kiosk or reveal OS
    const handleKeyDown = (e: KeyboardEvent) => {
      // Keys to block
      const blockedKeys = ['F11', 'F12', 'Escape'];
      if (blockedKeys.includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Block Alt combinations (Alt+Tab, Alt+F4)
      if (e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Block Ctrl combinations (Ctrl+Shift+I, Ctrl+U, Ctrl+R, Ctrl+W, Ctrl+T, Ctrl+N, Ctrl+P)
      if (e.ctrlKey || e.metaKey) {
        const forbiddenLetters = ['w', 't', 'n', 'r', 'u', 'p', 's', 'j', 'i', 'h'];
        if (forbiddenLetters.includes(e.key.toLowerCase())) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }
    };

    // Block pinch-to-zoom multi-touch gestures
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    window.addEventListener('contextmenu', handleContextMenu, { capture: true });
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('touchmove', handleTouchMove, { capture: true });
    };
  }, [isKioskLocked]);

  // 2. Track Fullscreen state
  useEffect(() => {
    const checkFullscreen = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', checkFullscreen);
    return () => document.removeEventListener('fullscreenchange', checkFullscreen);
  }, []);

  const requestFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Ignored if user hasn't interacted yet
    }
  }, []);

  // 3. Periodic Heartbeat Pulse to Backend (Every 10 seconds)
  useEffect(() => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api/v1';

    const pulseHeartbeat = async () => {
      try {
        const payload = {
          device_token: `tok-${deviceId}-live`,
          hardware_id: `ST-HW-32INCH-${deviceId}`,
          app_version: '2.4.0',
          ip_address: telemetry.ip,
          network_status: telemetry.networkStatus,
          kiosk_active: isKioskLocked,
          table_number: tableNumber,
          telemetry: {
            cpu_temp_c: telemetry.cpuTemp,
            ram_usage_percent: telemetry.ramUsage,
            touch_latency_ms: telemetry.touchLatency,
          },
        };

        const res = await fetch(`${API_BASE}/devices/heartbeat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Device-Token': `tok-${deviceId}-live`,
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const json = await res.json();
          const data = json.data || {};
          setHeartbeatStatus(data.status || 'ONLINE');
          setLastHeartbeatTime(data.last_heartbeat_human || 'Just now');
          if (data.kiosk_mode !== undefined && data.kiosk_mode !== isKioskLocked) {
            setIsKioskLocked(data.kiosk_mode);
          }
        } else {
          setHeartbeatStatus('WARNING');
        }
      } catch {
        // Local network disconnected or backend restarting
        setHeartbeatStatus('OFFLINE');
      }
    };

    // First pulse immediately
    pulseHeartbeat();
    const interval = setInterval(pulseHeartbeat, 10000);
    return () => clearInterval(interval);
  }, [isKioskLocked, telemetry, deviceId, tableNumber]);

  // Triple-tap badge to unlock manager console
  const handleBadgeClick = () => {
    setTapCounter((prev) => {
      const next = prev + 1;
      if (next >= 3) {
        setShowManagerModal(true);
        setPinInput('');
        setPinError(null);
        return 0;
      }
      setTimeout(() => setTapCounter(0), 1200);
      return next;
    });
  };

  const handleVerifyPin = () => {
    if (pinInput.trim() === defaultPin) {
      setIsKioskLocked(false);
      setShowManagerModal(false);
      setShowDiagnostics(true);
      setPinError(null);
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    } else {
      setPinError('Invalid Manager Security PIN. Access denied.');
    }
  };

  const handleReEngageKiosk = () => {
    setIsKioskLocked(true);
    setShowDiagnostics(false);
    requestFullscreen();
  };

  return (
    <>
      {/* Sleek bottom status pill - Perfectly synced with active table */}
      <div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-50 select-none pointer-events-auto">
        <div
          onClick={handleBadgeClick}
          title="Triple tap for Staff Diagnostics & Kiosk Unlock"
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-stone-900/90 hover:bg-black text-stone-300 text-xs font-medium border border-stone-700/60 shadow-xl backdrop-blur-md cursor-pointer transition-all active:scale-95"
        >
          {/* Status Indicator */}
          <span className="relative flex h-2 w-2">
            {heartbeatStatus === 'ONLINE' && (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </>
            )}
            {heartbeatStatus === 'WARNING' && (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </>
            )}
            {heartbeatStatus === 'OFFLINE' && (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            )}
          </span>

          <span className="font-black tracking-wider text-amber-400 uppercase">{tableNumber}</span>
          <span className="text-stone-600">|</span>
          <span className="flex items-center gap-1 text-[11px]">
            {isKioskLocked ? (
              <>
                <Lock className="w-3 h-3 text-emerald-400" />
                <span className="text-stone-300 font-medium">Kiosk Active</span>
              </>
            ) : (
              <>
                <Unlock className="w-3 h-3 text-amber-400" />
                <span className="text-amber-300 font-medium">Unlocked</span>
              </>
            )}
          </span>

          <span className="text-stone-600">|</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (isFullscreen) {
                if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
              } else {
                requestFullscreen();
              }
            }}
            className="flex items-center gap-1 text-[11px] text-stone-300 hover:text-amber-400 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter 32" Fullscreen Mode'}
          >
            {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            <span className="hidden sm:inline font-semibold">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </button>

          <span className="text-stone-600">|</span>
          <span className="text-[10px] text-stone-400">{lastHeartbeatTime}</span>
        </div>
      </div>

      {/* Manager PIN Modal */}
      {showManagerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white border border-stone-200 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-stone-900 text-base">Manager Kiosk Unlock</h3>
              </div>
              <button
                onClick={() => setShowManagerModal(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-500">
              Enter manager PIN to unlock the table device and access hardware telemetry.
            </p>

            <div className="space-y-2">
              <input
                type="password"
                maxLength={8}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyPin()}
                placeholder="Enter PIN (Default: 7788)"
                autoFocus
                className="w-full px-4 py-2.5 rounded-lg bg-stone-50 border border-stone-200 text-stone-900 text-center text-lg tracking-widest focus:outline-none focus:border-amber-500 font-mono"
              />
              {pinError && <p className="text-xs text-rose-600 font-medium">{pinError}</p>}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowManagerModal(false)}
                className="flex-1 py-2 px-3 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyPin}
                className="flex-1 py-2 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 text-white text-xs font-semibold transition shadow-md shadow-orange-500/20"
              >
                Unlock Kiosk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Hardware Diagnostics Panel (visible when unlocked) */}
      {showDiagnostics && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-md p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-stone-200 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-bold text-stone-900 text-lg flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-amber-600" />
                  32-Inch Smart Table Diagnostics
                </h3>
                <p className="text-xs text-stone-500">Device: {deviceId} • {tableNumber}</p>
              </div>
              <button
                onClick={handleReEngageKiosk}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                Re-Lock Kiosk
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/80">
                <span className="text-stone-500 block mb-1">CPU Temperature</span>
                <span className="text-base font-bold text-emerald-700">{telemetry.cpuTemp}°C</span>
                <span className="text-[10px] text-stone-400 block">Normal (&lt; 78°C)</span>
              </div>

              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/80">
                <span className="text-stone-500 block mb-1">RAM Utilization</span>
                <span className="text-base font-bold text-amber-700">{telemetry.ramUsage}%</span>
                <span className="text-[10px] text-stone-400 block">3.4 GB of 8.0 GB</span>
              </div>

              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/80">
                <span className="text-stone-500 block mb-1">Touch Latency</span>
                <span className="text-base font-bold text-emerald-700">{telemetry.touchLatency} ms</span>
                <span className="text-[10px] text-stone-400 block">Capacitive 10-point</span>
              </div>

              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/80">
                <span className="text-stone-500 block mb-1">Display Performance</span>
                <span className="text-base font-bold text-indigo-700">{telemetry.fps} FPS</span>
                <span className="text-[10px] text-stone-400 block">1920x1080 @ 60Hz</span>
              </div>

              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/80">
                <span className="text-stone-500 block mb-1">Network Link</span>
                <span className="text-base font-bold text-emerald-700">{telemetry.networkStatus}</span>
                <span className="text-[10px] text-stone-500 font-mono block">{telemetry.ip}</span>
              </div>

              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/80">
                <span className="text-stone-500 block mb-1">Heartbeat Status</span>
                <span className="text-base font-bold text-emerald-700">{heartbeatStatus}</span>
                <span className="text-[10px] text-stone-400 block">Pulse: {lastHeartbeatTime}</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-stone-100">
              <span className="text-xs text-stone-400">Software Version: v2.4.0-kiosk</span>
              <button
                onClick={handleReEngageKiosk}
                className="py-2 px-5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 text-white text-xs font-semibold transition"
              >
                Close &amp; Return to Kiosk
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
