'use client';

import React, { useState } from 'react';
import { StatusBadge } from '../shared/StatusBadge';
import {
  Clock,
  CheckCircle2,
  ChefHat,
  Eye,
  Check,
  Play,
  RotateCcw,
  Sparkles,
  Receipt,
  Utensils,
} from 'lucide-react';

export interface OrderItemRecord {
  id?: string;
  product_name?: string;
  name?: string;
  quantity: number;
  unit_price?: number;
  price?: number;
  customizations?: any;
}

export interface LiveOrderRecord {
  id: string;
  order_number: string;
  table_id: string;
  table_number?: string;
  status: string; // PENDING, ACCEPTED, PREPARING, READY, SERVED, COMPLETED, CANCELLED
  total_amount: number;
  items: OrderItemRecord[];
  placed_at?: string;
  elapsed_minutes?: number;
  special_instructions?: string;
}

interface LiveOrderFeedProps {
  orders: LiveOrderRecord[];
  onUpdateStatus: (orderId: string, status: string) => Promise<void>;
  onViewOrder: (order: LiveOrderRecord) => void;
  isLoading?: boolean;
}

export const LiveOrderFeed: React.FC<LiveOrderFeedProps> = ({
  orders,
  onUpdateStatus,
  onViewOrder,
  isLoading = false,
}) => {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'PREPARING' | 'READY'>('ALL');

  const activeOrders = orders.filter((o) => {
    const st = (o.status || '').toUpperCase();
    if (filter === 'ALL') return st !== 'COMPLETED' && st !== 'CANCELLED';
    return st === filter;
  });

  const handleStatusChange = async (orderId: string, nextStatus: string) => {
    setUpdatingId(orderId);
    try {
      await onUpdateStatus(orderId, nextStatus);
    } finally {
      setUpdatingId(null);
    }
  };

  const formatElapsed = (placedAt?: string, fallbackMin?: number) => {
    if (!placedAt) return `${fallbackMin || 5} min ago`;
    const diffMs = Date.now() - new Date(placedAt).getTime();
    const min = Math.max(1, Math.floor(diffMs / 60000));
    return `${min}m`;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col h-full">
      {/* Feed Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-blue-600" />
          <h3 className="text-base font-bold text-slate-900 tracking-tight">Live Orders Feed</h3>
          <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-800 border border-amber-200">
            {activeOrders.length} Active Tickets
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-semibold text-slate-600">
          {(['ALL', 'PENDING', 'PREPARING', 'READY'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-2 py-1 rounded-md transition-colors ${
                filter === tab ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              {tab === 'ALL' ? 'All Active' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="flex-1 overflow-y-auto mt-3 space-y-3 pr-1 max-h-[520px]">
        {activeOrders.length === 0 ? (
          <div className="py-14 text-center">
            <Utensils className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No active orders</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Live orders from customer table tablets will appear here instantaneously.
            </p>
          </div>
        ) : (
          activeOrders.map((order) => {
            const status = (order.status || 'PENDING').toUpperCase();
            const isUpdating = updatingId === order.id;

            return (
              <div
                key={order.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-xs"
              >
                {/* Header: Order Number, Table, Status, Elapsed Time */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-xs text-slate-900">
                      #{order.order_number || order.id.slice(0, 8)}
                    </span>
                    <span className="px-2 py-0.5 rounded font-bold text-xs bg-slate-100 text-slate-800 border border-slate-200">
                      {order.table_number || order.table_id || 'Table'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatElapsed(order.placed_at, order.elapsed_minutes)}
                    </span>
                    <StatusBadge status={status} type="order" size="sm" />
                  </div>
                </div>

                {/* Items Summary */}
                <div className="py-2.5 space-y-1 text-xs text-slate-700">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="font-medium">
                          <strong className="text-blue-600 font-bold">{item.quantity}x</strong>{' '}
                          {item.product_name || item.name || 'Dish Item'}
                        </span>
                        <span className="text-slate-500 font-medium">
                          PKR {((item.unit_price || item.price || 0) * item.quantity).toLocaleString()}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 italic">Custom dining items</p>
                  )}
                </div>

                {/* Total & Action Buttons */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total</span>
                    <span className="text-sm font-bold text-slate-900">
                      PKR {Number(order.total_amount || 0).toLocaleString()}
                    </span>
                  </div>

                  {/* Contextual Action Buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onViewOrder(order)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      View
                    </button>

                    {status === 'PENDING' && (
                      <button
                        disabled={isUpdating}
                        onClick={() => handleStatusChange(order.id, 'ACCEPTED')}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs"
                      >
                        Accept
                      </button>
                    )}

                    {(status === 'ACCEPTED' || status === 'PENDING') && (
                      <button
                        disabled={isUpdating}
                        onClick={() => handleStatusChange(order.id, 'PREPARING')}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors shadow-xs flex items-center gap-1"
                      >
                        <ChefHat className="h-3 w-3" /> Preparing
                      </button>
                    )}

                    {status === 'PREPARING' && (
                      <button
                        disabled={isUpdating}
                        onClick={() => handleStatusChange(order.id, 'READY')}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-xs flex items-center gap-1"
                      >
                        <Check className="h-3 w-3" /> Mark Ready
                      </button>
                    )}

                    {(status === 'READY' || status === 'SERVED') && (
                      <button
                        disabled={isUpdating}
                        onClick={() => handleStatusChange(order.id, 'COMPLETED')}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs flex items-center gap-1"
                      >
                        <CheckCircle2 className="h-3 w-3" /> Complete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
