'use client';

import React, { useState } from 'react';
import {
  Search,
  Filter,
  Download,
  ShieldCheck,
  Clock,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export interface AuditLogItem {
  id: string;
  actor?: string;
  user_name?: string;
  role?: string;
  action: string;
  entity?: string;
  resource?: string;
  resource_id?: string;
  prev_val?: string;
  new_val?: string;
  timestamp: string;
  ip?: string;
  result?: string;
}

interface AdminAuditLogsTableProps {
  logs: AuditLogItem[];
  className?: string;
}

export const AdminAuditLogsTable: React.FC<AdminAuditLogsTableProps> = ({
  logs,
  className = '',
}) => {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const actions = Array.from(new Set(logs.map((l) => l.action).filter(Boolean)));

  const filtered = logs.filter((log) => {
    const matchesSearch =
      search === '' ||
      (log.actor || log.user_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.action || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.entity || log.resource || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.ip || '').toLowerCase().includes(search.toLowerCase());

    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleExportCsv = () => {
    const headers = ['Timestamp', 'Actor', 'Role', 'Action', 'Resource', 'Result', 'IP'];
    const rows = filtered.map((l) => [
      l.timestamp,
      `"${l.actor || l.user_name || 'System'}"`,
      `"${l.role || 'ADMIN'}"`,
      `"${l.action}"`,
      `"${l.entity || l.resource || ''}"`,
      `"${l.result || 'SUCCESS'}"`,
      `"${l.ip || '127.0.0.1'}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-xs p-5 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Security &amp; Audit Trail</h3>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-teal-50 text-teal-700 border border-teal-200">
              {filtered.length} Entries
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log of staff actions, menu updates, and system events
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative w-48 sm:w-56">
            <input
              type="text"
              placeholder="Search logs, actors, IP..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full h-8 pl-8 pr-2.5 rounded-lg border border-slate-200 text-xs bg-slate-50 focus:outline-hidden focus:border-teal-500"
            />
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50 focus:outline-hidden focus:border-teal-500"
          >
            <option value="ALL">All Actions</option>
            {actions.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>

          <button
            onClick={handleExportCsv}
            className="h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto mt-3">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
              <th className="py-2.5 px-3">Timestamp</th>
              <th className="py-2.5 px-3">Actor / User</th>
              <th className="py-2.5 px-3">Role</th>
              <th className="py-2.5 px-3">Action</th>
              <th className="py-2.5 px-3">Resource</th>
              <th className="py-2.5 px-3">Result</th>
              <th className="py-2.5 px-3">IP Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                  No matching audit logs found
                </td>
              </tr>
            ) : (
              paginated.map((log, idx) => (
                <tr key={log.id || idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                    {log.actor || log.user_name || 'System Auto'}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {log.role || 'ADMIN'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                    {log.action}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                    {log.entity || log.resource || 'Resource'}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {log.result || 'SUCCESS'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                    {log.ip || '192.168.1.50'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>
          Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filtered.length)} of {filtered.length} entries
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1 rounded-md border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-2 font-semibold text-slate-800">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-1 rounded-md border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
