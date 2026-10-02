'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  History,
  Search,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { AuditLog } from '@/types';
import { TEKNISI_LIST } from '@/lib/constants';
import { formatDateTimeIndo } from '@/lib/whatsapp-formatter';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [selectedActor, setSelectedActor] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (selectedActor !== 'ALL') params.append('actor', selectedActor);

      const res = await fetch(`/api/logs?${params.toString()}`);
      const data = await res.json();
      if (!data.error) setLogs(data.logs || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedActor]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 sm:w-7 sm:h-7 text-blue-500" />
            Audit Trail & Activity Log
          </h1>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 sm:pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:outline-hidden font-medium"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={selectedActor}
              onChange={(e) => setSelectedActor(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:outline-hidden font-medium"
            >
              <option value="ALL">-- Semua Aktor / Teknisi --</option>
              {TEKNISI_LIST.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
              <option value="Admin Kasir">Admin Kasir</option>
              <option value="Admin">Admin</option>
            </select>

            <button
              onClick={fetchLogs}
              className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors shrink-0"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Table Logs */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        <div className="px-4 sm:px-5 py-3 bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          <span>Menampilkan {logs.length} Catatan Log</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-3 sm:px-4 py-3 sm:py-3.5 w-40">Waktu</th>
                <th className="px-3 sm:px-4 py-3 sm:py-3.5 w-28">Aktor</th>
                <th className="px-3 sm:px-4 py-3 sm:py-3.5 w-32">Aksi</th>
                <th className="px-3 sm:px-4 py-3 sm:py-3.5 w-32">No RMA</th>
                <th className="px-3 sm:px-4 py-3 sm:py-3.5">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400 font-medium">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Memuat log aktivitas...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    Tidak ada catatan aktivitas yang cocok.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="px-3 sm:px-4 py-3 sm:py-3.5 text-xs text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
                      {formatDateTimeIndo(log.created_at)}
                    </td>

                    <td className="px-3 sm:px-4 py-3 sm:py-3.5 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
                        {log.actor}
                      </span>
                    </td>

                    <td className="px-3 sm:px-4 py-3 sm:py-3.5 font-mono text-xs whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded font-bold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-300 text-[10px]">
                        {log.action}
                      </span>
                    </td>

                    <td className="px-3 sm:px-4 py-3 sm:py-3.5 font-mono font-bold whitespace-nowrap">
                      {log.nomor_layanan ? (
                        <Link
                          href={`/tickets/${log.ticket_id || log.nomor_layanan}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                        >
                          {log.nomor_layanan}
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      ) : (
                        '-'
                      )}
                    </td>

                    <td className="px-3 sm:px-4 py-3 sm:py-3.5 text-slate-800 dark:text-slate-200 font-medium">
                      <p>{log.keterangan}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
