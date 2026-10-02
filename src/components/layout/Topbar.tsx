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
  Check,
  User,
  Sun,
  Moon,
  Laptop,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  Plus
} from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useAuth } from '@/components/auth/AuthProvider';

interface PageMeta {
  title: string;
  subtitle: string;
}

const PAGE_META_MAP: Record<string, PageMeta> = {
  '/': {
    title: 'Dashboard',
    subtitle: 'Monitoring antrean servis, performa teknisi & status unit'
  },
  '/tickets': {
    title: 'Daftar Service',
    subtitle: 'Kelola dan lacak semua antrean tiket servis & klaim garansi'
  },
  '/tickets/new': {
    title: 'Form Input Service',
    subtitle: 'Register a new service ticket for a customer device'
  },
  '/surat-jalan': {
    title: 'Pengiriman Vendor',
    subtitle: 'Kelola pengiriman unit garansi RMA dan cetak surat jalan'
  },
  '/whatsapp': {
    title: 'Laporan WhatsApp',
    subtitle: 'Broadcast dan notifikasi otomatis ke customer & sales'
  },
  '/master': {
    title: 'Data Master & Pengaturan',
    subtitle: 'Kelola database vendor, customer, dan preset opsi servis'
  },
  '/logs': {
    title: 'Audit Log Trail',
    subtitle: 'Riwayat lengkap aktivitas dan perubahan status sistem'
  },
  '/users': {
    title: 'Manajemen Pengguna',
    subtitle: 'Kelola akun teknisi, hak akses role admin & persetujuan login'
  }
};

function TopbarContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams ? searchParams.get('tab') : null;
  const { toggleMobileSidebar, theme, setTheme } = useTheme();
  const { user, logout } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; title: string; time: string; type: string }[]>([]);

  const userDropdownRef = useRef<HTMLDivElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch quick notification alerts
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
  }, []);

  // If on login page, don't show topbar
  if (pathname === '/login') return null;

  // Determine current page title and subtitle
  let currentMeta: PageMeta = {
    title: 'BCT Service',
    subtitle: 'Service & Warranty Management System'
  };

  if (pathname === '/whatsapp') {
    if (currentTab === 'sales') {
      currentMeta = {
        title: 'Laporan WA Garansi Stock',
        subtitle: 'Broadcast notifikasi stok unit ready & garansi ke sales toko'
      };
    } else if (currentTab === 'quick') {
      currentMeta = {
        title: 'Laporan WA Customer',
        subtitle: 'Kirim tanda terima & notifikasi servis selesai langsung ke pelanggan'
      };
    } else {
      currentMeta = {
        title: 'Laporan WA Mingguan',
        subtitle: 'Laporan rekapitulasi servis & status pengerjaan mingguan teknisi'
      };
    }
  } else if (PAGE_META_MAP[pathname]) {
    currentMeta = PAGE_META_MAP[pathname];
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
    if (searchQuery.trim()) {
      router.push(`/tickets?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const currentUserName = user?.nama_lengkap || user?.username || 'Admin';
  const userInitials = (currentUserName.slice(0, 2) || 'AD').toUpperCase();

  return (
    <header className="topbar-container bg-white dark:bg-slate-900 border-b border-slate-200/90 dark:border-slate-800 sticky top-0 z-30 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4 transition-colors duration-200">
      {/* Left: Hamburger (Mobile) + Page Title & Subtitle */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        {/* Mobile Sidebar Hamburger Toggle */}
        <button
          type="button"
          onClick={toggleMobileSidebar}
          className="lg:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors shrink-0"
          aria-label="Buka Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Dynamic Page Header & Subtitle */}
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight truncate">
            {currentMeta.title}
          </h1>
          <p className="hidden sm:block text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-normal truncate mt-0.5">
            {currentMeta.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Search Bar, Notifications & User Profile */}
      <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
        {/* Search Bar matching screenshot */}
        <form onSubmit={handleSearchSubmit} className="hidden md:block w-64 lg:w-80">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-700/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden transition-all"
            />
          </div>
        </form>

        {/* Notification Bell */}
        <div className="relative" ref={notifDropdownRef}>
          <button
            type="button"
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
            aria-label="Notifikasi"
            title="Notifikasi Sistem"
          >
            <Bell className="w-5 h-5" />
            {/* Red Badge Dot */}
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
          </button>

          {/* Notifications Dropdown */}
          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
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
                      <div className="p-1 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
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
                  className="block text-center text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline py-1"
                >
                  Lihat Semua Tiket Servis →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill matching screenshot */}
        <div className="relative" ref={userDropdownRef}>
          <button
            type="button"
            onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
            className="flex items-center gap-2.5 p-1 sm:pl-1.5 sm:pr-2.5 sm:py-1 rounded-full sm:rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all text-left"
          >
            {/* Initials Circle */}
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0 tracking-tight">
              {userInitials}
            </div>

            {/* Name + Chevron */}
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

          {/* User Profile Dropdown Menu */}
          {isUserDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-2">
              {/* Account Info */}
              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700/60">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{currentUserName}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">
                  {user?.role || 'Administrator'} • BCT Service
                </p>
              </div>

              {/* Quick Theme Switcher */}
              <div className="px-2 pt-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Tema Tampilan</div>
                <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-700/40 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`flex items-center justify-center gap-1 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                      theme === 'light'
                        ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-2xs'
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
                        ? 'bg-white dark:bg-slate-800 text-blue-400 shadow-2xs'
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
                        ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Laptop className="w-3 h-3" />
                    <span>Auto</span>
                  </button>
                </div>
              </div>

              {/* Admin Link to Manajemen User */}
              {user?.role === 'ADMIN' && (
                <div className="px-2 pb-1.5 border-b border-slate-100 dark:border-slate-700/60">
                  <Link
                    href="/users"
                    onClick={() => setIsUserDropdownOpen(false)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Manajemen User (Admin)</span>
                  </Link>
                </div>
              )}

              {/* Logout Button */}
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
        </div>
      </div>
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
