'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  Bell,
  ChevronDown,
  Menu,
  LogOut,
  ShieldCheck,
  Sun,
  Moon,
  Laptop,
  Clock,
  X,
  SlidersHorizontal
} from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useAuth } from '@/components/auth/AuthProvider';
import { useAppConfig } from '@/components/config/AppConfigProvider';

interface PageMeta {
  title: string;
  subtitle: string;
}

const PAGE_SUBTITLE_MAP: Record<string, string> = {
  '/': 'Monitoring antrean servis, performa teknisi & status unit',
  '/statistik': 'Ringkasan performa bisnis, tren masuk & produktivitas teknisi',
  '/tickets': 'Kelola dan lacak semua antrean tiket servis & klaim garansi',
  '/tickets/new': 'Register a new service ticket for a customer device',
  '/surat-jalan': 'Kelola pengiriman unit garansi RMA dan cetak surat jalan',
  '/whatsapp': 'Broadcast dan notifikasi otomatis ke customer & sales',
  '/master': 'Kelola database vendor, customer, dan preset opsi servis',
  '/alamat': 'Label stiker pengiriman barang garansi & servis ke distributor/vendor',
  '/logs': 'Riwayat lengkap aktivitas dan perubahan status sistem',
  '/users': 'Kelola akun teknisi, hak akses role admin & persetujuan login',
  '/settings/white-label': 'Kustomisasi branding, fitur sidebar, KPI dashboard & form builder'
};

function TopbarContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams ? searchParams.get('tab') : null;
  const { toggleMobileSidebar, theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const { config, getFeatureLabel } = useAppConfig();

  const urlSearch = searchParams ? searchParams.get('search') || '' : '';
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; title: string; time: string; type: string }[]>([]);

  useEffect(() => {
    setSearchQuery(urlSearch);
  }, [urlSearch]);

  useEffect(() => {
    if (pathname !== '/tickets') return;
    if (searchQuery.trim() === urlSearch) return;

    const timer = setTimeout(() => {
      const q = searchQuery.trim();
      if (q) {
        router.push(`/tickets?search=${encodeURIComponent(q)}`);
      } else if (urlSearch) {
        router.push('/tickets');
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, pathname, urlSearch, router]);

  const userDropdownRef = useRef<HTMLDivElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(target) &&
        !target.closest('[data-user-trigger]')
      ) {
        setIsUserDropdownOpen(false);
      }
      if (
        notifDropdownRef.current &&
        !notifDropdownRef.current.contains(target) &&
        !target.closest('[data-notif-trigger]')
      ) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const loadNotifs = async () => {
      try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        if (data) {
          const list = [];
          if (data.pendingService > 0) {
            list.push({
              id: '1',
              title: `${data.pendingService} Unit menunggu antrean teknisi`,
              time: 'Perlu dicek',
              type: 'warning'
            });
          }
          if (data.garansiDiVendor > 0) {
            list.push({
              id: '2',
              title: `${data.garansiDiVendor} Unit klaim garansi di vendor`,
              time: 'Tracking RMA',
              type: 'info'
            });
          }
          if (data.serviceSelesaiBulanIni > 0) {
            list.push({
              id: '3',
              title: `${data.serviceSelesaiBulanIni} Servis berhasil diselesaikan bulan ini`,
              time: 'Update terbaru',
              type: 'success'
            });
          }
          setNotifications(list);
        }
      } catch {
        // ignore
      }
    };
    loadNotifs();
    const interval = setInterval(loadNotifs, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (pathname === '/login') return null;

  let currentMeta: PageMeta = {
    title: config.branding.appName || 'Service Center',
    subtitle: config.branding.appSubtitle || 'Service & Warranty Management System'
  };

  if (pathname === '/') {
    currentMeta = {
      title: getFeatureLabel('dashboard', 'Dashboard'),
      subtitle: PAGE_SUBTITLE_MAP['/']
    };
  } else if (pathname === '/statistik') {
    currentMeta = {
      title: getFeatureLabel('statistik', 'Dashboard Statistik'),
      subtitle: PAGE_SUBTITLE_MAP['/statistik']
    };
  } else if (pathname === '/tickets') {
    currentMeta = {
      title: getFeatureLabel('tickets', 'Daftar Service'),
      subtitle: PAGE_SUBTITLE_MAP['/tickets']
    };
  } else if (pathname === '/tickets/new') {
    currentMeta = {
      title: getFeatureLabel('tickets_new', 'Form Input Service'),
      subtitle: PAGE_SUBTITLE_MAP['/tickets/new']
    };
  } else if (pathname === '/surat-jalan') {
    currentMeta = {
      title: getFeatureLabel('surat_jalan', 'Pengiriman Vendor'),
      subtitle: PAGE_SUBTITLE_MAP['/surat-jalan']
    };
  } else if (pathname === '/alamat') {
    currentMeta = {
      title: getFeatureLabel('cetak_alamat', 'Cetak Alamat Vendor'),
      subtitle: PAGE_SUBTITLE_MAP['/alamat']
    };
  } else if (pathname === '/users') {
    currentMeta = {
      title: getFeatureLabel('users', 'Manajemen User'),
      subtitle: PAGE_SUBTITLE_MAP['/users']
    };
  } else if (pathname.startsWith('/settings/white-label')) {
    currentMeta = {
      title: 'Custom Aplikasi',
      subtitle: PAGE_SUBTITLE_MAP['/settings/white-label']
    };
  } else if (pathname === '/whatsapp') {
    if (currentTab === 'sales') {
      currentMeta = {
        title: getFeatureLabel('wa_sales', 'Laporan WA Garansi Stock'),
        subtitle: 'Broadcast notifikasi stok unit ready & garansi ke sales toko'
      };
    } else if (currentTab === 'quick') {
      currentMeta = {
        title: getFeatureLabel('wa_customer', 'Laporan WA Customer'),
        subtitle: 'Kirim tanda terima & notifikasi servis selesai langsung ke pelanggan'
      };
    } else {
      currentMeta = {
        title: getFeatureLabel('wa_mingguan', 'Laporan WA Mingguan'),
        subtitle: 'Laporan rekapitulasi servis & status pengerjaan mingguan teknisi'
      };
    }
  } else if (pathname === '/master') {
    if (currentTab === 'backup') {
      currentMeta = {
        title: getFeatureLabel('backup_spreadsheet', 'Backup Spreadsheet'),
        subtitle: 'Sinkronisasi & pencadangan otomatis harian database ke Google Spreadsheet'
      };
    } else if (currentTab === 'customer') {
      currentMeta = {
        title: getFeatureLabel('master_customer', 'Master Customer'),
        subtitle: PAGE_SUBTITLE_MAP['/master']
      };
    } else if (currentTab === 'keluhan') {
      currentMeta = {
        title: getFeatureLabel('master_keluhan', 'Preset Form Option'),
        subtitle: PAGE_SUBTITLE_MAP['/master']
      };
    } else {
      currentMeta = {
        title: getFeatureLabel('master_vendor', 'Data Master Vendor'),
        subtitle: PAGE_SUBTITLE_MAP['/master']
      };
    }
  } else if (pathname.startsWith('/tickets/')) {
    currentMeta = {
      title: 'Detail Tiket Servis',
      subtitle: 'Informasi lengkap pengerjaan dan status perangkat'
    };
  } else if (pathname.startsWith('/surat-jalan/')) {
    currentMeta = {
      title: 'Surat Jalan Pengiriman',
      subtitle: 'Dokumen tanda terima pengiriman barang vendor'
    };
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      router.push(`/tickets?search=${encodeURIComponent(q)}`);
    } else {
      router.push('/tickets');
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    if (pathname === '/tickets') {
      router.push('/tickets');
    }
  };

  const currentUserName = user?.nama_lengkap || user?.username || 'Admin';
  const userInitials = (currentUserName.slice(0, 2) || 'AD').toUpperCase();

  return (
    <header className="topbar-container bg-white dark:bg-slate-900 border-b border-slate-200/90 dark:border-slate-800 sticky top-0 z-30 px-3.5 sm:px-6 py-2.5 md:py-0 md:h-20 shrink-0 flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 md:gap-4 transition-colors duration-200">
      {/* Top Row: Hamburger (Mobile) + Page Title & Subtitle + Mobile Right Actions */}
      <div className="flex items-center justify-between gap-3 w-full md:w-auto min-w-0">
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
          <button
            type="button"
            onClick={toggleMobileSidebar}
            className="lg:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors shrink-0"
            aria-label="Buka Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight truncate">
              {currentMeta.title}
            </h1>
            <p className="hidden sm:block text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-normal truncate mt-0.5">
              {currentMeta.subtitle}
            </p>
          </div>
        </div>

        {/* Mobile Right Actions */}
        <div className="flex md:hidden items-center gap-2 shrink-0">
          <button
            type="button"
            data-notif-trigger="true"
            onClick={() => {
              setIsNotificationsOpen(!isNotificationsOpen);
              setIsUserDropdownOpen(false);
            }}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
            aria-label="Notifikasi"
            title="Notifikasi Sistem"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
          </button>

          <button
            type="button"
            data-user-trigger="true"
            onClick={() => {
              setIsUserDropdownOpen(!isUserDropdownOpen);
              setIsNotificationsOpen(false);
            }}
            className="flex items-center p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all"
          >
            <div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0 tracking-tight">
              {userInitials}
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Global Search Bar (<md) */}
      <form onSubmit={handleSearchSubmit} className="w-full md:hidden">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            enterKeyHint="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari no. tiket, nama, barang, serial..."
            className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800/80 focus:bg-white dark:focus:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-700/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden transition-all placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              title="Hapus pencarian"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </form>

      {/* Right: Desktop Search Bar, Notifications & User Profile */}
      <div className="hidden md:flex items-center gap-2.5 sm:gap-4 shrink-0">
        <form onSubmit={handleSearchSubmit} className="w-64 lg:w-80">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari no. tiket, nama, barang, serial..."
              className="w-full pl-9 pr-8 py-1.5 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-700/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                title="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </form>

        <div className="relative">
          <button
            type="button"
            data-notif-trigger="true"
            onClick={() => {
              setIsNotificationsOpen(!isNotificationsOpen);
              setIsUserDropdownOpen(false);
            }}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
            aria-label="Notifikasi"
            title="Notifikasi Sistem"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
          </button>
        </div>

        <div className="relative">
          <button
            type="button"
            data-user-trigger="true"
            onClick={() => {
              setIsUserDropdownOpen(!isUserDropdownOpen);
              setIsNotificationsOpen(false);
            }}
            className="flex items-center gap-2.5 p-1 sm:pl-1.5 sm:pr-2.5 sm:py-1 rounded-full sm:rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all text-left"
          >
            <div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0 tracking-tight">
              {userInitials}
            </div>

            <div className="hidden sm:flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-[100px]">
                {currentUserName}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                  isUserDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </div>
          </button>
        </div>
      </div>

      {/* Shared Notifications Dropdown */}
      {isNotificationsOpen && (
        <div
          ref={notifDropdownRef}
          className="absolute right-3.5 sm:right-16 top-14 md:top-16 w-72 sm:w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between px-2.5 py-2 border-b border-slate-100 dark:border-slate-700/60 mb-2">
            <span className="font-bold text-xs text-slate-900 dark:text-white">Pemberitahuan Servis</span>
            <span className="text-[10px] bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold px-2 py-0.5 rounded-full">
              Live
            </span>
          </div>

          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                Tidak ada notifikasi baru
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/40 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-start gap-2.5 text-left text-xs"
                >
                  <div className="p-1 rounded-lg bg-brand-soft text-brand shrink-0 mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800 dark:text-slate-200 leading-snug">{n.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{n.time}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-700/60">
            <Link
              href="/tickets"
              onClick={() => setIsNotificationsOpen(false)}
              className="block text-center text-[11px] font-bold text-brand hover:underline py-1"
            >
              Lihat Semua Tiket Servis →
            </Link>
          </div>
        </div>
      )}

      {/* Shared User Profile Dropdown Menu */}
      {isUserDropdownOpen && (
        <div
          ref={userDropdownRef}
          className="absolute right-3.5 sm:right-6 top-14 md:top-16 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-2"
        >
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700/60">
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{currentUserName}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 capitalize truncate">
              {user?.role || 'Administrator'} • {config.branding.appName}
            </p>
          </div>

          <div className="px-2 pt-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Tema Tampilan</div>
            <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-700/40 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex items-center justify-center gap-1 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  theme === 'light'
                    ? 'bg-white dark:bg-slate-800 text-brand shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Sun className="w-3 h-3" />
                <span>Light</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex items-center justify-center gap-1 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-white dark:bg-slate-800 text-brand shadow-2xs'
                    : 'text-slate-500 hover:text-white'
                }`}
              >
                <Moon className="w-3 h-3" />
                <span>Dark</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('system')}
                className={`flex items-center justify-center gap-1 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  theme === 'system'
                    ? 'bg-white dark:bg-slate-800 text-brand shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Laptop className="w-3 h-3" />
                <span>Auto</span>
              </button>
            </div>
          </div>

          {user?.role === 'ADMIN' && (
            <div className="px-2 pb-1.5 border-b border-slate-100 dark:border-slate-700/60 space-y-1.5">
              <Link
                href="/settings/white-label"
                onClick={() => setIsUserDropdownOpen(false)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-brand bg-brand-soft hover:opacity-90 transition-opacity"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Custom Aplikasi</span>
              </Link>
              <Link
                href="/users"
                onClick={() => setIsUserDropdownOpen(false)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Manajemen User (Admin)</span>
              </Link>
            </div>
          )}

          <div className="p-1.5 border-t border-slate-100 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => logout()}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors font-semibold text-left cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar (Logout)</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

export function Topbar() {
  return (
    <Suspense fallback={null}>
      <TopbarContent />
    </Suspense>
  );
}
