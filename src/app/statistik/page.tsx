'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Award,
  Layers,
  Wrench,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Calendar,
  Download,
  RefreshCw,
  Search,
  Filter,
  DollarSign,
  Laptop,
  Monitor,
  Cpu,
  Package,
  HardDrive,
  Users,
  ChevronRight,
  Sparkles,
  Info,
  Maximize2,
  ShieldAlert
} from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useAuth } from '@/components/auth/AuthProvider';

interface SummaryData {
  totalTickets: number;
  totalCompleted: number;
  totalInProgress: number;
  totalFailed: number;
  completionRate: number;
  successRate: number;
  totalRevenue: number;
  avgRevenue: number;
  activeWarrantyRMA: number;
  activeRegularService: number;
  serviceCount: number;
  garansiCount: number;
}

interface MonthlyTrendItem {
  month: string;
  label: string;
  shortLabel: string;
  year: string;
  masuk: number;
  selesai: number;
  gagal: number;
  omset: number;
  growth: number;
  successRate: number;
}

interface StatusBreakdownItem {
  status: string;
  count: number;
  percentage: number;
  colorBg: string;
  colorFill: string;
  colorBorder: string;
}

interface CategoryBreakdownItem {
  category: string;
  count: number;
  percentage: number;
  serviceCount: number;
  garansiCount: number;
  selesaiCount: number;
  omset: number;
}

interface TechnicianStatItem {
  rank: number;
  name: string;
  total: number;
  selesai: number;
  proses: number;
  gagal: number;
  omset: number;
  avgBiaya: number;
  successRate: number;
}

interface VendorStatItem {
  vendor: string;
  total: number;
  selesai: number;
  proses: number;
  gagal: number;
  successRate: number;
}

interface PeriodInfo {
  title: string;
  isDaily: boolean;
  mode: string;
  selectedMonth?: string;
  selectedYear?: string;
}

interface AvailableMonth {
  key: string;
  label: string;
  year: string;
  monthNum: string;
}

interface AnalyticsPayload {
  periodInfo: PeriodInfo;
  availableMonths: AvailableMonth[];
  availableYears: string[];
  summary: SummaryData;
  monthlyTrend: MonthlyTrendItem[];
  statusBreakdown: StatusBreakdownItem[];
  categoryBreakdown: CategoryBreakdownItem[];
  technicianStats: TechnicianStatItem[];
  vendorStats: VendorStatItem[];
}

