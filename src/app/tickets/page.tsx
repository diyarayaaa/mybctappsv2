'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  PlusCircle,
  RefreshCw,
  Printer,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Truck,
  Trash2,
  CheckSquare,
  Square,
  AlertCircle,
  FileSpreadsheet,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Table,
  Columns
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { CustomerReceiptModal } from '@/components/prints/CustomerReceiptModal';
import { ShippingLabelModal } from '@/components/prints/ShippingLabelModal';
import { ImportSpreadsheetModal } from '@/components/modals/ImportSpreadsheetModal';
import { Ticket } from '@/types';
import { useAuth } from '@/components/auth/AuthProvider';
import { useAppConfig } from '@/components/config/AppConfigProvider';
import { DynamicTicketCell, getFieldHeaderAlignClass } from '@/components/tables/DynamicTicketCell';

function TicketsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.get('search') || '';
  const { user } = useAuth();
  const { config, getFieldLabel } = useAppConfig();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedTeknisi, setSelectedTeknisi] = useState('ALL');
  const [selectedJenis, setSelectedJenis] = useState('ALL');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [isLoading, setIsLoading] = useState(true);
  const [tableViewMode, setTableViewMode] = useState<'full' | 'compact'>('full');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Selection state for Bulk Actions
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Modals state
  const [selectedReceiptTicket, setSelectedReceiptTicket] = useState<Ticket | null>(null);
  const [selectedLabelTicket, setSelectedLabelTicket] = useState<Ticket | null>(null);

  // Dynamic Filter Options & Columns from White-Label Config
  const statusOptions = useMemo(
    () => Array.from(new Set([...(config.presets.statusService || []), ...(config.presets.statusGaransi || [])])),
    [config.presets.statusService, config.presets.statusGaransi]
  );
  const teknisiOptions = config.presets.teknisi || [];
  const jenisLayananOptions = config.presets.jenisLayanan || ['SERVICE', 'GARANSI'];

  const activeColumns = useMemo(() => {
    const sorted = [...config.fields].sort((a, b) => a.sort_order - b.sort_order);
    return sorted.filter((f) => {
      if (f.field_key === 'nomor_layanan') return false;
      return tableViewMode === 'full' ? f.show_in_table : f.show_in_compact;
    });
  }, [config.fields, tableViewMode]);

  const noRmaLabel = getFieldLabel('nomor_layanan', 'NO RMA');

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (selectedStatus !== 'ALL') params.append('status', selectedStatus);
      if (selectedTeknisi !== 'ALL') params.append('teknisi', selectedTeknisi);
      if (selectedJenis !== 'ALL') params.append('jenis_layanan', selectedJenis);
      params.append('sortBy', 'nomor_layanan');
      params.append('order', sortOrder);

      const res = await fetch(`/api/tickets?${params.toString()}`);
      const data = await res.json();
      if (!data.error) {
        setTickets(data.tickets || []);
      }
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedStatus, selectedTeknisi, selectedJenis, sortOrder]);

  const sortedTickets = useMemo(() => {
    return [...tickets].sort((a, b) => {
      return sortOrder === 'desc'
        ? b.nomor_layanan.localeCompare(a.nomor_layanan)
        : a.nomor_layanan.localeCompare(b.nomor_layanan);
    });
  }, [tickets, sortOrder]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedStatus, selectedTeknisi, selectedJenis, sortOrder]);

  const totalPages = useMemo(() => {
    if (pageSize === 0) return 1;
    return Math.max(1, Math.ceil(sortedTickets.length / pageSize));
  }, [sortedTickets.length, pageSize]);

  const paginatedTickets = useMemo(() => {
    if (pageSize === 0) return sortedTickets;
    const start = (currentPage - 1) * pageSize;
    return sortedTickets.slice(start, start + pageSize);
  }, [sortedTickets, currentPage, pageSize]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleToggleSelectAll = () => {
    if (selectedTicketIds.length === tickets.length && tickets.length > 0) {
      setSelectedTicketIds([]);
    } else {
      setSelectedTicketIds(tickets.map((t) => t.id));
    }
  };

  const handleToggleSelectTicket = (id: string) => {
    if (selectedTicketIds.includes(id)) {
      setSelectedTicketIds(selectedTicketIds.filter((tId) => tId !== id));
    } else {
      setSelectedTicketIds([...selectedTicketIds, id]);
    }
  };

  const handleExecuteBulkDelete = async () => {
    if (selectedTicketIds.length === 0) return;

    setIsDeletingBulk(true);
    setBulkDeleteError('');

    try {
      const activeActor = user?.nama_lengkap || localStorage.getItem('bct_current_user') || 'Admin Kasir';
      const res = await fetch('/api/tickets/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selectedTicketIds,
          actor: activeActor
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menghapus tiket');
      }

      setIsBulkDeleteModalOpen(false);
      setSelectedTicketIds([]);
      fetchTickets();
    } catch (err) {
      setBulkDeleteError((err as Error).message);
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const isAllSelected = tickets.length > 0 && selectedTicketIds.length === tickets.length;
  const isPartiallySelected = selectedTicketIds.length > 0 && !isAllSelected;

  return (
    <div className="space-y-6 w-full pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Antrean & Riwayat Tiket Servis
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Import Spreadsheet</span>
          </button>

          <Link
            href="/tickets/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold text-white bg-brand hover:bg-brand-hover active:scale-95 shadow-md rounded-xl transition-all self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Buat Tiket Baru</span>
          </Link>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedTicketIds.length > 0 && (
        <div className="p-3 sm:p-4 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 border border-slate-700 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-brand text-white font-black text-xs flex items-center justify-center">
              {selectedTicketIds.length}
            </span>
            <span className="text-xs sm:text-sm font-bold">
              {selectedTicketIds.length} Tiket Dipilih
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedTicketIds([])}
              className="px-3 py-1.5 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
            >
              Batal Pilihan
            </button>

            <button
              type="button"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus {selectedTicketIds.length} Tiket Terpilih</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:outline-hidden font-medium"
            >
              <option value="ALL">-- Semua Status --</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedTeknisi}
              onChange={(e) => setSelectedTeknisi(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:outline-hidden font-medium"
            >
              <option value="ALL">-- Semua Teknisi --</option>
              {teknisiOptions.map((t) => (
                <option key={t} value={t}>
                  Teknisi: {t}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <select
              value={selectedJenis}
              onChange={(e) => setSelectedJenis(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:outline-hidden font-medium"
            >
              <option value="ALL">-- Semua Jenis --</option>
              {jenisLayananOptions.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all shrink-0 cursor-pointer active:scale-95"
              title={sortOrder === 'desc' ? 'Klik untuk urutkan Terlama ke Terbaru' : 'Klik untuk urutkan Terbaru ke Terlama'}
            >
              {sortOrder === 'desc' ? (
                <>
                  <ArrowDownWideNarrow className="w-3.5 h-3.5 text-brand" />
                  <span>Terbaru ⬇</span>
                </>
              ) : (
                <>
                  <ArrowUpNarrowWide className="w-3.5 h-3.5 text-brand" />
                  <span>Terlama ⬆</span>
                </>
              )}
            </button>

            <button
              onClick={fetchTickets}
              className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors shrink-0"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {search && (
          <div className="flex items-center justify-between px-3.5 py-2 bg-brand-soft border border-brand rounded-xl text-xs text-brand animate-in fade-in">
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5" />
              <span>
                Hasil pencarian tiket untuk: <strong className="font-bold text-slate-900 dark:text-white">&ldquo;{search}&rdquo;</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => router.push('/tickets')}
              className="text-xs font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              Hapus Filter Pencarian
            </button>
          </div>
        )}
      </div>

      {/* Dynamic Tickets Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        <div className="px-4 sm:px-5 py-3 bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              title={isAllSelected ? 'Batalkan Semua Pilihan' : 'Pilih Semua Tiket'}
            >
              {isAllSelected ? (
                <CheckSquare className="w-4 h-4 text-brand" />
              ) : isPartiallySelected ? (
                <div className="w-4 h-4 rounded border-2 border-brand bg-brand-soft flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-brand" />
                </div>
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
            </button>
            <span>Menampilkan {sortedTickets.length} Tiket</span>
            {selectedTicketIds.length > 0 && (
              <span className="text-brand font-bold ml-2">
                ({selectedTicketIds.length} terpilih)
              </span>
            )}
          </div>

          <div className="flex items-center bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-300 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setTableViewMode('full')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                tableViewMode === 'full'
                  ? 'bg-brand text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Lengkap ({activeColumns.length + 1})</span>
            </button>
            <button
              type="button"
              onClick={() => setTableViewMode('compact')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                tableViewMode === 'compact'
                  ? 'bg-brand text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Ringkas</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-separate border-spacing-0">
            <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="w-12 min-w-[48px] max-w-[48px] px-2 py-3 sm:py-3.5 text-center sticky left-0 z-20 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    aria-label="Pilih Semua Tiket"
                  />
                </th>
                <th
                  onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                  className="px-3 sm:px-4 py-3 sm:py-3.5 cursor-pointer select-none hover:text-slate-900 dark:hover:text-white transition-colors sticky left-12 z-20 bg-slate-50 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-800"
                >
                  <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    <span>{noRmaLabel}</span>
                    {sortOrder === 'desc' ? (
                      <ArrowDownWideNarrow className="w-3.5 h-3.5 text-brand" />
                    ) : (
                      <ArrowUpNarrowWide className="w-3.5 h-3.5 text-brand" />
                    )}
                  </div>
                </th>
                {activeColumns.map((col) => (
                  <th
                    key={col.field_key}
                    className={`px-3 py-3.5 whitespace-nowrap border-b border-slate-200 dark:border-slate-800 ${getFieldHeaderAlignClass(col)}`}
                  >
                    {col.label}
                  </th>
                ))}
                <th className="px-3 sm:px-4 py-3 sm:py-3.5 text-right whitespace-nowrap sticky right-0 z-20 bg-slate-50 dark:bg-slate-800 border-l border-b border-slate-200 dark:border-slate-800">
                  AKSI
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={activeColumns.length + 3} className="text-center py-12 text-slate-400 font-medium">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand" />
                    Memuat data tiket servis...
                  </td>
                </tr>
              ) : paginatedTickets.length === 0 ? (
                <tr>
                  <td colSpan={activeColumns.length + 3} className="text-center py-12 text-slate-400">
                    Tidak ada tiket ditemukan dengan filter saat ini.
                  </td>
                </tr>
              ) : (
                paginatedTickets.map((t) => {
                  const isChecked = selectedTicketIds.includes(t.id);
                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors group ${
                        isChecked ? 'bg-blue-50/50 dark:bg-blue-950/30' : ''
                      }`}
                    >
                      <td className="w-12 min-w-[48px] max-w-[48px] px-2 py-3 sm:py-3.5 text-center sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectTicket(t.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          aria-label={`Pilih tiket ${t.nomor_layanan}`}
                        />
                      </td>

                      <td className="px-3 sm:px-4 py-3 sm:py-3.5 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap sticky left-12 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 border-r border-b border-slate-200/60 dark:border-slate-800">
                        <Link
                          href={`/tickets/${t.id}`}
                          className="text-brand hover:underline"
                        >
                          {t.nomor_layanan}
                        </Link>
                      </td>

                      {activeColumns.map((col) => (
                        <DynamicTicketCell key={col.field_key} field={col} ticket={t} />
                      ))}

                      <td className="px-3 sm:px-4 py-3 sm:py-3.5 text-right whitespace-nowrap sticky right-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 border-l border-b border-slate-200/60 dark:border-slate-800">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedReceiptTicket(t)}
                            title="Cetak Tanda Terima Servis"
                            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {t.distributor_vendor && (
                            <button
                              type="button"
                              onClick={() => setSelectedLabelTicket(t)}
                              title="Cetak Label Vendor"
                              className="p-1.5 rounded-lg text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/50 transition-colors"
                            >
                              <Truck className="w-4 h-4" />
                            </button>
                          )}

                          <Link
                            href={`/whatsapp?tab=quick&ticket_id=${t.id}`}
                            title="WhatsApp"
                            className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Link>

                          <Link
                            href={`/tickets/${t.id}`}
                            title="Detail"
                            className="p-1.5 rounded-lg text-brand hover:bg-brand-soft transition-colors"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {sortedTickets.length > 0 && (
          <div className="p-3 sm:p-4 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-3">
              <span>
                Menampilkan{' '}
                <strong className="text-slate-900 dark:text-white">
                  {pageSize === 0 ? 1 : (currentPage - 1) * pageSize + 1}
                </strong>{' '}
                -{' '}
                <strong className="text-slate-900 dark:text-white">
                  {pageSize === 0 ? sortedTickets.length : Math.min(currentPage * pageSize, sortedTickets.length)}
                </strong>{' '}
                dari{' '}
                <strong className="text-slate-900 dark:text-white">{sortedTickets.length}</strong> tiket
              </span>

              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-300 dark:border-slate-700">
                <span>Per halaman:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 text-xs font-semibold focus:outline-hidden"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={0}>Semua</option>
                </select>
              </div>
            </div>

            {pageSize > 0 && totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>

                <div className="px-2 font-bold text-slate-800 dark:text-slate-200">
                  {currentPage} / {totalPages}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bulk Delete Modal */}
      <Modal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        title="Konfirmasi Hapus Beberapa Tiket"
        subtitle={`Anda memilih ${selectedTicketIds.length} tiket untuk dihapus permanen`}
        maxWidth="md"
      >
        <div className="space-y-4">
          {bulkDeleteError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{bulkDeleteError}</span>
            </div>
          )}

          <div className="p-4 bg-rose-50/70 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs sm:text-sm space-y-1">
            <p className="font-bold">Peringatan: Tindakan ini tidak dapat dibatalkan!</p>
            <p className="text-slate-600 dark:text-slate-300 text-xs">
              Sebanyak <strong className="text-rose-600 dark:text-rose-400">{selectedTicketIds.length} tiket</strong> akan dihapus dari sistem database.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsBulkDeleteModalOpen(false)}
              disabled={isDeletingBulk}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleExecuteBulkDelete}
              disabled={isDeletingBulk}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/30 transition-all disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isDeletingBulk ? 'Menghapus...' : `Ya, Hapus ${selectedTicketIds.length} Tiket`}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Modals */}
      <ImportSpreadsheetModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => fetchTickets()}
      />

      <CustomerReceiptModal
        isOpen={!!selectedReceiptTicket}
        onClose={() => setSelectedReceiptTicket(null)}
        ticket={selectedReceiptTicket}
      />

      {selectedLabelTicket && (
        <ShippingLabelModal
          isOpen={!!selectedLabelTicket}
          onClose={() => setSelectedLabelTicket(null)}
          vendorName={selectedLabelTicket.distributor_vendor || ''}
          noSuratJalan={selectedLabelTicket.no_surat_jalan || undefined}
          tickets={[selectedLabelTicket]}
        />
      )}
    </div>
  );
}

export default function TicketsPage() {
  return (
    <Suspense fallback={null}>
      <TicketsContent />
    </Suspense>
  );
}
