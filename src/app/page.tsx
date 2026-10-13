'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Wrench,
  Clock,
  CheckCircle2,
  Truck,
  Boxes,
  PlusCircle,
  Search,
  MessageSquare,
  Printer,
  RefreshCw,
  ChevronRight,
  Trash2,
  CheckSquare,
  Square,
  AlertCircle,
  PackagePlus,
  CalendarCheck,
  ShieldCheck,
  CheckCheck,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  ChevronLeft,
  Table,
  Columns
} from 'lucide-react';
import { MetricCard } from '@/components/ui/MetricCard';
import { StatusBadge, ServiceTypeBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { CustomerReceiptModal } from '@/components/prints/CustomerReceiptModal';
import { ShippingLabelModal } from '@/components/prints/ShippingLabelModal';
import { Ticket, DashboardStats } from '@/types';
import { formatDateIndo } from '@/lib/whatsapp-formatter';
import { useAuth } from '@/components/auth/AuthProvider';
import { useTheme } from '@/components/theme/ThemeProvider';

type FilterTab =
  | 'all'
  | 'masuk_hari_ini'
  | 'service_on_progress'
  | 'barang_di_vendor'
  | 'garansi_minggu_ini'
  | 'garansi_belum_dikirim'
  | 'barang_belum_diambil'
  | 'garansi_selesai'
  | 'service_selesai'
  | 'on_progress'
  | 'waiting_vendor'
  | 'ready_pickup'
  | 'internal_stock';

export default function DashboardPage() {
  const { user } = useAuth();
  const { isSidebarPinned } = useTheme();
  const [stats, setStats] = useState<DashboardStats>({
    barangMasukHariIni: 0,
    serviceOnProgress: 0,
    barangDiVendor: 0,
    garansiMasukMingguIni: 0,
    garansiBelumDikirim: 0,
    barangBelumDiambil: 0,
    garansiSelesai: 0,
    serviceSelesai: 0,
    totalTiket: 0
  });

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [isLoading, setIsLoading] = useState(true);
  const [tableViewMode, setTableViewMode] = useState<'full' | 'compact'>('full');

  const formatRupiah = (val?: number | null) => {
    if (val === undefined || val === null || val === 0) return '-';
    return 'Rp ' + Number(val).toLocaleString('id-ID');
  };

  const formatKelengkapan = (val?: string[] | string | null) => {
    if (!val) return '-';
    if (Array.isArray(val)) {
      return val.length > 0 ? val.join(', ') : '-';
    }
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.length > 0 ? parsed.join(', ') : '-';
    } catch {}
    return String(val);
  };


  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Selection state for Bulk Delete
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState('');

  // Modals state
  const [selectedReceiptTicket, setSelectedReceiptTicket] = useState<Ticket | null>(null);
  const [selectedLabelTicket, setSelectedLabelTicket] = useState<Ticket | null>(null);

  // Fetch Dashboard Stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      if (!data.error) setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, []);

  // Fetch Tickets based on tab & search
  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab !== 'all') params.append('tab', activeTab);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      params.append('sortBy', 'nomor_layanan');
      params.append('order', sortOrder);

      const res = await fetch(`/api/tickets?${params.toString()}`);
      const data = await res.json();
      if (!data.error) setTickets(data.tickets || []);
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, searchQuery, sortOrder]);

  const sortedTickets = useMemo(() => {
    return [...tickets].sort((a, b) => {
      return sortOrder === 'desc'
        ? b.nomor_layanan.localeCompare(a.nomor_layanan)
        : a.nomor_layanan.localeCompare(b.nomor_layanan);
    });
  }, [tickets, sortOrder]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, sortOrder]);

  // Paginated tickets for smooth rendering
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
    fetchStats();
    fetchTickets();
  }, [fetchStats, fetchTickets]);

  // Selection Handlers
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
          ticketIds: selectedTicketIds,
          actor: activeActor
        })
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setBulkDeleteError(data.error || 'Gagal menghapus tiket yang dipilih');
        return;
      }

      // Success
      setSelectedTicketIds([]);
      setIsBulkDeleteModalOpen(false);
      fetchStats();
      fetchTickets();
    } catch (err: unknown) {
      setBulkDeleteError((err as Error).message || 'Terjadi kesalahan sistem');
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const isAllSelected = tickets.length > 0 && selectedTicketIds.length === tickets.length;
  const isPartiallySelected = selectedTicketIds.length > 0 && !isAllSelected;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 8 Metric KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
        {/* 1. MASUK HARI INI */}
        <MetricCard
          title="Masuk Hari Ini"
          value={stats.barangMasukHariIni}
          icon={PackagePlus}
          colorScheme="sky"
          onClick={() => setActiveTab(activeTab === 'masuk_hari_ini' ? 'all' : 'masuk_hari_ini')}
          isActive={activeTab === 'masuk_hari_ini'}
        />

        {/* 2. SERVICE ON PROGRES */}
        <MetricCard
          title="Service On Progres"
          value={stats.serviceOnProgress}
          icon={Wrench}
          colorScheme="amber"
          onClick={() => setActiveTab(activeTab === 'service_on_progress' ? 'all' : 'service_on_progress')}
          isActive={activeTab === 'service_on_progress'}
        />

        {/* 3. BARANG DI VENDOR */}
        <MetricCard
          title="Barang di Vendor"
          value={stats.barangDiVendor}
          icon={Truck}
          colorScheme="purple"
          onClick={() => setActiveTab(activeTab === 'barang_di_vendor' ? 'all' : 'barang_di_vendor')}
          isActive={activeTab === 'barang_di_vendor'}
        />

        {/* 4. GARANSI MASUK MINGGU INI */}
        <MetricCard
          title="Garansi Masuk"
          value={stats.garansiMasukMingguIni}
          icon={CalendarCheck}
          colorScheme="indigo"
          onClick={() => setActiveTab(activeTab === 'garansi_minggu_ini' ? 'all' : 'garansi_minggu_ini')}
          isActive={activeTab === 'garansi_minggu_ini'}
        />

        {/* 5. GARANSI BELUM DIKIRIM */}
        <MetricCard
          title="Garansi Blm Kirim"
          value={stats.garansiBelumDikirim}
          icon={Clock}
          colorScheme="rose"
          onClick={() => setActiveTab(activeTab === 'garansi_belum_dikirim' ? 'all' : 'garansi_belum_dikirim')}
          isActive={activeTab === 'garansi_belum_dikirim'}
        />

        {/* 6. BARANG BELUM DIAMBIL */}
        <MetricCard
          title="Barang Blm Diambil"
          value={stats.barangBelumDiambil}
          icon={AlertCircle}
          colorScheme="emerald"
          onClick={() => setActiveTab(activeTab === 'barang_belum_diambil' ? 'all' : 'barang_belum_diambil')}
          isActive={activeTab === 'barang_belum_diambil'}
        />

        {/* 7. GARANSI SELESAI */}
        <MetricCard
          title="Garansi Selesai"
          value={stats.garansiSelesai}
          icon={ShieldCheck}
          colorScheme="teal"
          onClick={() => setActiveTab(activeTab === 'garansi_selesai' ? 'all' : 'garansi_selesai')}
          isActive={activeTab === 'garansi_selesai'}
        />

        {/* 8. SERVICE SELESAI */}
        <MetricCard
          title="Service Selesai"
          value={stats.serviceSelesai}
          icon={CheckCheck}
          colorScheme="blue"
          onClick={() => setActiveTab(activeTab === 'service_selesai' ? 'all' : 'service_selesai')}
          isActive={activeTab === 'service_selesai'}
        />
      </div>



      {/* Floating / Sticky Bulk Action Bar */}
      {selectedTicketIds.length > 0 && (
        <div className="p-3 sm:p-4 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 border border-slate-700 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-blue-500 text-white font-black text-xs flex items-center justify-center">
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

      {/* Main Active Queue Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        {/* Active Filter Indicator */}
        {activeTab !== 'all' && (
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Filter aktif: <strong className="text-slate-900 dark:text-white capitalize">{activeTab.replace(/_/g, ' ')}</strong> ({sortedTickets.length} tiket)
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Tampilkan Semua Tiket
            </button>
          </div>
        )}

        {/* Queue Control Header (Select All, Title, Mode Toggle, Refresh, Penerimaan) */}
        <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          {/* Left: Select All & Antrean Count */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              title={isAllSelected ? 'Batalkan Semua Pilihan' : 'Pilih Semua Tiket'}
            >
              {isAllSelected ? (
                <CheckSquare className="w-4 h-4 text-blue-500" />
              ) : isPartiallySelected ? (
                <div className="w-4 h-4 rounded border-2 border-blue-500 bg-blue-500/20 flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-blue-500" />
                </div>
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
            </button>
            <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tracking-tight">
              Antrean
            </span>
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
              {sortedTickets.length} Tiket
            </span>
            {selectedTicketIds.length > 0 && (
              <span className="text-xs text-blue-600 dark:text-blue-400 font-bold ml-1">
                ({selectedTicketIds.length} terpilih)
              </span>
            )}
          </div>

          {/* Right: View Mode Toggle + Refresh + Penerimaan */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setTableViewMode('full')}
                className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  tableViewMode === 'full'
                    ? 'bg-blue-500 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Tampilkan 25 kolom lengkap sesuai database / spreadsheet"
              >
                <Table className="w-3.5 h-3.5" />
                <span>25 Kolom DB</span>
              </button>
              <button
                type="button"
                onClick={() => setTableViewMode('compact')}
                className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  tableViewMode === 'compact'
                    ? 'bg-blue-500 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Tampilkan 8 kolom ringkas"
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Ringkas</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                fetchStats();
                fetchTickets();
              }}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              title="Refresh Data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <Link
              href="/tickets/new"
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 active:scale-95 shadow-xs rounded-xl transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Penerimaan</span>
            </Link>
          </div>
        </div>

        {/* Table Content with unified horizontal & vertical scroll */}
        <div className="overflow-auto max-h-[calc(100vh-230px)] min-h-[360px]">
          <table className="w-full text-left text-xs sm:text-sm border-separate border-spacing-0">
            <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
              {tableViewMode === 'full' ? (
                <tr>
                  <th className="w-12 min-w-[48px] max-w-[48px] px-2 py-3 sm:py-3.5 text-center sticky left-0 top-0 z-30 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-xs">
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
                    className="px-3 sm:px-4 py-3 sm:py-3.5 cursor-pointer select-none hover:text-slate-900 dark:hover:text-white transition-colors sticky left-12 top-0 z-30 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 shadow-xs"
                    title="Klik untuk mengurutkan No RMA"
                  >
                    <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      <span>NO RMA</span>
                      {sortOrder === 'desc' ? (
                        <ArrowDownWideNarrow className="w-3.5 h-3.5 text-blue-500" />
                      ) : (
                        <ArrowUpNarrowWide className="w-3.5 h-3.5 text-blue-500" />
                      )}
                    </div>
                  </th>
                  <th className="px-3 py-3.5 whitespace-nowrap sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-xs">TGL MASUK</th>
                  <th className="px-3 py-3.5 whitespace-nowrap sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-xs">JENIS RMA</th>
                  <th className="px-3 py-3.5 whitespace-nowrap sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-xs">NAMA CUST</th>
                  <th className="px-3 py-3.5 whitespace-nowrap sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-xs">NO HP</th>
                  <th className="px-3 py-3.5 whitespace-nowrap sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-xs">JENIS BARANG</th>
                  <th className="px-3 py-3.5 whitespace-nowrap sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-xs">NAMA BARANG</th>
                  <th className="px-3 py-3.5 whitespace-nowrap sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-xs">SERIAL NUMBER</th>
                  <th className="px-3 py-3.5 whitespace-nowrap sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-xs">KELUHAN</th>
                  <th className="px-3 py-3.5 whitespace-nowrap sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-xs">KELENGKAPAN</th>
                  <th className="px-3 py-3.5 whitespace-nowrap sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-xs">ESTIMASI SELESAI</th>
                  <th className="px-3 py-3.5 whitespace-nowrap text-right sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-xs">ESTIMASI BIAYA</th>
                  <th className="px-3 py-3.5 whitespace-nowrap text-right sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-xs">DP</th>
                  <th className="px-3 py-3.5 whitespace-nowrap text-right sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-xs">SISA</th>
                  <th className="px-3 py-3.5 whitespace-nowrap text-center sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-xs">TEKNISI</th>
                  <th className="px-3 py-3.5 whitespace-nowrap text-center sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-xs">STATUS</th>
                  <th className="px-3 py-3.5 whitespace-nowrap sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-xs">DISTRIBUTOR</th>
                  <th className="px-3 py-3.5 whitespace-nowrap sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-xs">TGL KIRIM KE DISTRI</th>
                  <th className="px-3 py-3.5 whitespace-nowrap sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-xs">TGL DATANG DARI DISTRI</th>
                  <th className="px-3 py-3.5 whitespace-nowrap sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-xs">TGL DIAMBIL CUST</th>
                  <th className="px-3 py-3.5 whitespace-nowrap sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-xs">HASIL GARANSI</th>
                  <th className="px-3 py-3.5 whitespace-nowrap sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-xs">SN BARU</th>
                  <th className="px-3 py-3.5 whitespace-nowrap sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-xs">CATATAN</th>
                  <th className="px-3 py-3.5 whitespace-nowrap text-right sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-xs">TOTAL BIAYA AKHIR</th>
                  <th className="px-3 py-3.5 whitespace-nowrap sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-xs">NO SURAT JALAN</th>
                  <th className="px-3 sm:px-4 py-3 sm:py-3.5 text-right whitespace-nowrap sticky right-0 top-0 z-30 bg-slate-100 dark:bg-slate-800 border-l border-b border-slate-200 dark:border-slate-700 shadow-xs">AKSI</th>
                </tr>
              ) : (
                <tr>
                  <th className="w-12 min-w-[48px] max-w-[48px] px-2 py-3 sm:py-3.5 text-center sticky left-0 top-0 z-30 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-xs">
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
                    className="px-3 sm:px-4 py-3 sm:py-3.5 cursor-pointer select-none hover:text-slate-900 dark:hover:text-white transition-colors sticky left-12 top-0 z-30 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 shadow-xs"
                    title="Klik untuk mengurutkan No RMA"
                  >
                    <div className="inline-flex items-center gap-1.5">
                      <span>No RMA</span>
                      {sortOrder === 'desc' ? (
                        <ArrowDownWideNarrow className="w-3.5 h-3.5 text-blue-500" />
                      ) : (
                        <ArrowUpNarrowWide className="w-3.5 h-3.5 text-blue-500" />
                      )}
                    </div>
                  </th>
                  <th className="px-3 sm:px-4 py-3 sm:py-3.5 sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-xs">Tanggal</th>
                  <th className="px-3 sm:px-4 py-3 sm:py-3.5 sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-xs">Customer</th>
                  <th className="px-3 sm:px-4 py-3 sm:py-3.5 sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-xs">Perangkat & SN</th>
                  <th className="px-3 sm:px-4 py-3 sm:py-3.5 sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-xs">Keluhan</th>
                  <th className="px-3 sm:px-4 py-3 sm:py-3.5 sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-xs">Teknisi</th>
                  <th className="px-3 sm:px-4 py-3 sm:py-3.5 sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-xs">Status</th>
                  <th className="px-3 sm:px-4 py-3 sm:py-3.5 text-right sticky right-0 top-0 z-30 bg-slate-100 dark:bg-slate-800 border-l border-b border-slate-200 dark:border-slate-700 shadow-xs">Aksi</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={tableViewMode === 'full' ? 27 : 9} className="text-center py-12 text-slate-400 font-medium">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Memuat antrean tiket...
                  </td>
                </tr>
              ) : paginatedTickets.length === 0 ? (
                <tr>
                  <td colSpan={tableViewMode === 'full' ? 27 : 9} className="text-center py-12 text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <p className="font-semibold text-slate-600 dark:text-slate-300">Tidak ada tiket di kategori ini</p>
                      <p className="text-xs text-slate-400">Silakan ubah filter pencarian atau buat tiket baru.</p>
                      <Link
                        href="/tickets/new"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-lg font-bold text-xs hover:bg-blue-100 dark:hover:bg-blue-900/50 mt-2"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        Buat Tiket Baru
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedTickets.map((t) => {
                  const isStock =
                    t.nama_customer.toUpperCase().includes('STOCK BCT') ||
                    t.nama_customer.toUpperCase().includes('GHITP');
                  const isChecked = selectedTicketIds.includes(t.id);

                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors group ${
                        isChecked ? 'bg-blue-50/50 dark:bg-blue-950/30' : ''
                      }`}
                    >
{tableViewMode === 'full' ? (
                        <>
                          {/* 1. Checkbox */}
                          <td className="w-12 min-w-[48px] max-w-[48px] px-2 py-3 sm:py-3.5 text-center sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleSelectTicket(t.id)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              aria-label={`Pilih tiket ${t.nomor_layanan}`}
                            />
                          </td>

                          {/* 2. NO RMA */}
                          <td className="px-3 sm:px-4 py-3 sm:py-3.5 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap sticky left-12 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 border-r border-b border-slate-200/60 dark:border-slate-800">
                            <Link
                              href={`/tickets/${t.id}`}
                              className="text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              {t.nomor_layanan}
                            </Link>
                          </td>

                          {/* 3. TGL MASUK */}
                          <td className="px-3 py-3 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap font-mono">
                            {formatDateIndo(t.tanggal_masuk)}
                          </td>

                          {/* 4. JENIS RMA */}
                          <td className="px-3 py-3 whitespace-nowrap">
                            <ServiceTypeBadge type={t.jenis_layanan} />
                          </td>

                          {/* 5. NAMA CUST */}
                          <td className="px-3 py-3 whitespace-nowrap font-medium text-slate-900 dark:text-white">
                            <div className="flex items-center gap-1.5">
                              <span className="max-w-[140px] truncate" title={t.nama_customer}>{t.nama_customer}</span>
                              {isStock && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-extrabold shrink-0">
                                  STOK
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 6. NO HP */}
                          <td className="px-3 py-3 text-xs font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {t.no_hp && t.no_hp !== '-' ? (
                              <a
                                href={`https://wa.me/${t.no_hp.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline flex items-center gap-1"
                                title="Chat WhatsApp"
                              >
                                <span>{t.no_hp}</span>
                              </a>
                            ) : (
                              '-'
                            )}
                          </td>

                          {/* 7. JENIS BARANG */}
                          <td className="px-3 py-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap font-medium">
                            {t.jenis_barang || '-'}
                          </td>

                          {/* 8. NAMA BARANG */}
                          <td className="px-3 py-3 text-xs font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap max-w-[180px] truncate" title={t.nama_barang}>
                            {t.nama_barang}
                          </td>

                          {/* 9. SERIAL NUMBER */}
                          <td className="px-3 py-3 text-xs font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {t.serial_number || '-'}
                          </td>

                          {/* 10. KELUHAN */}
                          <td className="px-3 py-3 text-xs text-slate-600 dark:text-slate-300 max-w-[200px] truncate" title={t.keluhan}>
                            {t.keluhan}
                          </td>

                          {/* 11. KELENGKAPAN */}
                          <td className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400 max-w-[160px] truncate" title={formatKelengkapan(t.kelengkapan)}>
                            {formatKelengkapan(t.kelengkapan)}
                          </td>

                          {/* 12. ESTIMASI SELESAI */}
                          <td className="px-3 py-3 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap font-mono">
                            {formatDateIndo(t.estimasi_selesai)}
                          </td>

                          {/* 13. ESTIMASI BIAYA */}
                          <td className="px-3 py-3 text-xs font-mono text-right text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {formatRupiah(t.estimasi_biaya)}
                          </td>

                          {/* 14. DP */}
                          <td className="px-3 py-3 text-xs font-mono text-right text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {formatRupiah(t.dp)}
                          </td>

                          {/* 15. SISA */}
                          <td className="px-3 py-3 text-xs font-mono text-right font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                            {formatRupiah(t.sisa)}
                          </td>

                          {/* 16. TEKNISI */}
                          <td className="px-3 py-3 text-center whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
                              {t.teknisi}
                            </span>
                          </td>

                          {/* 17. STATUS */}
                          <td className="px-3 py-3 whitespace-nowrap text-center">
                            <StatusBadge status={t.status} size="sm" />
                          </td>

                          {/* 18. DISTRIBUTOR */}
                          <td className="px-3 py-3 text-xs text-purple-700 dark:text-purple-300 whitespace-nowrap font-medium max-w-[150px] truncate" title={t.distributor_vendor || ''}>
                            {t.distributor_vendor || '-'}
                          </td>

                          {/* 19. TGL KIRIM KE DISTRI */}
                          <td className="px-3 py-3 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap font-mono">
                            {formatDateIndo(t.tgl_kirim_vendor)}
                          </td>

                          {/* 20. TGL DATANG DARI DISTRI */}
                          <td className="px-3 py-3 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap font-mono">
                            {formatDateIndo(t.tgl_datang_vendor)}
                          </td>

                          {/* 21. TGL DIAMBIL CUST */}
                          <td className="px-3 py-3 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap font-mono">
                            {formatDateIndo(t.tgl_diambil_customer)}
                          </td>

                          {/* 22. HASIL GARANSI */}
                          <td className="px-3 py-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap font-medium">
                            {t.hasil_service_garansi || '-'}
                          </td>

                          {/* 23. SN BARU */}
                          <td className="px-3 py-3 text-xs font-mono text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            {t.sn_baru || '-'}
                          </td>

                          {/* 24. CATATAN */}
                          <td className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400 max-w-[180px] truncate" title={t.catatan || ''}>
                            {t.catatan || '-'}
                          </td>

                          {/* 25. TOTAL BIAYA AKHIR */}
                          <td className="px-3 py-3 text-xs font-mono text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            {formatRupiah(t.biaya_akhir)}
                          </td>

                          {/* 26. NO SURAT JALAN */}
                          <td className="px-3 py-3 text-xs font-mono text-blue-600 dark:text-blue-400 whitespace-nowrap">
                            {t.no_surat_jalan || '-'}
                          </td>

                          {/* 27. AKSI */}
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
                                className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </Link>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          {/* Checkbox per baris */}
                          <td className="w-12 min-w-[48px] max-w-[48px] px-2 py-3 sm:py-3.5 text-center sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleSelectTicket(t.id)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              aria-label={`Pilih tiket ${t.nomor_layanan}`}
                            />
                          </td>

                          {/* No RMA & Jenis */}
                          <td className="px-3 sm:px-4 py-3 sm:py-3.5 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap sticky left-12 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 border-r border-b border-slate-200/60 dark:border-slate-800">
                            <Link
                              href={`/tickets/${t.id}`}
                              className="text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              {t.nomor_layanan}
                            </Link>
                            <div className="mt-0.5">
                              <ServiceTypeBadge type={t.jenis_layanan} />
                            </div>
                          </td>

                          {/* Tanggal Masuk */}
                          <td className="px-3 sm:px-4 py-3 sm:py-3.5 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {formatDateIndo(t.tanggal_masuk)}
                          </td>

                          {/* Customer */}
                          <td className="px-3 sm:px-4 py-3 sm:py-3.5">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                              <span className="truncate max-w-[140px]">{t.nama_customer}</span>
                              {isStock && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-extrabold shrink-0">
                                  STOK
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">{t.no_hp}</div>
                          </td>

                          {/* Perangkat & SN */}
                          <td className="px-3 sm:px-4 py-3 sm:py-3.5 min-w-[130px]">
                            <div className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                              {t.nama_barang}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400">SN: {t.serial_number}</div>
                          </td>

                          {/* Keluhan */}
                          <td className="px-3 sm:px-4 py-3 sm:py-3.5 max-w-[180px]">
                            <p className="line-clamp-2 text-xs text-slate-600 dark:text-slate-300" title={t.keluhan}>
                              {t.keluhan}
                            </p>
                            {t.distributor_vendor && (
                              <span className="inline-block text-[9px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-1 py-0.5 rounded mt-0.5 truncate max-w-[160px]">
                                {t.distributor_vendor}
                              </span>
                            )}
                          </td>

                          {/* Teknisi */}
                          <td className="px-3 sm:px-4 py-3 sm:py-3.5 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
                              {t.teknisi}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-3 sm:px-4 py-3 sm:py-3.5 whitespace-nowrap">
                            <StatusBadge status={t.status} size="sm" />
                          </td>

                          {/* Aksi Cepat */}
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
                                className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </Link>
                            </div>
                          </td>
                        </>
                      )}
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

      {/* Confirmation Modal for Bulk Delete */}
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
              Sebanyak <strong className="text-rose-600 dark:text-rose-400">{selectedTicketIds.length} tiket</strong> beserta riwayat detailnya akan dihapus dari sistem database.
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

      {/* Print Modals */}
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