function formatRupiah(num?: number | null): string {
  if (num === undefined || num === null || isNaN(num)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(num);
}

function formatNumber(num?: number | null): string {
  if (num === undefined || num === null || isNaN(num)) return '0';
  return new Intl.NumberFormat('id-ID').format(num);
}

// Catmull-Rom to Cubic Bézier path generator for smooth stock curves
function generateSmoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const prev = points[i - 1] || current;
    const afterNext = points[i + 2] || next;

    const cp1x = current.x + (next.x - prev.x) / 6;
    const cp1y = current.y + (next.y - prev.y) / 6;
    const cp2x = next.x - (afterNext.x - current.x) / 6;
    const cp2y = next.y - (afterNext.y - current.y) / 6;

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${next.x.toFixed(1)} ${next.y.toFixed(1)}`;
  }

  return path;
}

export default function DashboardStatistikPage() {
  const { resolvedTheme } = useTheme();
  const { user, isLoading: isAuthLoading } = useAuth();

  // Period filter states (All, Year, Month, 7d, Today, Custom)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('2026-08-01');
  const [customEndDate, setCustomEndDate] = useState<string>('2026-08-31');
  const [serviceFilter, setServiceFilter] = useState<'ALL' | 'SERVICE' | 'GARANSI'>('ALL');

  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Stock Chart UI states
  const [chartMetric, setChartMetric] = useState<'volume' | 'omset'>('volume');
  const [chartStyle, setChartStyle] = useState<'area' | 'candle'>('area');
  const [hoveredMonthIndex, setHoveredMonthIndex] = useState<number | null>(null);

  // Table active tab
  const [activeTableTab, setActiveTableTab] = useState<'technicians' | 'vendors' | 'monthly'>('technicians');
  const [tableSearch, setTableSearch] = useState('');

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      let url = `/api/analytics?period=${encodeURIComponent(selectedPeriod)}&service=${serviceFilter}`;
      if (selectedPeriod === 'custom' && customStartDate && customEndDate) {
        url += `&startDate=${encodeURIComponent(customStartDate)}&endDate=${encodeURIComponent(customEndDate)}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok || !json.success) {
        setErrorMessage(json.error || 'Gagal memuat data analitik.');
      } else {
        setData(json.data);
      }
    } catch (err) {
      console.error('Fetch analytics error:', err);
      setErrorMessage('Terjadi kesalahan jaringan saat memuat data statistik.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthLoading) return;
    if (user?.role !== 'ADMIN') {
      setIsLoading(false);
      return;
    }
    if (selectedPeriod === 'custom' && (!customStartDate || !customEndDate)) {
      return;
    }
    fetchAnalytics();
  }, [selectedPeriod, serviceFilter, user, isAuthLoading]);

  // Export CSV helper
  const handleExportCSV = () => {
    if (!data) return;
    const isDaily = data.periodInfo?.isDaily;
    let csv = `=== LAPORAN STATISTIK ${data.periodInfo?.title.toUpperCase()} BEST COMPUTEL ===\r\n`;
    csv += `${isDaily ? 'Tanggal' : 'Bulan'},Tiket Masuk,Tiket Selesai,Tiket Gagal,Success Rate (%),Omset (Rp)\r\n`;
    for (const m of data.monthlyTrend) {
      csv += `"${m.label}",${m.masuk},${m.selesai},${m.gagal},${m.successRate}%,${m.omset}\r\n`;
    }

    csv += '\r\n=== KINERJA TEKNISI ===\r\n';
    csv += 'Peringkat,Nama Teknisi,Total Unit,Selesai,Dalam Proses,Gagal,Success Rate (%),Total Omset (Rp)\r\n';
    for (const t of data.technicianStats) {
      csv += `#${t.rank},"${t.name}",${t.total},${t.selesai},${t.proses},${t.gagal},${t.successRate}%,${t.omset}\r\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Statistik_Pelayanan_BCT_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Stock Chart calculations
  const stockChartData = useMemo(() => {
    if (!data || !data.monthlyTrend || data.monthlyTrend.length === 0) return null;

    const months = data.monthlyTrend;
    const values = months.map(m => (chartMetric === 'volume' ? m.masuk : m.omset));
    const rawMax = Math.max(...values, 1);

    // Headroom 15% agar puncak kurva tidak menyentuh batas atas
    let maxValue = rawMax;
    if (chartMetric === 'volume') {
      maxValue = Math.max(10, Math.ceil(rawMax * 1.15));
    } else {
      maxValue = Math.max(1000000, Math.ceil((rawMax * 1.15) / 1000000) * 1000000);
    }
    const minValue = 0;

    // SVG coordinate parameters (Tinggi 440px agar kurva tegak, bergelombang dinamis, dan tidak gepeng)
    const svgWidth = 1000;
    const svgHeight = 440;

    // Jika data sedikit (misal 3 atau 4 bulan), beri padding horizontal lebih agar titik tidak melebar rata
    const paddingX = months.length <= 4 ? 140 : 65;
    const curveTopY = 45;
    const curveBottomY = 300;
    const curveHeight = curveBottomY - curveTopY; // 255px vertical dynamic range

    const volumeTopY = 330;
    const volumeBottomY = 390;
    const maxVolumeBarHeight = volumeBottomY - volumeTopY; // 60px dedicated volume pane

    const chartWidth = svgWidth - paddingX * 2;
    const stepX = months.length > 1 ? chartWidth / (months.length - 1) : chartWidth / 2;

    const points = months.map((m, i) => {
      const val = chartMetric === 'volume' ? m.masuk : m.omset;
      const x = paddingX + i * stepX;
      // Invert Y coordinate dengan travel vertikal 255px
      const normalized = (val - minValue) / (maxValue - minValue || 1);
      const y = curveBottomY - normalized * curveHeight;
      return { x, y, value: val, month: m };
    });

    const linePath = generateSmoothPath(points);
    const areaPath = points.length > 0
      ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${curveBottomY} L ${points[0].x.toFixed(1)} ${curveBottomY} Z`
      : '';

    // Calculate Moving Average (SMA 3-period)
    const smaPoints = points.map((p, idx) => {
      const start = Math.max(0, idx - 2);
      const subset = points.slice(start, idx + 1);
      const avgY = subset.reduce((acc, curr) => acc + curr.y, 0) / subset.length;
      return { x: p.x, y: avgY };
    });
    const smaPath = generateSmoothPath(smaPoints);

    // Peak and Low
    let peakIndex = 0;
    let lowIndex = 0;
    values.forEach((v, idx) => {
      if (v > values[peakIndex]) peakIndex = idx;
      if (v < values[lowIndex]) lowIndex = idx;
    });

    return {
      svgWidth,
      svgHeight,
      paddingX,
      curveTopY,
      curveBottomY,
      curveHeight,
      volumeTopY,
      volumeBottomY,
      maxVolumeBarHeight,
      maxValue,
      points,
      linePath,
      areaPath,
      smaPath,
      peakPoint: points[peakIndex],
      lowPoint: points[lowIndex]
    };
  }, [data, chartMetric]);

  // Filtered Tables
  const filteredTechnicians = useMemo(() => {
    if (!data) return [];
    if (!tableSearch.trim()) return data.technicianStats;
    const q = tableSearch.toLowerCase();
    return data.technicianStats.filter(t => t.name.toLowerCase().includes(q));
  }, [data, tableSearch]);

  const filteredVendors = useMemo(() => {
    if (!data) return [];
    if (!tableSearch.trim()) return data.vendorStats;
    const q = tableSearch.toLowerCase();
    return data.vendorStats.filter(v => v.vendor.toLowerCase().includes(q));
  }, [data, tableSearch]);

  if (isAuthLoading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Memverifikasi hak akses Administrator...</span>
        </div>
      </div>
    );
  }

  if (user?.role !== 'ADMIN') {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 sm:p-10 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-5 animate-in fade-in">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-500 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Akses Ditolak: Khusus Administrator
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Halaman <strong>Dashboard Statistik & Analitik</strong> ini hanya dapat diakses oleh akun dengan Role <strong>ADMIN</strong>.
            {user ? (
              <> Akun Anda saat ini (<strong>{user.nama_lengkap}</strong>) memiliki hak akses <strong>{user.role}</strong>.</>
            ) : (
              <> Silakan login dengan akun Administrator terlebih dahulu.</>
            )}
          </p>
        </div>
        <div className="pt-2 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 cursor-pointer"
          >
            <span>Kembali ke Dashboard Utama</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col gap-4 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Dashboard Statistik & Analitik Pelayanan
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Analisis komprehensif performa servis, kurva tren finansial, produktivitas teknisi, dan rekap vendor RMA.
              </p>
              {/* Active Period Badge */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80">
                  <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Periode Aktif: {data?.periodInfo?.title || 'Semua Waktu'}
                </span>
              </div>
            </div>
          </div>

          {/* Global Controls & Filters Toolbar */}
          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2.5">
            {/* 1. Main Period Listbox (Dropdown) */}
            <div className="relative inline-flex items-center">
              <div className="absolute left-3 pointer-events-none text-blue-600 dark:text-blue-400">
                <Calendar className="w-4 h-4" />
              </div>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="pl-9 pr-8 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border-2 border-blue-500/30 hover:border-blue-500 dark:border-blue-500/40 text-slate-800 dark:text-white shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer transition-all appearance-none"
              >
                <optgroup label="⚡ Preset Rentang Waktu">
                  <option value="all">Semua Waktu (Keseluruhan)</option>
                  <option value="today">Hari Ini</option>
                  <option value="7d">7 Hari Terakhir</option>
                  <option value="30d">30 Hari Terakhir</option>
                </optgroup>

                <optgroup label="📅 Pilih Berdasarkan Tahun">
                  {(data?.availableYears || ['2027', '2026']).map((yr) => (
                    <option key={yr} value={`year:${yr}`}>
                      Tahun {yr}
                    </option>
                  ))}
                </optgroup>

                <optgroup label="📆 Pilih Bulan Spesifik">
                  {(data?.availableMonths || []).map((m) => (
                    <option key={m.key} value={`month:${m.key}`}>
                      Bulan {m.label}
                    </option>
                  ))}
                </optgroup>

                <optgroup label="⚙️ Kustom Tanggal">
                  <option value="custom">Rentang Tanggal Kustom...</option>
                </optgroup>
              </select>
              <div className="absolute right-2.5 pointer-events-none text-slate-400">
                <ChevronRight className="w-3.5 h-3.5 rotate-90" />
              </div>
            </div>

            {/* 2. Quick Preset Buttons */}
            <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs font-semibold overflow-x-auto max-w-full">
              {[
                { id: 'all', label: 'Semua' },
                { id: '7d', label: '7 Hari' },
                { id: 'today', label: 'Hari Ini' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedPeriod(opt.id)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    selectedPeriod === opt.id
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* 3. Service Type Filter */}
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value as any)}
              className="px-3 py-2 rounded-xl text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              <option value="ALL">Semua Jenis Layanan</option>
              <option value="SERVICE">Khusus Servis Reguler</option>
              <option value="GARANSI">Khusus Klaim Garansi (RMA)</option>
            </select>

            {/* 4. Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchAnalytics}
                disabled={isLoading}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors disabled:opacity-50"
                title="Segarkan Data"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Ekspor CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Custom Date Range Picker Bar (if custom selected) */}
        {selectedPeriod === 'custom' && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3 text-xs animate-fade-in">
            <span className="font-semibold text-slate-600 dark:text-slate-300">Tentukan Rentang Tanggal:</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white text-xs focus:outline-none"
              />
              <span className="text-slate-400">s/d</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white text-xs focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={fetchAnalytics}
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Terapkan Filter
            </button>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <p className="text-sm font-medium">{errorMessage}</p>
        </div>
      )}

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Tiket Pelayanan */}
        <div className="relative overflow-hidden p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs group hover:border-blue-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Tiket Pelayanan
            </span>
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
              {isLoading ? '...' : formatNumber(data?.summary.totalTickets)}
            </span>
            <span className="text-xs text-slate-500 font-medium">unit</span>
          </div>
          <div className="mt-2.5 flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5" />
              {data?.summary.serviceCount || 0} Servis
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500 dark:text-slate-400">
              {data?.summary.garansiCount || 0} Garansi (RMA)
            </span>
          </div>
        </div>

        {/* Card 2: Tingkat Keberhasilan (Success Rate) */}
        <div className="relative overflow-hidden p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Tingkat Keberhasilan
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
              {isLoading ? '...' : `${data?.summary.successRate}%`}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              Optimal
            </span>
          </div>
          <div className="mt-2.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {data?.summary.totalCompleted || 0} Selesai
            </span>{' '}
            dari { (data?.summary.totalCompleted || 0) + (data?.summary.totalFailed || 0) } tiket tertangani
          </div>
        </div>

        {/* Card 3: Total Omset & Biaya Servis */}
        <div className="relative overflow-hidden p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs group hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Akumulasi Omset
            </span>
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-purple-600 dark:text-purple-400 truncate">
              {isLoading ? '...' : formatRupiah(data?.summary.totalRevenue)}
            </span>
          </div>
          <div className="mt-2.5 text-xs text-slate-500 dark:text-slate-400">
            Rata-rata{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {formatRupiah(data?.summary.avgRevenue)}
            </span>{' '}
            / nota servis
          </div>
        </div>

        {/* Card 4: Pengerjaan Aktif (On Progress) */}
        <div className="relative overflow-hidden p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Sedang Ditangani
            </span>
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-amber-600 dark:text-amber-400">
              {isLoading ? '...' : formatNumber(data?.summary.totalInProgress)}
            </span>
            <span className="text-xs text-slate-500 font-medium">unit aktif</span>
          </div>
          <div className="mt-2.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>{data?.summary.activeRegularService || 0} di Teknisi</span>
            <span>•</span>
            <span>{data?.summary.activeWarrantyRMA || 0} di Vendor RMA</span>
          </div>
        </div>
      </div>

      {/* 3. "Chart Bulan Graphic Seperti Saham" (Stock Market Style Area & Volume Chart) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        {/* Chart Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Kurva Tren Pelayanan — {data?.periodInfo?.title || 'Semua Waktu'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Grafik fluktuasi pergerakan unit masuk, moving average, serta volume histori pengerjaan unit servis.
            </p>
          </div>

          {/* Metric & Style Switchers */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Metric Switcher */}
            <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setChartMetric('volume')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  chartMetric === 'volume'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Volume Pelayanan (Unit)
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('omset')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  chartMetric === 'omset'
                    ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Omset Pendapatan (IDR)
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setChartStyle('area')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  chartStyle === 'area'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
                title="Area Curve Trend"
              >
                Kurva Tren
              </button>
              <button
                type="button"
                onClick={() => setChartStyle('candle')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  chartStyle === 'candle'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
                title="Candlestick Financial Style"
              >
                Candlestick
              </button>
            </div>
          </div>
        </div>

        {/* Highlight Stock Stats Banner */}
        {stockChartData && data && data.monthlyTrend.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-b border-slate-100 dark:border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 font-medium">Periode Terpilih:</span>
              <p className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5 truncate">
                {data.periodInfo?.title}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Rekor Tertinggi (Peak):</span>
              <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">
                {chartMetric === 'volume'
                  ? `${stockChartData.maxValue} Unit`
                  : formatRupiah(stockChartData.maxValue)}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Garis Tren (SMA-3):</span>
              <p className="font-bold text-amber-500 text-sm mt-0.5 flex items-center gap-1">
                <span className="w-2.5 h-0.5 bg-amber-500 rounded-full inline-block" /> Moving Average
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Histori Data:</span>
              <p className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5">
                {data.monthlyTrend.length} Titik ({data.periodInfo?.isDaily ? 'Hari' : 'Bulan'})
              </p>
            </div>
          </div>
        )}

        {/* SVG Graphic Canvas */}
        <div className="relative mt-4 overflow-hidden rounded-xl bg-slate-950 text-white p-3 sm:p-5 select-none">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span>Memuat data grafik {data?.periodInfo?.title || ''}...</span>
              </div>
            </div>
          ) : !stockChartData || stockChartData.points.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
              <AlertCircle className="w-6 h-6 text-slate-600" />
              <span>Tidak ada transaksi tercatat pada {data?.periodInfo?.title || 'periode ini'}.</span>
            </div>
          ) : (
            <div className="relative w-full">
              <svg
                viewBox={`0 0 ${stockChartData.svgWidth} ${stockChartData.svgHeight}`}
                className="w-full h-[360px] sm:h-[420px] lg:h-[460px] block"
              >
                <defs>
                  {/* Area gradient for stock curve */}
                  <linearGradient id="stockBlueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.45" />
                    <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.10" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="stockPurpleGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity="0.45" />
                    <stop offset="60%" stopColor="#a855f7" stopOpacity="0.10" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Gridlines */}
                {[0, 0.25, 0.5, 0.75, 1.0].map((ratio, idx) => {
                  const y = stockChartData.curveBottomY - ratio * stockChartData.curveHeight;
                  const val = Math.round(stockChartData.maxValue * ratio);
                  return (
                    <g key={idx}>
                      <line
                        x1={stockChartData.paddingX - 15}
                        y1={y}
                        x2={stockChartData.svgWidth - stockChartData.paddingX + 15}
                        y2={y}
                        stroke="#334155"
                        strokeDasharray="4 4"
                        strokeOpacity={ratio === 0 ? '0.7' : '0.35'}
                      />
                      <text
                        x={stockChartData.svgWidth - stockChartData.paddingX + 22}
                        y={y + 3.5}
                        fill="#64748b"
                        fontSize="10"
                        fontFamily="monospace"
                      >
                        {chartMetric === 'volume' ? `${val}u` : `${Math.round(val / 1000000)}M`}
                      </text>
                    </g>
                  );
                })}

                {/* Volume Divider line & Header */}
                <line
                  x1={stockChartData.paddingX - 15}
                  y1={stockChartData.volumeBottomY}
                  x2={stockChartData.svgWidth - stockChartData.paddingX + 15}
                  y2={stockChartData.volumeBottomY}
                  stroke="#334155"
                  strokeOpacity="0.5"
                />
                <text
                  x={stockChartData.paddingX - 10}
                  y={stockChartData.volumeTopY - 6}
                  fill="#475569"
                  fontSize="9"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  HISTOGRAM VOLUME
                </text>

                {/* Volume Histogram Bars (terpisah rapi di bagian bawah) */}
                {stockChartData.points.map((p, idx) => {
                  const barWidth = stockChartData.points.length <= 4 ? 36 : stockChartData.points.length <= 12 ? 22 : 12;
                  const barX = p.x - barWidth / 2;
                  const barHeight = Math.max(6, (p.value / stockChartData.maxValue) * stockChartData.maxVolumeBarHeight);
                  const barY = stockChartData.volumeBottomY - barHeight;
                  const isHovered = hoveredMonthIndex === idx;
                  const isUp = p.month.growth >= 0;

                  return (
                    <g key={`bar-${idx}`}>
                      <rect
                        x={barX}
                        y={barY}
                        width={barWidth}
                        height={barHeight}
                        rx="3"
                        fill={isUp ? '#10b981' : '#f43f5e'}
                        opacity={isHovered ? 0.9 : 0.35}
                        className="transition-all duration-150"
                      />
                    </g>
                  );
                })}

                {/* Mode A: Area Line Trend */}
                {chartStyle === 'area' && (
                  <>
                    {/* Glowing Area Fill */}
                    <path
                      d={stockChartData.areaPath}
                      fill={chartMetric === 'volume' ? 'url(#stockBlueGradient)' : 'url(#stockPurpleGradient)'}
                    />

                    {/* Smooth Bézier Main Trend Line */}
                    <path
                      d={stockChartData.linePath}
                      fill="none"
                      stroke={chartMetric === 'volume' ? '#3b82f6' : '#a855f7'}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Moving Average Line (SMA-3) */}
                    <path
                      d={stockChartData.smaPath}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2"
                      strokeDasharray="6 4"
                      strokeOpacity="0.85"
                    />

                    {/* High Peak Marker Pill */}
                    {stockChartData.peakPoint && (
                      <g transform={`translate(${stockChartData.peakPoint.x}, ${stockChartData.peakPoint.y - 18})`}>
                        <rect
                          x="-42"
                          y="-13"
                          width="84"
                          height="18"
                          rx="9"
                          fill="#059669"
                          fillOpacity="0.9"
                        />
                        <text
                          x="0"
                          y="-1"
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="9"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          ▲ PEAK: {stockChartData.peakPoint.value}{chartMetric === 'volume' ? 'u' : ''}
                        </text>
                      </g>
                    )}
                  </>
                )}

                {/* Mode B: Candlestick Financial Style */}
                {chartStyle === 'candle' && (
                  stockChartData.points.map((p, idx) => {
                    const isUp = p.month.growth >= 0;
                    const candleColor = isUp ? '#10b981' : '#f43f5e';
                    const candleWidth = stockChartData.points.length <= 4 ? 30 : stockChartData.points.length <= 12 ? 18 : 10;
                    const highY = Math.max(stockChartData.curveTopY + 5, p.y - 24);
                    const lowY = Math.min(stockChartData.curveBottomY - 10, p.y + 28);
                    const openY = isUp ? p.y + 14 : p.y - 14;
                    const closeY = isUp ? p.y - 14 : p.y + 14;
                    const bodyTop = Math.min(openY, closeY);
                    const bodyHeight = Math.max(10, Math.abs(openY - closeY));

                    return (
                      <g key={`candle-${idx}`}>
                        {/* Wick line (High to Low) */}
                        <line
                          x1={p.x}
                          y1={highY}
                          x2={p.x}
                          y2={lowY}
                          stroke={candleColor}
                          strokeWidth="2"
                        />
                        {/* Candle Body */}
                        <rect
                          x={p.x - candleWidth / 2}
                          y={bodyTop}
                          width={candleWidth}
                          height={bodyHeight}
                          rx="3"
                          fill={candleColor}
                        />
                      </g>
                    );
                  })
                )}

                {/* Interactive Points on Line */}
                {stockChartData.points.map((p, idx) => {
                  const isHovered = hoveredMonthIndex === idx;
                  return (
                    <g
                      key={`pt-${idx}`}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredMonthIndex(idx)}
                      onMouseLeave={() => setHoveredMonthIndex(null)}
                    >
                      {/* Invisible wider hit target */}
                      <circle cx={p.x} cy={p.y} r="22" fill="transparent" />

                      {/* Visible dot */}
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={isHovered ? 7.5 : 5}
                        fill={isHovered ? '#93c5fd' : '#3b82f6'}
                        stroke="#0f172a"
                        strokeWidth="2.5"
                        className="transition-all duration-150"
                      />

                      {/* X-axis Month/Day Label */}
                      <text
                        x={p.x}
                        y={stockChartData.volumeBottomY + 22}
                        fill={isHovered ? '#ffffff' : '#94a3b8'}
                        fontSize={stockChartData.points.length > 20 ? '10' : '12'}
                        textAnchor="middle"
                        fontWeight={isHovered ? 'bold' : '600'}
                      >
                        {p.month.shortLabel}
                      </text>
                      {!data?.periodInfo?.isDaily && (
                        <text
                          x={p.x}
                          y={stockChartData.volumeBottomY + 36}
                          fill="#64748b"
                          fontSize="10"
                          textAnchor="middle"
                          fontFamily="monospace"
                        >
                          {p.month.year}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Crosshair indicator on hover */}
                {hoveredMonthIndex !== null && stockChartData.points[hoveredMonthIndex] && (
                  <g>
                    <line
                      x1={stockChartData.points[hoveredMonthIndex].x}
                      y1={stockChartData.curveTopY}
                      x2={stockChartData.points[hoveredMonthIndex].x}
                      y2={stockChartData.volumeBottomY}
                      stroke="#94a3b8"
                      strokeDasharray="4 4"
                      strokeWidth="1.2"
                    />
                    <circle
                      cx={stockChartData.points[hoveredMonthIndex].x}
                      cy={stockChartData.points[hoveredMonthIndex].y}
                      r="8"
                      fill="none"
                      stroke="#60a5fa"
                      strokeWidth="2"
                      className="animate-ping"
                    />
                  </g>
                )}
              </svg>

              {/* Floating Tooltip Card on Hover */}
              {hoveredMonthIndex !== null && data && data.monthlyTrend[hoveredMonthIndex] && (
                <div
                  className="absolute top-4 left-4 z-20 p-3 rounded-xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-md text-xs pointer-events-none transition-all"
                  style={{
                    transform: 'translateY(0)'
                  }}
                >
                  <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-1.5 mb-2">
                    <span className="font-bold text-white text-sm">
                      {data.monthlyTrend[hoveredMonthIndex].label}
                    </span>
                    <span
                      className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                        data.monthlyTrend[hoveredMonthIndex].growth >= 0
                          ? 'bg-emerald-950 text-emerald-400'
                          : 'bg-rose-950 text-rose-400'
                      }`}
                    >
                      {data.monthlyTrend[hoveredMonthIndex].growth >= 0 ? '+' : ''}
                      {data.monthlyTrend[hoveredMonthIndex].growth}%
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-300">
                    <div>Tiket Masuk: <span className="font-bold text-white font-mono">{data.monthlyTrend[hoveredMonthIndex].masuk} unit</span></div>
                    <div>Tiket Selesai: <span className="font-bold text-emerald-400 font-mono">{data.monthlyTrend[hoveredMonthIndex].selesai} unit</span></div>
                    <div>Rasio Selesai: <span className="font-bold text-blue-400 font-mono">{data.monthlyTrend[hoveredMonthIndex].successRate}%</span></div>
                    <div>Total Omset: <span className="font-bold text-purple-400 font-mono">{formatRupiah(data.monthlyTrend[hoveredMonthIndex].omset)}</span></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bottom Chart Footer Legend */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-blue-500 rounded-full" /> Volume Pelayanan
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-amber-500 rounded-full border-t border-dashed" /> SMA (3 Periode)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-emerald-500/60 rounded" /> Histori Volume (Positif)
              </span>
            </div>
            <span>*Klik atau arahkan kursor ke titik grafik untuk detail rinci</span>
          </div>
        </div>
      </div>

      {/* 4. "Chart Balok" Section (Status, Kategori Barang, Beban Teknisi) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Balok 1: Status Pelayanan & Pengerjaan */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Komposisi Status Pelayanan
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {data?.statusBreakdown.length || 0} Status
            </span>
          </div>

          {/* Segmented Horizontal Bar */}
          <div className="mt-4 w-full h-3.5 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800">
            {data?.statusBreakdown.map((s, idx) => (
              <div
                key={idx}
                style={{ width: `${s.percentage}%`, backgroundColor: s.colorFill }}
                className="h-full transition-all duration-300 hover:opacity-80"
                title={`${s.status}: ${s.count} unit (${s.percentage}%)`}
              />
            ))}
          </div>

          {/* Status Breakdown List */}
          <div className="mt-4 space-y-2 flex-1 overflow-y-auto max-h-72">
            {data?.statusBreakdown.map((s, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: s.colorFill }}
                  />
                  <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                    {s.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 font-mono">
                  <span className="font-bold text-slate-900 dark:text-white">{s.count}</span>
                  <span className="text-[11px] text-slate-400 w-12 text-right">({s.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Balok 2: Kategori Perangkat (Jenis Barang) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Laptop className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Distribusi Kategori Perangkat
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Unit Terbanyak</span>
          </div>

          <div className="mt-4 space-y-3.5 flex-1">
            {data?.categoryBreakdown.slice(0, 5).map((cat, idx) => {
              const maxCat = data.categoryBreakdown[0]?.count || 1;
              const barPercent = Math.round((cat.count / maxCat) * 100);

              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {cat.category}
                    </span>
                    <span className="font-mono text-slate-600 dark:text-slate-400">
                      <strong className="text-slate-900 dark:text-white">{cat.count}</strong> ({cat.percentage}%)
                    </span>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      style={{ width: `${barPercent}%` }}
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Servis: {cat.serviceCount}</span>
                    <span>Garansi: {cat.garansiCount}</span>
                    <span>Selesai: {cat.selesaiCount}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Balok 3: Beban & Produktivitas Teknisi */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Produktivitas Teknisi
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Penyelesaian</span>
          </div>

          <div className="mt-4 space-y-4 flex-1">
            {data?.technicianStats.map((t, idx) => {
              return (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-[11px] flex items-center justify-center">
                        #{t.rank}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white text-xs">
                        {t.name}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      {t.successRate}% Sukses
                    </span>
                  </div>

                  {/* Multi-segment stack bar (Selesai vs Proses vs Gagal) */}
                  <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-200 dark:bg-slate-700">
                    <div
                      style={{ width: `${(t.selesai / (t.total || 1)) * 100}%` }}
                      className="bg-emerald-500 h-full"
                      title={`Selesai: ${t.selesai}`}
                    />
                    <div
                      style={{ width: `${(t.proses / (t.total || 1)) * 100}%` }}
                      className="bg-blue-500 h-full"
                      title={`Proses: ${t.proses}`}
                    />
                    <div
                      style={{ width: `${(t.gagal / (t.total || 1)) * 100}%` }}
                      className="bg-rose-500 h-full"
                      title={`Gagal: ${t.gagal}`}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>Total: <strong className="text-slate-800 dark:text-slate-200">{t.total}</strong> unit</span>
                    <span>Omset: <strong className="text-purple-600 dark:text-purple-400">{formatRupiah(t.omset)}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. Detailed Tables Section */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        {/* Table Navigation Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTableTab('technicians')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTableTab === 'technicians'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Leaderboard Kinerja Teknisi
            </button>
            <button
              type="button"
              onClick={() => setActiveTableTab('vendors')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTableTab === 'vendors'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Mitra Vendor & Distributor RMA
            </button>
            <button
              type="button"
              onClick={() => setActiveTableTab('monthly')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTableTab === 'monthly'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {data?.periodInfo?.isDaily ? `Rekap Harian (${data.periodInfo.title})` : 'Rekap Historis Bulanan'}
            </button>
          </div>

          {/* Table Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={tableSearch}
              onChange={e => setTableSearch(e.target.value)}
              placeholder="Cari dalam tabel..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* Tab 1: Leaderboard Teknisi Table */}
        {activeTableTab === 'technicians' && (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">Peringkat</th>
                  <th className="py-3 px-4">Nama Teknisi</th>
                  <th className="py-3 px-4 text-right">Total Unit</th>
                  <th className="py-3 px-4 text-right">Selesai</th>
                  <th className="py-3 px-4 text-right">Sedang Proses</th>
                  <th className="py-3 px-4 text-right">Gagal</th>
                  <th className="py-3 px-4 text-right">Tingkat Sukses</th>
                  <th className="py-3 px-4 text-right">Total Omset Servis</th>
                  <th className="py-3 px-4 text-right">Rata-rata / Nota</th>
                  <th className="py-3 px-4 text-center">Status Evaluasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredTechnicians.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      Tidak ada data teknisi pada periode {data?.periodInfo?.title || ''}.
                    </td>
                  </tr>
                ) : (
                  filteredTechnicians.map((t, idx) => {
                    const isTop1 = t.rank === 1;
                    return (
                      <tr
                        key={idx}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                          isTop1 ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold font-mono text-xs ${
                              t.rank === 1
                                ? 'bg-amber-400 text-amber-950 shadow-xs'
                                : t.rank === 2
                                ? 'bg-slate-300 text-slate-800'
                                : t.rank === 3
                                ? 'bg-amber-700 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {t.rank === 1 ? '🥇' : t.rank === 2 ? '🥈' : t.rank === 3 ? '🥉' : `#${t.rank}`}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {t.name}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold">
                          {t.total}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          {t.selesai}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-blue-600 dark:text-blue-400">
                          {t.proses}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-rose-500">
                          {t.gagal}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold">
                          <span
                            className={`px-2 py-0.5 rounded-md ${
                              t.successRate >= 80
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : t.successRate >= 60
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {t.successRate}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-purple-600 dark:text-purple-400">
                          {formatRupiah(t.omset)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-500">
                          {formatRupiah(t.avgBiaya)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                              t.successRate >= 85
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : t.successRate >= 70
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {t.successRate >= 85 ? 'Sangat Baik' : t.successRate >= 70 ? 'Produktif' : 'Standar'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Vendor RMA Table */}
        {activeTableTab === 'vendors' && (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">Nama Vendor / Distributor</th>
                  <th className="py-3 px-4 text-right">Total Unit RMA</th>
                  <th className="py-3 px-4 text-right">RMA Selesai</th>
                  <th className="py-3 px-4 text-right">Masih di Vendor</th>
                  <th className="py-3 px-4 text-right">Klaim Ditolak</th>
                  <th className="py-3 px-4 text-right">Tingkat Penyelesaian</th>
                  <th className="py-3 px-4 text-center">Status Hubungan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredVendors.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Tidak ada data klaim garansi vendor pada periode {data?.periodInfo?.title || ''}.
                    </td>
                  </tr>
                ) : (
                  filteredVendors.map((v, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {v.vendor}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {v.total}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        {v.selesai}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-amber-500">
                        {v.proses}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-rose-500">
                        {v.gagal}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        <span
                          className={`px-2 py-0.5 rounded-md ${
                            v.successRate >= 80
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {v.successRate}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          Aktif
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Rekap Historis (Harian jika filter bulan/hari, Bulanan jika filter tahun/semua) */}
        {activeTableTab === 'monthly' && (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">
                    {data?.periodInfo?.isDaily ? 'Tanggal / Hari' : 'Periode Bulan'}
                  </th>
                  <th className="py-3 px-4 text-right">Unit Masuk</th>
                  <th className="py-3 px-4 text-right">Unit Selesai</th>
                  <th className="py-3 px-4 text-right">Unit Gagal</th>
                  <th className="py-3 px-4 text-right">Rasio Selesai (%)</th>
                  <th className="py-3 px-4 text-right">Pertumbuhan</th>
                  <th className="py-3 px-4 text-right">Omset Pelayanan</th>
                  <th className="py-3 px-4 text-center">Indikator Tren</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {!data?.monthlyTrend || data.monthlyTrend.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Tidak ada rekaman historis pada periode {data?.periodInfo?.title || ''}.
                    </td>
                  </tr>
                ) : (
                  data.monthlyTrend.map((m, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {m.label}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {m.masuk}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        {m.selesai}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-rose-500">
                        {m.gagal}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {m.successRate}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        <span
                          className={`inline-flex items-center gap-0.5 ${
                            m.growth >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {m.growth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {m.growth >= 0 ? '+' : ''}{m.growth}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-purple-600 dark:text-purple-400">
                        {formatRupiah(m.omset)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            m.growth >= 0
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {m.growth >= 0 ? 'Meningkat' : 'Stabil / Fluktuatif'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
