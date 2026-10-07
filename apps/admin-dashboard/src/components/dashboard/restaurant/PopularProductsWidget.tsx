'use client';

import React from 'react';
import { Flame, TrendingUp, UtensilsCrossed } from 'lucide-react';

export interface PopularProductItem {
  product_name: string;
  category?: string;
  units_sold: number;
  revenue: number;
  percentage_of_sales?: number;
}

interface PopularProductsProps {
  products: PopularProductItem[];
  currencyPrefix?: string;
  className?: string;
}

export const PopularProductsWidget: React.FC<PopularProductsProps> = ({
  products,
  currencyPrefix = 'PKR ',
  className = '',
}) => {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-xs p-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
            <Flame className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Top Dining Products</h3>
            <p className="text-[11px] text-slate-500">Highest volume items ordered today</p>
          </div>
        </div>
        <span className="text-xs font-semibold text-slate-400">Live Analytics</span>
      </div>

      {/* List */}
      <div className="mt-3 divide-y divide-slate-100">
        {products.length === 0 ? (
          <div className="py-8 text-center">
            <UtensilsCrossed className="h-6 w-6 text-slate-300 mx-auto mb-1" />
            <p className="text-xs text-slate-400">No product orders recorded today</p>
          </div>
        ) : (
          products.slice(0, 5).map((item, idx) => (
            <div key={idx} className="py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-black text-xs text-slate-400 w-4 text-center">
                  #{idx + 1}
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 leading-snug">
                    {item.product_name}
                  </h4>
                  <span className="text-[10px] text-slate-500">
                    {item.category || 'Mains'} • {item.units_sold} orders placed
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold text-slate-900 block">
                  {currencyPrefix}{item.revenue.toLocaleString()}
                </span>
                {item.percentage_of_sales !== undefined && (
                  <span className="text-[10px] text-emerald-600 font-semibold inline-flex items-center gap-0.5">
                    <TrendingUp className="h-2.5 w-2.5" />
                    {item.percentage_of_sales}% of sales
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
