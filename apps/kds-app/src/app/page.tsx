'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ChefHat,
  Clock,
  Flame,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Volume2,
  VolumeX,
  Filter,
  Check,
  ChevronRight,
  Search,
  Bell,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Layers,
  UtensilsCrossed,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';
import { fetchKitchenOrders, fetchTables, fetchActiveServiceCalls, resolveKitchenServiceCall, updateKitchenOrderStatus, deleteKitchenOrder } from '@/lib/api';
import { kdsSocket } from '@/lib/socket';

interface KdsItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price?: number;
  notes?: string;
  prep_station_code?: string;
}

interface KdsOrder {
  id: string;
  order_number: string;
  table_id: string;
  table_number?: string;
  status: 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'COMPLETED' | 'CANCELLED';
  placed_at: string;
  priority?: 'NORMAL' | 'HIGH' | 'RUSH';
  special_instructions?: string;
  items: KdsItem[];
}

export default function KitchenDisplaySystemPage() {
  const [orders, setOrders] = useState<KdsOrder[]>([]);
  const [stationFilter, setStationFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [newOrderAlert, setNewOrderAlert] = useState<boolean>(false);
  const [nowTimestamp, setNowTimestamp] = useState<number>(Date.now());
  const [isWsLive, setIsWsLive] = useState<boolean>(false);

  // Deletion modal state (matching customer dashboard experience)
  const [orderToDelete, setOrderToDelete] = useState<KdsOrder | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

  // Real-time table service assistance alerts (e.g. Table 01 requested Water / Waiter / Bill)
  const [activeServiceAlerts, setActiveServiceAlerts] = useState<{
    table_id: string;
    table_number: string;
    call_type: string;
    timestamp: string;
  }[]>([]);

  // Table ID to Table Number dictionary mapping
  const [tableIdMap, setTableIdMap] = useState<Record<string, string>>({});

  // REAL-TIME WEBSOCKET SUBSCRIPTION (Instant Zero-Latency Ticket Dispatch)
  useEffect(() => {
    const unsubAck = kdsSocket.subscribe('ACK', () => setIsWsLive(true));

    kdsSocket.init(stationFilter);
    if (kdsSocket.isConnected) {
      setIsWsLive(true);
    }

    const unsubCreated = kdsSocket.subscribe('ORDER_CREATED', (evt) => {
      const data = evt.data;
      if (!data) return;

      playKitchenChime();
      setNewOrderAlert(true);
      setTimeout(() => setNewOrderAlert(false), 5000);

      const newKdsOrder: KdsOrder = {
        id: data.order_id || evt.event_id,
        order_number: data.order_number || 'ORD-NEW',
        table_id: data.table_number || data.table_id || 'Table',
        status: (data.status || 'PENDING') as any,
        placed_at: data.placed_at || new Date().toISOString(),
        priority: 'HIGH',
        special_instructions: data.special_instructions || '',
        items: (data.items || []).map((it: any, idx: number) => ({
          id: it.id || `it-${idx}`,
          product_name: it.product_name || 'Dish Item',
          quantity: it.quantity || 1,
          unit_price: it.unit_price,
          notes: it.notes,
          prep_station_code: it.prep_station_code || 'GRILL',
        })),
      };

      setOrders((prev) => {
        if (prev.some((o) => o.id === newKdsOrder.id || o.order_number === newKdsOrder.order_number)) {
          return prev;
        }
        return [newKdsOrder, ...prev];
      });
    });

    const unsubStatus = kdsSocket.subscribe('*', (evt) => {
      if (['ORDER_PREPARING', 'ORDER_READY', 'ORDER_SERVED', 'ORDER_COMPLETED', 'ORDER_CANCELLED'].includes(evt.type)) {
        const orderId = evt.data?.order_id;
        const newStatus = evt.data?.status || evt.type.replace('ORDER_', '');
        if (orderId) {
          if (evt.type === 'ORDER_CANCELLED' || evt.data?.deleted || newStatus === 'DELETED') {
            setOrders((prev) => prev.filter((o) => o.id !== orderId));
          } else {
            setOrders((prev) =>
              prev.map((o) => (o.id === orderId ? { ...o, status: newStatus as any } : o))
            );
          }
        }
      }
    });

    const unsubStaff = kdsSocket.subscribe('STAFF_ASSISTANCE_REQUESTED', (evt) => {
      const data = evt.data;
      if (!data) return;
      playKitchenChime();
      setActiveServiceAlerts((prev) => [
        {
          table_id: data.table_id || 'table',
          table_number: data.table_number || 'Table',
          call_type: data.call_type || 'Server Call',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        ...prev.filter((a) => a.table_id !== data.table_id),
      ]);
    });

    const unsubResolved = kdsSocket.subscribe('STAFF_ASSISTANCE_RESOLVED', (evt) => {
      const data = evt.data;
      if (!data) return;
      setActiveServiceAlerts((prev) => prev.filter((a) => a.table_id !== data.table_id));
    });

    return () => {
      unsubAck();
      unsubCreated();
      unsubStatus();
      unsubStaff();
      unsubResolved();
    };
  }, [stationFilter]);

  // Web Audio API Synthesizer for Kitchen Chime (Zero external dependencies)
  const playKitchenChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      gain1.gain.setValueAtTime(0.3, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.4);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain2.gain.setValueAtTime(0.4, ctx.currentTime + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.15);
      osc2.stop(ctx.currentTime + 0.6);
    } catch (e) {
      console.warn('Audio chime play blocked by browser autoplay policy:', e);
    }
  };

  // Timer loop for updating preparation elapsed timers every second
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setNowTimestamp(Date.now());
    }, 1000);
    return () => clearInterval(timerInterval);
  }, []);

  const lastOrderCountRef = useRef<number>(0);

  // ADAPTIVE AUTO POLLING:
  // - WebSocket LIVE: Relax poll interval to 45s
  // - WebSocket OFFLINE: Poll every 5s for resilience
  const refreshOrders = async () => {
    try {
      setIsRefreshing(true);
      const [fetched, tbls] = await Promise.all([
        fetchKitchenOrders(),
        Object.keys(tableIdMap).length === 0 ? fetchTables() : Promise.resolve([]),
      ]);
      let updatedMap = { ...tableIdMap };
      if (tbls && tbls.length > 0) {
        tbls.forEach((t: any) => {
          updatedMap[t.id] = t.table_number;
        });
        setTableIdMap(updatedMap);
      }
      const mapped = (fetched || []).map((ord: any) => ({
        ...ord,
        table_number:
          ord.table_number ||
          (ord.table_id && updatedMap[ord.table_id]) ||
          (ord.table_id && /^table/i.test(ord.table_id) ? ord.table_id : 'Table 01'),
      }));
      setOrders(mapped);
      lastOrderCountRef.current = mapped.length;
    } catch (err) {
      console.warn('Refresh kitchen orders error:', err);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function pollOrders() {
      try {
        const [fetched, tbls, activeCalls] = await Promise.all([
          fetchKitchenOrders(),
          Object.keys(tableIdMap).length === 0 ? fetchTables() : Promise.resolve([]),
          fetchActiveServiceCalls(),
        ]);
        if (!isMounted) return;

        let updatedMap = { ...tableIdMap };
        if (tbls && tbls.length > 0) {
          tbls.forEach((t: any) => {
            updatedMap[t.id] = t.table_number;
          });
          setTableIdMap(updatedMap);
        }

        if (activeCalls && activeCalls.length > 0) {
          setActiveServiceAlerts((prev) => {
            const serverAlerts = activeCalls.map((c: any) => ({
              table_id: c.id,
              table_number: c.title ? c.title.replace('Service Call: ', '') : 'Table',
              call_type: c.call_type || 'Server Call',
              timestamp: c.created_at
                ? new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'Now',
            }));
            return serverAlerts;
          });
        }

        const mapped = (fetched || []).map((ord: any) => ({
          ...ord,
          table_number:
            ord.table_number ||
            (ord.table_id && updatedMap[ord.table_id]) ||
            (ord.table_id && /^table/i.test(ord.table_id) ? ord.table_id : 'Table 01'),
        }));

        if (lastOrderCountRef.current > 0 && mapped && mapped.length > lastOrderCountRef.current) {
          playKitchenChime();
          setNewOrderAlert(true);
          setTimeout(() => setNewOrderAlert(false), 5000);
        }

        setOrders(mapped);
        lastOrderCountRef.current = mapped.length;
        setIsLoading(false);
      } catch (err) {
        console.warn('Polling kitchen orders error:', err);
      }
    }

    pollOrders();
    const intervalMs = isWsLive ? 45000 : 5000;
    const pollInterval = setInterval(pollOrders, intervalMs);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [isWsLive, Object.keys(tableIdMap).length]);

  // Action Handler: Transition order status
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus as any } : o))
    );

    try {
      await updateKitchenOrderStatus(orderId, newStatus);
    } catch (err) {
      console.error('Error updating order status in backend:', err);
    }
  };

  // Action Handler: Delete / Cancel order ticket
  const handleDeleteOrder = async (order: KdsOrder) => {
    try {
      setDeletingOrderId(order.id);
      try {
        await deleteKitchenOrder(order.id);
      } catch (err) {
        console.warn('Delete ticket note:', err);
      }
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
      setOrderToDelete(null);
    } catch (err) {
      console.error('Error deleting ticket:', err);
      alert('Could not delete ticket. Please try again.');
    } finally {
      setDeletingOrderId(null);
    }
  };

  // Calculate Elapsed Time formatted with strict UTC timezone normalization
  const getElapsedTimeInfo = (placedAtStr: string) => {
    if (!placedAtStr) return { mins: 0, secs: 0, formatted: '00:00', isOverdue: false };
    let normalized = String(placedAtStr).trim();
    // Normalize ISO without timezone to UTC (appends 'Z' to prevent 5-hour local parsing bug)
    if (!normalized.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(normalized)) {
      normalized = `${normalized}Z`;
    }
    const placedTime = new Date(normalized).getTime();
    if (isNaN(placedTime)) return { mins: 0, secs: 0, formatted: '00:00', isOverdue: false };

    const elapsedSeconds = Math.max(0, Math.floor((nowTimestamp - placedTime) / 1000));
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    const isOverdue = mins >= 15;
    return { mins, secs, formatted, isOverdue };
  };

  const formatTableDisplay = (tableIdOrNum?: string, tableNumberField?: string) => {
    if (tableNumberField) return tableNumberField.toUpperCase();
    if (!tableIdOrNum) return 'TABLE 01';
    if (/^table\s*\d+/i.test(tableIdOrNum)) return tableIdOrNum.toUpperCase();
    if (tableIdMap[tableIdOrNum]) return tableIdMap[tableIdOrNum].toUpperCase();
    return 'TABLE 01';
  };

  // Filter orders by station and search term
  const filterOrdersByStation = (orderList: KdsOrder[]) => {
    return orderList.filter((ord) => {
      const matchesSearch =
        searchQuery === '' ||
        (ord.order_number || ord.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ord.table_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        ord.items.some((it) => it.product_name.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;
      if (stationFilter === 'ALL') return true;

      return ord.items.some((it) => {
        const st = (it.prep_station_code || 'GRILL').toUpperCase();
        return st.includes(stationFilter.toUpperCase());
      });
    });
  };

  // Categorize into 4 Columns: NEW (PENDING), PREPARING, READY, COMPLETED
  const newOrders = filterOrdersByStation(
    orders.filter((o) => (o.status || '').toUpperCase() === 'PENDING' || (o.status || '').toUpperCase() === 'PLACED')
  );
  const preparingOrders = filterOrdersByStation(
    orders.filter((o) => (o.status || '').toUpperCase() === 'PREPARING')
  );
  const readyOrders = filterOrdersByStation(
    orders.filter((o) => (o.status || '').toUpperCase() === 'READY')
  );
  const completedOrders = filterOrdersByStation(
    orders.filter((o) => (o.status || '').toUpperCase() === 'COMPLETED' || (o.status || '').toUpperCase() === 'SERVED')
  );

  const overdueCount = orders.filter((o) => {
    if (o.status === 'COMPLETED' || o.status === 'SERVED' || o.status === 'CANCELLED') return false;
    const { mins } = getElapsedTimeInfo(o.placed_at);
    return mins >= 15;
  }).length;

  return (
    <div className="flex flex-col h-screen w-full bg-[#FAF8F5] text-stone-800 font-sans select-none overflow-hidden antialiased">
      {/* ======================================================== */}
      {/* REAL-TIME FLOOR SERVICE / WAITER CALL ALERTS */}
      {/* ======================================================== */}
      {activeServiceAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-8 py-3 flex items-center justify-between text-xs font-black shadow-lg z-50 animate-fadeIn">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="h-7 w-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <Bell className="h-4 w-4 text-white animate-bounce" />
            </div>
            <span className="uppercase tracking-wider font-black text-amber-100">
              FLOOR SERVICE REQUEST:
            </span>
            {activeServiceAlerts.map((alert, idx) => (
              <span
                key={idx}
                className="bg-stone-900/90 text-amber-300 px-3 py-1 rounded-xl text-xs font-black flex items-center gap-2 border border-amber-400/40 shadow-sm"
              >
                <span>{alert.table_number}</span>
                <span className="text-white">({alert.call_type})</span>
                <span className="text-[10px] text-stone-400">{alert.timestamp}</span>
                <button
                  type="button"
                  onClick={async () => {
                    await resolveKitchenServiceCall(alert.table_id);
                    setActiveServiceAlerts((prev) =>
                      prev.filter((a) => a.table_id !== alert.table_id)
                    );
                  }}
                  className="ml-1 text-stone-400 hover:text-white font-bold cursor-pointer"
                  title="Dismiss alert"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={async () => {
              for (const a of activeServiceAlerts) {
                await resolveKitchenServiceCall(a.table_id);
              }
              setActiveServiceAlerts([]);
            }}
            className="px-3.5 py-1.5 bg-stone-900 hover:bg-black text-white rounded-xl text-[11px] font-bold shadow-xs transition-colors cursor-pointer shrink-0"
          >
            Clear All Alerts
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* NEW ORDER INCOMING ALERT BANNER (Customer App Themed) */}
      {/* ======================================================== */}
      {newOrderAlert && (
        <div className="bg-emerald-50 text-emerald-950 border-b border-emerald-200 px-8 py-2.5 flex items-center justify-between text-xs font-black shadow-xs z-50 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <Bell className="h-4 w-4 text-emerald-600 animate-bounce" />
            <span>NEW INCOMING TABLE ORDER DISPATCHED TO KITCHEN PREPARATION LINE!</span>
          </div>
          <button
            onClick={() => setNewOrderAlert(false)}
            className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-bold shadow-xs transition-colors cursor-pointer"
          >
            Acknowledge Alert
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* OVERDUE TICKET ALERT BAR */}
      {/* ======================================================== */}
      {overdueCount > 0 && (
        <div className="bg-rose-50 text-rose-950 px-8 py-2 flex items-center justify-between text-xs font-black border-b border-rose-200 shadow-xs z-40">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 animate-pulse" />
            <span>KITCHEN PRIORITY NOTICE: {overdueCount} Ticket(s) Exceed Target Prep Time (&gt; 15 Minutes)!</span>
          </div>
          <span className="text-[11px] bg-rose-600 text-white font-extrabold px-3 py-0.5 rounded-full shadow-2xs">
            Rush Culinary Line
          </span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 32"/55" MASTER KITCHEN HEADER (Matching Customer Dashboard) */}
      {/* ======================================================== */}
      <header className="h-20 px-8 bg-white/95 backdrop-blur-md border-b border-stone-200/80 flex items-center justify-between shrink-0 shadow-xs z-30">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 flex items-center justify-center text-white font-black text-xl shadow-md shadow-orange-500/20 border border-orange-300">
            <ChefHat className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-stone-900 flex items-center gap-2">
              ATIF &amp; ABDULLAH FOODS
              <span className={`text-[11px] px-3 py-1 rounded-full font-bold border flex items-center gap-1.5 shadow-xs ${
                isWsLive
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                <span className={`h-2 w-2 rounded-full ${isWsLive ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
                KITCHEN DISPLAY (KDS) • {isWsLive ? '⚡ LIVE' : 'AUTO-POLL'}
              </span>
            </h1>
            <p className="text-xs text-stone-500 font-medium">Fine Dining Smart Kitchen • Master Culinary Station</p>
          </div>
        </div>

        {/* Station Filter Tabs & Search Controls (Pill container identical to Customer App) */}
        <div className="flex items-center gap-3">
          {/* Station Filter Selector */}
          <div className="flex items-center gap-1.5 bg-stone-100 p-1.5 rounded-2xl border border-stone-200/70">
            {['ALL', 'GRILL', 'SAUTE', 'COLD_PREP', 'BAR', 'OVEN'].map((st) => (
              <button
                key={st}
                onClick={() => setStationFilter(st)}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  stationFilter === st
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/20'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-white/80'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-52">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search table or dish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-stone-200/80 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-xs"
            />
          </div>

          {/* Sound Toggle Button */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-3 py-2 rounded-xl border font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer ${
              soundEnabled
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                : 'bg-white text-stone-500 border-stone-200 hover:bg-stone-50'
            }`}
            title="Toggle kitchen chime notification"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-emerald-600" /> : <VolumeX className="h-4 w-4" />}
            <span className="hidden lg:inline">{soundEnabled ? 'Chime ON' : 'Muted'}</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={refreshOrders}
            disabled={isRefreshing}
            className="px-3.5 py-2 bg-white hover:bg-stone-50 text-stone-800 font-bold text-xs rounded-xl border border-stone-200 flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            title="Refresh order queue"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-amber-600' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 4 COLUMNS KANBAN KDS BOARD (NEW, PREPARING, READY, COMPLETED) */}
      {/* ======================================================== */}
      <main className="flex-1 overflow-x-auto p-6 bg-[#FAF8F5]">
        <div className="grid grid-cols-4 gap-6 h-full min-w-[1240px]">
          {/* COLUMN 1: NEW (PENDING ORDERS) */}
          <div className="flex flex-col bg-stone-100/75 border border-stone-200/80 rounded-3xl p-4 h-full shadow-inner-xs">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-ping" />
                <h2 className="text-sm font-black text-stone-900 uppercase tracking-wider">1. New Orders</h2>
              </div>
              <span className="px-3 py-1 rounded-full font-black text-xs bg-blue-50 text-blue-700 border border-blue-200">
                {newOrders.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto pt-4 space-y-4 pr-1">
              {newOrders.length === 0 ? (
                <div className="text-center py-16 text-xs text-stone-400 font-bold border-2 border-dashed border-stone-200 rounded-2xl bg-white/40">
                  No new orders in queue
                </div>
              ) : (
                newOrders.map((ord) => (
                  <KdsTicketCard
                    key={ord.id}
                    order={ord}
                    getElapsedTimeInfo={getElapsedTimeInfo}
                    onAction={() => handleUpdateStatus(ord.id, 'PREPARING')}
                    onDelete={() => setOrderToDelete(ord)}
                    actionLabel="ACCEPT & START PREP"
                    actionColor="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20"
                  />
                ))
              )}
            </div>
          </div>

          {/* COLUMN 2: PREPARING (ACTIVE COOKING) */}
          <div className="flex flex-col bg-stone-100/75 border border-stone-200/80 rounded-3xl p-4 h-full shadow-inner-xs">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 shrink-0">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-amber-600 animate-bounce" />
                <h2 className="text-sm font-black text-stone-900 uppercase tracking-wider">2. Preparing</h2>
              </div>
              <span className="px-3 py-1 rounded-full font-black text-xs bg-amber-50 text-amber-800 border border-amber-200">
                {preparingOrders.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto pt-4 space-y-4 pr-1">
              {preparingOrders.length === 0 ? (
                <div className="text-center py-16 text-xs text-stone-400 font-bold border-2 border-dashed border-stone-200 rounded-2xl bg-white/40">
                  No active tickets on line
                </div>
              ) : (
                preparingOrders.map((ord) => (
                  <KdsTicketCard
                    key={ord.id}
                    order={ord}
                    getElapsedTimeInfo={getElapsedTimeInfo}
                    onAction={() => handleUpdateStatus(ord.id, 'READY')}
                    onDelete={() => setOrderToDelete(ord)}
                    actionLabel="MARK TICKET READY"
                    actionColor="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md shadow-orange-500/20"
                  />
                ))
              )}
            </div>
          </div>

          {/* COLUMN 3: READY (PLATED & READY FOR RUNNER) */}
          <div className="flex flex-col bg-stone-100/75 border border-stone-200/80 rounded-3xl p-4 h-full shadow-inner-xs">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 shrink-0">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <h2 className="text-sm font-black text-stone-900 uppercase tracking-wider">3. Ready for Pickup</h2>
              </div>
              <span className="px-3 py-1 rounded-full font-black text-xs bg-emerald-50 text-emerald-800 border border-emerald-200">
                {readyOrders.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto pt-4 space-y-4 pr-1">
              {readyOrders.length === 0 ? (
                <div className="text-center py-16 text-xs text-stone-400 font-bold border-2 border-dashed border-stone-200 rounded-2xl bg-white/40">
                  No tickets awaiting runner
                </div>
              ) : (
                readyOrders.map((ord) => (
                  <KdsTicketCard
                    key={ord.id}
                    order={ord}
                    getElapsedTimeInfo={getElapsedTimeInfo}
                    onAction={() => handleUpdateStatus(ord.id, 'COMPLETED')}
                    onDelete={() => setOrderToDelete(ord)}
                    actionLabel="COMPLETE & SERVED"
                    actionColor="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20"
                  />
                ))
              )}
            </div>
          </div>

          {/* COLUMN 4: COMPLETED (SERVED TICKETS) */}
          <div className="flex flex-col bg-stone-100/75 border border-stone-200/80 rounded-3xl p-4 h-full shadow-inner-xs">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 shrink-0">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="h-4 w-4 text-stone-500" />
                <h2 className="text-sm font-black text-stone-800 uppercase tracking-wider">4. Completed</h2>
              </div>
              <span className="px-3 py-1 rounded-full font-black text-xs bg-stone-200 text-stone-700 border border-stone-300">
                {completedOrders.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto pt-4 space-y-4 pr-1 opacity-85">
              {completedOrders.length === 0 ? (
                <div className="text-center py-16 text-xs text-stone-400 font-bold border-2 border-dashed border-stone-200 rounded-2xl bg-white/40">
                  No completed tickets yet
                </div>
              ) : (
                completedOrders.map((ord) => (
                  <KdsTicketCard
                    key={ord.id}
                    order={ord}
                    getElapsedTimeInfo={getElapsedTimeInfo}
                    onAction={() => handleUpdateStatus(ord.id, 'PREPARING')}
                    onDelete={() => setOrderToDelete(ord)}
                    actionLabel="RE-OPEN TICKET"
                    actionColor="bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 shadow-xs"
                    isCompleted
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ======================================================== */}
      {/* MODAL: CONFIRM DELETE / CANCEL ORDER TICKET */}
      {/* ======================================================== */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center border border-red-200 shrink-0">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-stone-900">Delete Kitchen Ticket?</h3>
                <p className="text-xs text-stone-500">Order #{orderToDelete.order_number}</p>
              </div>
            </div>

            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-2 text-xs">
              <p className="text-stone-600">
                Are you sure you want to dismiss and delete this ticket from the kitchen? This will cancel the ticket and remove it from the customer order tracker.
              </p>
              <div className="pt-2 border-t border-stone-200 flex justify-between font-bold text-stone-700">
                <span>Table:</span>
                <span className="text-stone-900 font-black">{orderToDelete.table_id || 'Table'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                disabled={deletingOrderId === orderToDelete.id}
                className="flex-1 py-3 px-4 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteOrder(orderToDelete)}
                disabled={deletingOrderId === orderToDelete.id}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-black text-xs rounded-xl shadow-lg shadow-red-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {deletingOrderId === orderToDelete.id ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Yes, Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Single Elegant KDS Ticket Card (Matching Customer Dashboard Aesthetic)
function KdsTicketCard({
  order,
  getElapsedTimeInfo,
  onAction,
  onDelete,
  actionLabel,
  actionColor,
  isCompleted = false,
}: {
  order: KdsOrder;
  getElapsedTimeInfo: (time: string) => { mins: number; secs: number; formatted: string; isOverdue: boolean };
  onAction: () => void;
  onDelete: () => void;
  actionLabel: string;
  actionColor: string;
  isCompleted?: boolean;
}) {
  const { mins, formatted, isOverdue } = getElapsedTimeInfo(order.placed_at);

  const statuses = ['PENDING', 'PREPARING', 'READY', 'SERVED'];
  const currentIdx = statuses.indexOf((order.status || 'PENDING').toUpperCase());

  return (
    <div
      className={`bg-white border rounded-3xl p-5 space-y-4 shadow-sm hover:shadow-md transition-all relative ${
        isOverdue && !isCompleted
          ? 'border-rose-400 ring-2 ring-rose-400/20 bg-rose-50/10'
          : order.priority === 'RUSH'
          ? 'border-amber-400 ring-2 ring-amber-400/20'
          : 'border-stone-200/80 hover:border-stone-300'
      }`}
    >
      {/* Ticket Header: Table Number, Order ID, Timer & Actions */}
      <div className="flex items-start justify-between border-b border-stone-100 pb-3">
        <div>
          <span className="text-lg font-black text-stone-900 tracking-tight block">
            {order.table_number ? order.table_number.toUpperCase() : (order.table_id && /^table/i.test(order.table_id) ? order.table_id.toUpperCase() : 'TABLE 01')}
          </span>
          <span className="text-xs font-bold text-stone-500 block mt-0.5">
            Ticket #{order.order_number || order.id}
          </span>
        </div>

        {/* Live Timer Pill, Rush Badge & Delete Button */}
        <div className="flex items-center gap-2">
          {isOverdue && !isCompleted ? (
            <span className="text-xs font-black font-mono bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-xl shadow-xs animate-pulse">
              OVERDUE {formatted}
            </span>
          ) : (
            <span className="text-xs font-black font-mono bg-stone-100 text-stone-800 border border-stone-200 px-2.5 py-1 rounded-xl shadow-2xs">
              {formatted}
            </span>
          )}

          {order.priority === 'RUSH' && (
            <span className="text-[10px] font-black uppercase bg-amber-500 text-white px-2 py-0.5 rounded-md shadow-2xs">
              RUSH
            </span>
          )}

          <button
            onClick={onDelete}
            className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-200 cursor-pointer"
            title="Delete / cancel ticket"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Mini Progress Bar Timeline (identical to Customer Tracker) */}
      <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
        {statuses.map((step, idx) => {
          const isDone = currentIdx >= idx;
          return (
            <div key={step} className="space-y-1">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  isDone ? 'bg-emerald-500 shadow-2xs' : 'bg-stone-200'
                }`}
              />
              <span className={`font-extrabold ${isDone ? 'text-emerald-700' : 'text-stone-400'}`}>
                {step}
              </span>
            </div>
          );
        })}
      </div>

      {/* Itemized Dish List (Customer App Ordered Dishes Box) */}
      <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 space-y-2 text-xs">
        <span className="font-extrabold text-stone-500 uppercase text-[10px] tracking-wider block">
          Ordered Dishes
        </span>
        {order.items.map((item, idx) => (
          <div key={idx} className="space-y-1 pb-1 last:pb-0 border-b border-stone-200/50 last:border-0">
            <div className="flex items-start justify-between">
              <span className="font-extrabold text-stone-900 text-xs">
                {item.quantity}x {item.product_name}
              </span>
              <span className="text-[10px] font-extrabold bg-white text-stone-700 border border-stone-200 px-2 py-0.5 rounded-lg shadow-2xs">
                {item.prep_station_code || 'GRILL'}
              </span>
            </div>

            {/* Customization Details (Doneness, Sides, Notes) */}
            {item.notes && (
              <p className="text-[11px] font-semibold text-amber-900 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200/80">
                Note: {item.notes}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Special Order Instructions */}
      {order.special_instructions && (
        <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-2xl text-xs font-bold text-rose-800 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
          <span>{order.special_instructions}</span>
        </div>
      )}

      {/* Action Button (Large Touch Target with Smooth Gradients) */}
      <button
        onClick={onAction}
        className={`w-full py-3.5 rounded-2xl text-xs font-black shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 min-h-[50px] cursor-pointer ${actionColor}`}
      >
        <span>{actionLabel}</span>
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
