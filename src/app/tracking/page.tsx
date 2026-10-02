'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Wrench,
  ShieldCheck,
  PackageCheck,
  Laptop,
  Copy,
  Check,
  Printer,
  Sun,
  Moon,
  MessageSquare,
  ArrowRight,
  Store,
  MapPin,
  Phone,
  Calendar,
  DollarSign,
  Info,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  XCircle,
  UserCheck
} from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';

interface TrackingTicket {
  nomor_layanan: string;
  tanggal_masuk: string;
  jenis_layanan: string;
  nama_customer: string;
  no_hp_masked: string;
  jenis_barang: string;
  nama_barang: string;
  serial_number: string;
  keluhan: string;
  kelengkapan: string[];
  estimasi_selesai?: string | null;
  teknisi: string;
  status: string;
  catatan?: string | null;
  estimasi_biaya: number;
  dp: number;
  sisa: number;
  biaya_akhir: number;
  hasil_service_garansi?: string | null;
  sn_baru?: string | null;
  tgl_diambil_customer?: string | null;
  updated_at: string;
  progress: {
    current_step: number;
    step_title: string;
    step_description: string;
    is_pending: boolean;
    is_failed: boolean;
    is_ready_for_pickup: boolean;
    is_done_taken: boolean;
  };
  timeline: Array<{
    action: string;
    description: string;
    time: string;
  }>;
}

const STEPPER_STAGES = [
  { step: 1, label: 'Penerimaan', desc: 'Unit Diterima di Toko' },
  { step: 2, label: 'Diagnosa', desc: 'Pengecekan Kendala' },
  { step: 3, label: 'Pengerjaan', desc: 'Servis / Alur Vendor' },
  { step: 4, label: 'Selesai QC', desc: 'Siap Diambil di Toko' },
  { step: 5, label: 'Diambil', desc: 'Unit Sudah Diserahkan' },
];

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount || 0);
}

function formatDateIndo(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

function formatDateTimeIndo(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) + ' WIB';
  } catch {
    return dateStr;
  }
}

function TrackingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  const [receiptNumber, setReceiptNumber] = useState('');
  const [ticket, setTicket] = useState<TrackingTicket | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedNo, setCopiedNo] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Track the last queried number to avoid infinite re-render loops with searchParams
  const lastSearchedRef = useRef<string>('');
  const isSearchingRef = useRef<boolean>(false);

  // Auto search ONLY when URL parameter changes to a new value
  useEffect(() => {
    const urlParamNo = (
      searchParams.get('no') ||
      searchParams.get('nomor') ||
      searchParams.get('q') ||
      ''
    ).trim();

    if (urlParamNo && urlParamNo.toLowerCase() !== lastSearchedRef.current.toLowerCase()) {
      setReceiptNumber(urlParamNo);
      performSearch(urlParamNo);
    }
  }, [searchParams]);

  const performSearch = async (queryNumber: string) => {
    const cleaned = queryNumber.trim();
    if (!cleaned) {
      setErrorMessage('Silakan ketik nomor tanda terima terlebih dahulu.');
      return;
    }

    // Prevent duplicate concurrent searches for identical query
    if (isSearchingRef.current && lastSearchedRef.current.toLowerCase() === cleaned.toLowerCase()) {
      return;
    }

    isSearchingRef.current = true;
    lastSearchedRef.current = cleaned;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/tracking?no=${encodeURIComponent(cleaned)}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setTicket(null);
        setErrorMessage(data.error || 'Nomor tanda terima tidak ditemukan.');
      } else {
        setTicket(data.ticket);
        setErrorMessage(null);

        // Update URL query cleanly only if different
        try {
          const currentUrlNo = searchParams.get('no') || '';
          if (currentUrlNo.toLowerCase() !== cleaned.toLowerCase()) {
            const url = new URL(window.location.href);
            url.searchParams.set('no', cleaned);
            window.history.replaceState(null, '', url.toString());
          }
        } catch {}
      }
    } catch (err) {
      console.error('Tracking query error:', err);
      setErrorMessage('Terjadi gangguan jaringan saat memuat data. Silakan coba lagi.');
      setTicket(null);
    } finally {
      setIsLoading(false);
      isSearchingRef.current = false;
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(receiptNumber);
  };

  const handleCopyReceipt = () => {
    if (!ticket) return;
    navigator.clipboard.writeText(ticket.nomor_layanan);
    setCopiedNo(true);
    setTimeout(() => setCopiedNo(false), 2000);
  };

  const handleCopyTrackingLink = () => {
    if (!ticket) return;
    const url = `${window.location.origin}/tracking?no=${encodeURIComponent(ticket.nomor_layanan)}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const getWhatsAppMessageUrl = () => {
    if (!ticket) {
      return 'https://wa.me/6289526655777?text=Halo%20Best%20Computel%20Service,%20saya%20ingin%20menanyakan%20status%20servis%20saya.';
    }
    const msg = `Halo Best Computel Service, saya ingin menanyakan status pengerjaan unit saya:
━━━━━━━━━━━━━━━
• No. Tanda Terima: ${ticket.nomor_layanan}
• Perangkat: ${ticket.nama_barang}
• Nama: ${ticket.nama_customer}
━━━━━━━━━━━━━━━
Mohon info perkembangannya, terima kasih.`;
    return `https://wa.me/6289526655777?text=${encodeURIComponent(msg)}`;
  };

  // Helper status color configuration
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SELESAI BELUM DIAMBIL':
        return {
          bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-500 animate-pulse',
          label: 'SIAP DIAMBIL DI TOKO'
        };
      case 'SELESAI & DIAMBIL':
        return {
          bg: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30',
          dot: 'bg-slate-500',
          label: 'SUDAH DIAMBIL PELANGGAN'
        };
      case 'PROSES SERVICE':
        return {
          bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
          dot: 'bg-blue-500 animate-ping',
          label: 'SEDANG PROSES SERVICE'
        };
      case 'PROSES GARANSI':
        return {
          bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
          dot: 'bg-purple-500 animate-ping',
          label: 'SEDANG PROSES GARANSI (VENDOR)'
        };
      case 'PENDING SERVICE':
        return {
          bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
          dot: 'bg-amber-500',
          label: 'PENDING / MENUNGGU KONFIRMASI'
        };
      case 'GAGAL SERVICE/GARANSI':
        return {
          bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
          dot: 'bg-rose-500',
          label: 'TIDAK DAPAT DIPERBAIKI / GAGAL'
        };
      default:
        return {
          bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
          dot: 'bg-blue-500',
          label: status
        };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-blue-500 selection:text-white transition-colors duration-200">
      {/* 1. Top Navigation Bar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/tracking" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center p-1.5 shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <img
                src="/logo.png"
                alt="Best Computel Logo"
                className="w-full h-full object-contain filter brightness-0 invert"
                onError={(e) => {
                  // Fallback icon if logo image fails
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            <div>
              <div className="font-bold text-base tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                BEST COMPUTEL
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                  Tracking
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Portal Pelanggan Servis & RMA Garansi
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Dark Mode Toggle */}
            <button
              type="button"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Ganti Tema Tampilan"
              aria-label="Toggle Theme"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>

            {/* WA Help Button */}
            <a
              href="https://wa.me/6289526655777?text=Halo%20Admin%20Best%20Computel,%20saya%20butuh%20bantuan%20seputar%20servis"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/20 transition-all hover:shadow-md"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp CS</span>
            </a>

            {/* Internal Staff Link */}
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="hidden md:inline">Login Staff</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero & Search Section */}
      <section className="relative overflow-hidden pt-8 pb-10 sm:py-12 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-b from-blue-50/60 via-slate-50 to-slate-50 dark:from-blue-950/20 dark:via-slate-950 dark:to-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(#2563eb18_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none opacity-50" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/80 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold uppercase tracking-wider mb-4 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
            Live Service Tracking
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
            Pantau Status Pengerjaan Servis Anda
          </h1>
          <p className="mt-2.5 text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Masukkan <span className="font-semibold text-slate-800 dark:text-slate-200">Nomor Tanda Terima</span> yang tertera pada nota fisik atau pesan WhatsApp untuk melihat status perbaikan secara transparan.
          </p>

          {/* Search Form Box */}
          <form
            onSubmit={handleSearchSubmit}
            className="mt-6 max-w-2xl mx-auto relative group"
          >
            <div className="relative flex flex-col sm:flex-row items-center gap-2 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-xl shadow-blue-500/5 group-focus-within:border-blue-500 dark:group-focus-within:border-blue-500 transition-all">
              <div className="relative flex-1 w-full flex items-center">
                <Search className="w-5 h-5 text-slate-400 ml-3 shrink-0 group-focus-within:text-blue-600 transition-colors" />
                <input
                  type="text"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value.toUpperCase())}
                  placeholder="Contoh: BCTRS26-0001 atau BCT-20261001-001"
                  className="w-full bg-transparent px-3 py-3 text-sm sm:text-base font-mono font-medium text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-sans focus:outline-none uppercase tracking-wide"
                  autoComplete="off"
                  autoFocus
                />
                {receiptNumber && (
                  <button
                    type="button"
                    onClick={() => {
                      setReceiptNumber('');
                      setTicket(null);
                      setErrorMessage(null);
                      lastSearchedRef.current = '';
                      try {
                        const url = new URL(window.location.href);
                        url.searchParams.delete('no');
                        url.searchParams.delete('nomor');
                        url.searchParams.delete('q');
                        window.history.replaceState(null, '', url.pathname);
                      } catch {}
                    }}
                    className="p-1.5 mr-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    title="Hapus"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-50 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Mencari...</span>
                  </>
                ) : (
                  <>
                    <span>Cari Status</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Quick Suggestions / Examples */}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
                Contoh Nomor:
              </span>
              {['BCTRS26-0344', 'BCTRS26-0067', 'BCTRS26-0001'].map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => {
                    setReceiptNumber(sample);
                    performSearch(sample);
                  }}
                  className="px-2 py-0.5 rounded-md font-mono text-[11px] bg-slate-200/70 dark:bg-slate-800 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900/40 dark:hover:text-blue-300 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  {sample}
                </button>
              ))}
            </div>
          </form>
        </div>
      </section>

      {/* 3. Main Body Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Error Alert Box */}
        {errorMessage && (
          <div className="p-4 sm:p-5 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 flex items-start gap-3.5 shadow-sm animate-fade-in mb-8">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-rose-900 dark:text-rose-200">
                Pencarian Tidak Ditemukan
              </p>
              <p className="mt-0.5 text-rose-700 dark:text-rose-400">
                {errorMessage}
              </p>
              <div className="mt-3 pt-3 border-t border-rose-200/60 dark:border-rose-900/40 text-xs text-rose-700 dark:text-rose-400 space-y-1">
                <p>• Periksa kembali huruf dan angka pada nota tanda terima Anda.</p>
                <p>• Bila Anda baru saja memasukkan unit dalam 15 menit terakhir, hubungi admin untuk konfirmasi pendaftaran.</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading Shimmer Skeleton */}
        {isLoading && (
          <div className="space-y-6 animate-pulse">
            <div className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-36 rounded-2xl bg-slate-200 dark:bg-slate-800" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-64 rounded-2xl bg-slate-200 dark:bg-slate-800" />
              <div className="h-64 rounded-2xl bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        )}

        {/* Loaded Ticket Details */}
        {!isLoading && ticket && (
          <div className="space-y-6 animate-fade-in">
            {/* A. Top Receipt Header Card */}
            <div className="p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs uppercase font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {ticket.jenis_layanan === 'GARANSI' ? 'Klaim Garansi (RMA)' : 'Servis Reguler'}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      • Masuk: {formatDateIndo(ticket.tanggal_masuk)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
                      {ticket.nomor_layanan}
                    </h2>
                    <button
                      type="button"
                      onClick={handleCopyReceipt}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
                      title="Salin Nomor Tanda Terima"
                    >
                      {copiedNo ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Pelanggan: <span className="font-semibold text-slate-700 dark:text-slate-300">{ticket.nama_customer}</span> ({ticket.no_hp_masked})
                  </p>
                </div>

                {/* Status Badge */}
                <div className="flex flex-col items-start md:items-end gap-1.5">
                  <div
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border ${
                      getStatusBadge(ticket.status).bg
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${getStatusBadge(ticket.status).dot}`}
                    />
                    <span>{getStatusBadge(ticket.status).label}</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Pembaruan Terakhir: {formatDateTimeIndo(ticket.updated_at)}
                  </span>
                </div>
              </div>

              {/* Ready for Pickup Celebration Banner */}
              {ticket.progress.is_ready_for_pickup && (
                <div className="mt-5 p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 flex items-start gap-3">
                  <PackageCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-sm">
                      Kabar Baik! Perangkat Anda Sudah Selesai & Siap Diambil
                    </h3>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5 leading-relaxed">
                      Unit telah lolos pengujian Quality Control dan siap diserahkan. Silakan kunjungi gerai Best Computel dengan membawa lembar tanda terima fisik atau tunjukkan halaman ini.
                    </p>
                  </div>
                </div>
              )}

              {/* Pending / On-Hold Banner */}
              {ticket.progress.is_pending && (
                <div className="mt-5 p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 flex items-start gap-3">
                  <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-sm">
                      Pengerjaan Sedang Pending / Menunggu Konfirmasi
                    </h3>
                    <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
                      Teknisi membutuhkan persetujuan tindakan lanjutan, estimasi biaya komponen, atau menunggu kedatangan suku cadang khusus. Silakan hubungi teknisi melalui WhatsApp di bawah.
                    </p>
                  </div>
                </div>
              )}

              {/* Failed / Cancelled Banner */}
              {ticket.progress.is_failed && (
                <div className="mt-5 p-4 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-sm">
                      Pengerjaan Tidak Dapat Dilanjutkan / Ditolak Vendor
                    </h3>
                    <p className="text-xs text-rose-800 dark:text-rose-300 mt-0.5 leading-relaxed">
                      Perangkat tidak memungkinkan untuk diperbaiki secara aman atau garansi ditolak oleh distributor pusat. Unit dapat diambil kembali di toko.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* B. Visual Progression Stepper */}
            <div className="p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-x-auto">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-500" />
                Tahapan Progres Pengerjaan
              </h3>

              <div className="min-w-[580px] px-2 py-2">
                <div className="relative flex items-center justify-between">
                  {/* Connecting Progress Track Line */}
                  <div className="absolute left-6 right-6 top-5 h-1 bg-slate-100 dark:bg-slate-800 -z-0" />
                  <div
                    className="absolute left-6 top-5 h-1 bg-blue-600 dark:bg-blue-500 transition-all duration-500 -z-0"
                    style={{
                      width: `${((Math.min(ticket.progress.current_step, 5) - 1) / 4) * 100}%`
                    }}
                  />

                  {/* Stage Nodes */}
                  {STEPPER_STAGES.map((s) => {
                    const isCompleted = ticket.progress.current_step > s.step;
                    const isCurrent = ticket.progress.current_step === s.step;

                    return (
                      <div
                        key={s.step}
                        className="relative z-10 flex flex-col items-center text-center group w-28"
                      >
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                            isCompleted
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                              : isCurrent
                              ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900/50 shadow-lg shadow-blue-500/30 scale-110'
                              : 'bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-slate-400'
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="w-5 h-5 stroke-[2.5]" />
                          ) : isCurrent ? (
                            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                          ) : (
                            s.step
                          )}
                        </div>

                        <div className="mt-2.5">
                          <p
                            className={`text-xs font-bold leading-tight ${
                              isCurrent
                                ? 'text-blue-600 dark:text-blue-400'
                                : isCompleted
                                ? 'text-slate-800 dark:text-slate-200'
                                : 'text-slate-400'
                            }`}
                          >
                            {s.label}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {s.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Current Active Step Highlight Callout */}
                <div className="mt-8 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Info className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 dark:text-white">
                      Status Saat Ini ({ticket.progress.step_title}):
                    </span>{' '}
                    <span className="text-slate-600 dark:text-slate-300">
                      {ticket.progress.step_description}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* C. 2-Column Detailed Specification Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Detail Perangkat & Keluhan */}
              <div className="p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
                    <Laptop className="w-4 h-4 text-blue-500" />
                    Informasi Unit Perangkat
                  </h3>

                  <div className="space-y-3.5 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">
                        Nama / Tipe Barang
                      </span>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {ticket.nama_barang}
                      </p>
                      <span className="inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        Kategori: {ticket.jenis_barang}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-slate-400 block text-[11px]">
                          Serial Number (S/N)
                        </span>
                        <p className="font-mono font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                          {ticket.serial_number || '-'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">
                          Estimasi Selesai
                        </span>
                        <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                          {formatDateIndo(ticket.estimasi_selesai)}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 block text-[11px] mb-1">
                        Kelengkapan Fisik Unit
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {ticket.kelengkapan && ticket.kelengkapan.length > 0 ? (
                          ticket.kelengkapan.map((item, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 text-[11px]"
                            >
                              ✓ {item}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic">Unit saja tanpa kelengkapan tambahan</span>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 block text-[11px] mb-1">
                        Keluhan Saat Diterima
                      </span>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                        "{ticket.keluhan}"
                      </div>
                    </div>
                  </div>
                </div>

                {/* S/N Baru if Garansi Swapped */}
                {ticket.sn_baru && (
                  <div className="mt-4 p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 text-xs">
                    <span className="font-bold">Unit Pengganti Baru (Garansi):</span> S/N {ticket.sn_baru}
                  </div>
                )}
              </div>

              {/* Card 2: Catatan Teknisi & Rincian Biaya */}
              <div className="p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
                    <Wrench className="w-4 h-4 text-blue-500" />
                    Penanganan & Rincian Biaya
                  </h3>

                  <div className="space-y-3.5 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">
                        Teknisi Penanggung Jawab
                      </span>
                      <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        {ticket.teknisi || 'Teknisi Best Computel'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 block text-[11px] mb-1">
                        Catatan & Diagnosa Teknis
                      </span>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-slate-700 dark:text-slate-300 leading-relaxed">
                        {ticket.catatan || 'Unit sedang dalam antrean diagnosa lanjutan oleh teknisi.'}
                      </div>
                    </div>

                    {/* Biaya & Pembayaran */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 block text-[11px] mb-2 font-semibold uppercase">
                        Rincian Tagihan & Biaya Servis
                      </span>
                      <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                        <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                          <span>Total Biaya Servis</span>
                          <span className="font-mono font-semibold text-slate-900 dark:text-white">
                            {formatRupiah(ticket.biaya_akhir || ticket.estimasi_biaya)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                          <span>Uang Muka (DP) Terbayar</span>
                          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                            - {formatRupiah(ticket.dp)}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-sm font-bold">
                          <span className="text-slate-900 dark:text-white">Sisa Pembayaran</span>
                          <span
                            className={`font-mono text-base ${
                              ticket.sisa > 0
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {ticket.sisa > 0 ? formatRupiah(ticket.sisa) : 'LUNAS (Rp 0)'}
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1.5 italic">
                        *Pelunasan sisa tagihan dilakukan di kasir saat pengambilan unit.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Direct Action Buttons Inside Card */}
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
                  <a
                    href={getWhatsAppMessageUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-[140px] px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all hover:shadow"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Tanya Teknisi (WA)</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleCopyTrackingLink}
                    className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    title="Bagikan Link Tracking"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Bagikan Link</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    title="Cetak Halaman Bukti"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Cetak</span>
                  </button>
                </div>
              </div>
            </div>

            {/* D. Riwayat & Catatan Perkembangan (Timeline) */}
            {ticket.timeline && ticket.timeline.length > 0 && (
              <div className="p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-500" />
                  Log Riwayat Servis
                </h3>

                <div className="relative pl-6 space-y-4 border-l-2 border-slate-200 dark:border-slate-800 ml-2 my-2">
                  {ticket.timeline.map((item, idx) => (
                    <div key={idx} className="relative group">
                      <div className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-blue-600 ring-4 ring-white dark:ring-slate-900" />
                      <div className="text-xs">
                        <span className="text-[11px] font-mono text-slate-400">
                          {formatDateTimeIndo(item.time)}
                        </span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty Search Placeholder */}
        {!isLoading && !ticket && !errorMessage && (
          <div className="py-12 sm:py-16 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Masukkan Nomor Tanda Terima
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Ketikkan nomor tanda terima (No. RMA / Nota) di kolom pencarian di atas untuk memeriksa status perbaikan terkini.
            </p>
          </div>
        )}
      </main>

      {/* 4. Store Information & Location Section */}
      <section className="border-t border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 py-8 px-4 sm:px-6 transition-colors">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white text-xs">Lokasi Toko & Servis</p>
              <p className="mt-0.5 leading-relaxed">
                Jl. Terusan pembangunan No.9C, Tarogong kidul - Garut, Jawa Barat
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white text-xs">Customer Service</p>
              <p className="mt-0.5">WhatsApp: 0895-2665-5777</p>
              <p className="text-[11px] text-slate-400">Siap melayani pertanyaan teknis & garansi</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white text-xs">Jam Operasional</p>
              <p className="mt-0.5">Senin - Sabtu: 08:30 - 20:00 WIB</p>
              <p className="text-[11px] text-slate-400">Hari Minggu & Libur Nasional: Tutup</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Minimalist Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-950 py-4 px-4 text-center text-xs text-slate-500 dark:text-slate-500">
        <p>© 2026 Best Computel RMA & Service. Hak cipta dilindungi undang-undang.</p>
      </footer>
    </div>
  );
}

export default function TrackingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-medium">Memuat portal tracking...</p>
          </div>
        </div>
      }
    >
      <TrackingContent />
    </Suspense>
  );
}
