'use client';

import React, { useState, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  PlusCircle,
  ClipboardList,
  Truck,
  MessageSquare,
  Database,
  Users,
  SlidersHorizontal,
  Printer,
  HelpCircle,
  Settings,
  ChevronDown,
  Pin,
  PinOff,
  X,
  Boxes,
  Check,
  ShieldCheck,
  Wrench,
  Phone,
  Mail,
  Moon,
  Sun,
  Laptop
} from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';

import { useAuth } from '@/components/auth/AuthProvider';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

interface NavGroup {
  groupName: string;
  items: NavItem[];
}

const NAVIGATION_GROUPS: NavGroup[] = [
  {
    groupName: 'UTAMA',
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard }
    ]
  },
  {
    groupName: 'OPERASIONAL',
    items: [
      { name: 'Form Input Service', href: '/tickets/new', icon: PlusCircle },
      { name: 'Daftar Service', href: '/tickets', icon: ClipboardList },
      { name: 'Pengiriman Vendor', href: '/surat-jalan', icon: Truck },
      { name: 'Portal Tracking Publik', href: '/tracking', icon: ShieldCheck }
    ]
  },
  {
    groupName: 'KOMUNIKASI',
    items: [
      { name: 'Laporan WA Mingguan', href: '/whatsapp', icon: MessageSquare },
      { name: 'Laporan WA Garansi Stock', href: '/whatsapp?tab=sales', icon: Boxes },
      { name: 'Laporan WA Customer', href: '/whatsapp?tab=quick', icon: Users }
    ]
  },
  {
    groupName: 'DATA MASTER',
    items: [
      { name: 'Data Master Vendor', href: '/master', icon: Database },
      { name: 'Master Customer', href: '/master?tab=customer', icon: Users }
    ]
  },
  {
    groupName: 'ADMINISTRASI',
    items: [
      { name: 'Manajemen User', href: '/users', icon: ShieldCheck, adminOnly: true }
    ]
  },
  {
    groupName: 'PENGATURAN',
    items: [
      { name: 'Preset Form Option', href: '/master?tab=keluhan', icon: SlidersHorizontal },
      { name: 'Cetak Alamat', href: '/surat-jalan?tab=cetak', icon: Printer }
    ]
  }
];

function SidebarNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams ? searchParams.get('tab') : null;

  const { user } = useAuth();

  const {
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    isSidebarPinned,
    toggleSidebarPin,
    theme,
    setTheme
  } = useTheme();

  // Hover state for auto-hide
  const [isHovered, setIsHovered] = useState(false);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [activeBranch, setActiveBranch] = useState('BCT SERVICE');
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
      setIsBranchDropdownOpen(false);
    }, 100);
  }, []);

  // If on login page, don't show sidebar
  if (pathname === '/login') return null;

  const isExpanded = isSidebarPinned || isHovered;

  // Exact matching helper to prevent multi-highlight bug
  const isItemActive = (href: string) => {
    const [targetPath, targetQuery] = href.split('?');
    const targetParams = new URLSearchParams(targetQuery || '');
    const targetTab = targetParams.get('tab');

    // 1. Dashboard
    if (href === '/') {
      return pathname === '/';
    }

    // 2. Form Input Service (/tickets/new)
    if (href === '/tickets/new') {
      return pathname === '/tickets/new';
    }

    // 3. Daftar Service (/tickets) - must NOT match /tickets/new
    if (href === '/tickets') {
      return pathname === '/tickets' || (pathname.startsWith('/tickets/') && pathname !== '/tickets/new');
    }

    // 4. Pengiriman Vendor (/surat-jalan)
    if (href === '/surat-jalan') {
      return (pathname === '/surat-jalan' && (!currentTab || currentTab !== 'cetak')) || (pathname.startsWith('/surat-jalan/') && !pathname.includes('print'));
    }

    // 5. Cetak Alamat (/surat-jalan?tab=cetak)
    if (href === '/surat-jalan?tab=cetak') {
      return pathname === '/surat-jalan' && currentTab === 'cetak';
    }

    // 6. Laporan WhatsApp tabs (/whatsapp)
    if (targetPath === '/whatsapp') {
      if (pathname !== '/whatsapp') return false;
      if (targetTab === 'sales') {
        return currentTab === 'sales';
      }
      if (targetTab === 'quick') {
        return currentTab === 'quick';
      }
      // Default: operational (Laporan WA Mingguan)
      return !currentTab || currentTab === 'operational';
    }

    // 7. Master Data tabs (/master)
    if (targetPath === '/master') {
      if (pathname !== '/master') return false;
      if (targetTab === 'customer') {
        return currentTab === 'customer';
      }
      if (targetTab === 'keluhan') {
        return currentTab === 'keluhan';
      }
      // Default: vendor
      return !currentTab || currentTab === 'vendor';
    }

    return pathname === targetPath;
  };

  const renderSidebarContent = (isMobile = false) => {
    const expanded = isMobile ? true : isExpanded;

    return (
      <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 select-none">
        {/* 1. Header / Brand Logo */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center justify-between min-h-[36px]">
            <Link
              href="/"
              onClick={() => {
                if (isMobile) setIsMobileSidebarOpen(false);
              }}
              className={`flex items-center gap-2.5 overflow-hidden ${expanded ? 'px-1' : 'justify-center w-full'
                }`}
            >
              {/* Logo Best Computel */}
              <img
                src="/logo.png"
                alt="Best Computel"
                className="h-7 w-7 shrink-0 object-contain"
              />

              {expanded && (
                <div className="min-w-0 truncate">
                  <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white uppercase leading-none block">
                    BEST COMPUTEL BCT
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium leading-tight">
                    Service & RMA System
                  </span>
                </div>
              )}
            </Link>

            {/* Pin / Unpin button when expanded on desktop */}
            {!isMobile && expanded && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsHovered(true);
                  toggleSidebarPin();
                }}
                className={`hidden lg:flex p-1.5 rounded-lg transition-colors text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 ${isSidebarPinned ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50' : ''
                  }`}
                title={isSidebarPinned ? 'Lepas Sematan (Auto-hide aktif)' : 'Sematkan Menu (Selalu Terbuka)'}
                aria-label="Toggle Pin Sidebar"
              >
                {isSidebarPinned ? <Pin className="w-4 h-4 rotate-45" /> : <PinOff className="w-4 h-4" />}
              </button>
            )}

            {/* Close button on Mobile */}
            {isMobile && (
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Tutup Menu"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Branch / Service Selector Pill */}
          {expanded && (
            <div className="mt-2.5 relative">
              <button
                type="button"
                onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl transition-colors shadow-2xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <Boxes className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="truncate">{activeBranch}</span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${isBranchDropdownOpen ? 'rotate-180' : ''
                    }`}
                />
              </button>

              {/* Dropdown Options */}
              {isBranchDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                  {['BCT SERVICE', 'BCT GHITP', 'BCT STORE'].map((branch) => (
                    <button
                      key={branch}
                      type="button"
                      onClick={() => {
                        setActiveBranch(branch);
                        setIsBranchDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left ${activeBranch === branch
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                        }`}
                    >
                      <span>{branch}</span>
                      {activeBranch === branch && <Check className="w-3 h-3 text-blue-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. Navigation Groups List */}
        <div className="flex-1 py-2 px-2 overflow-y-auto overflow-x-hidden space-y-3">
          {NAVIGATION_GROUPS.map((group) => {
            const visibleItems = group.items.filter(
              (item) => !item.adminOnly || user?.role === 'ADMIN'
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.groupName} className="space-y-1">
                {/* Section Header */}
                {expanded ? (
                  <div className="px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 truncate">
                    {group.groupName}
                  </div>
                ) : (
                  <div className="my-1 border-t border-slate-100 dark:border-slate-800/80 mx-1" />
                )}

                {/* Group Nav Items */}
                {visibleItems.map((item) => {
                  const active = isItemActive(item.href);
                  const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => {
                      if (isMobile) setIsMobileSidebarOpen(false);
                    }}
                    title={!expanded ? item.name : undefined}
                    className={`flex items-center rounded-xl text-xs transition-colors duration-100 group relative ${expanded
                      ? 'gap-2.5 px-3 py-2 font-medium'
                      : 'justify-center p-2.5 w-10 h-10 mx-auto'
                      } ${active
                        ? 'bg-blue-500/15 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-semibold border border-blue-300/80 dark:border-blue-700/60 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80'
                      }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${active
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                        }`}
                    />

                    {expanded && <span className="truncate whitespace-nowrap">{item.name}</span>}

                    {/* Floating tooltip on compact/collapsed mode on desktop */}
                    {!expanded && (
                      <span className="fixed left-16 ml-2.5 px-2.5 py-1 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl border border-slate-700 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                        {item.name}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
        </div>

        {/* 3. Bottom Pinned Items: Support & Settings */}
        <div className="p-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1">
          {/* Support Button */}
          <button
            type="button"
            onClick={() => {
              setIsSupportModalOpen(true);
              if (isMobile) setIsMobileSidebarOpen(false);
            }}
            title={!expanded ? 'Support & Bantuan' : undefined}
            className={`w-full flex items-center rounded-xl text-xs transition-colors duration-100 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 group ${expanded ? 'gap-2.5 px-3 py-2 font-medium' : 'justify-center p-2.5 w-10 h-10 mx-auto'
              }`}
          >
            <HelpCircle className="w-4 h-4 shrink-0 text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white" />
            {expanded && <span className="whitespace-nowrap">Support & Bantuan</span>}
            {!expanded && (
              <span className="fixed left-16 ml-2.5 px-2.5 py-1 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl border border-slate-700 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[60] whitespace-nowrap">
                Support
              </span>
            )}
          </button>

          {/* Settings Button */}
          <button
            type="button"
            onClick={() => {
              setIsSettingsModalOpen(true);
              if (isMobile) setIsMobileSidebarOpen(false);
            }}
            title={!expanded ? 'Pengaturan' : undefined}
            className={`w-full flex items-center rounded-xl text-xs transition-colors duration-100 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 group ${expanded ? 'gap-2.5 px-3 py-2 font-medium' : 'justify-center p-2.5 w-10 h-10 mx-auto'
              }`}
          >
            <Settings className="w-4 h-4 shrink-0 text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white" />
            {expanded && <span className="whitespace-nowrap">Pengaturan Tampilan</span>}
            {!expanded && (
              <span className="fixed left-16 ml-2.5 px-2.5 py-1 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl border border-slate-700 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[60] whitespace-nowrap">
                Settings
              </span>
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Floating/Expanding Sidebar */}
      <aside
        className={`sidebar-container hidden lg:block fixed top-0 left-0 bottom-0 z-50 transition-[width,box-shadow] duration-200 ease-out will-change-[width] ${isExpanded
          ? 'w-64 shadow-2xl ring-1 ring-slate-900/5 dark:ring-white/10'
          : 'w-16 shadow-xs'
          }`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Drawer */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="relative w-64 max-w-[75vw] sm:w-72 h-full shadow-2xl z-10 animate-in slide-in-from-left duration-150">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}

      {/* Support Modal */}
      {isSupportModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Support & Bantuan</h3>
                  <p className="text-xs text-slate-500">Best Computel Service Desk</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSupportModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-blue-600" />
                  BCT Service & RMA Management v1.0
                </p>
                <p className="text-slate-500 leading-relaxed">
                  Sistem otomatisasi pencatatan tiket servis, tracking garansi vendor, print surat jalan, dan broadcast WhatsApp.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                  <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Hotline IT Support</p>
                    <p className="text-slate-500">+62 812-3456-7890 (Wandi / Satryo)</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                  <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Email Helpdesk</p>
                    <p className="text-slate-500">support@bestcomputel.com</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsSupportModalOpen(false)}
                className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold rounded-xl text-xs hover:opacity-90 transition-opacity"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Pengaturan Tampilan</h3>
                  <p className="text-xs text-slate-500">Kustomisasi tema & perilaku menu</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Tema Tampilan */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Mode Warna Tema
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-colors ${theme === 'light'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 font-semibold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                  >
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span>Terang</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-colors ${theme === 'dark'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-400 font-semibold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                  >
                    <Moon className="w-4 h-4 text-indigo-400" />
                    <span>Gelap</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('system')}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-colors ${theme === 'system'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 font-semibold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                  >
                    <Laptop className="w-4 h-4 text-slate-400" />
                    <span>Otomatis</span>
                  </button>
                </div>
              </div>

              {/* Auto-Hide Toggle */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Sematkan Menu Samping (Pin)</p>
                  <p className="text-[11px] text-slate-500">Kunci menu agar tetap terbuka atau aktifkan auto-hide</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSidebarPin()}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${isSidebarPinned
                    ? 'bg-blue-500 text-white shadow-xs'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                >
                  {isSidebarPinned ? 'Terselip/Terkunci' : 'Auto-Hide (Aktif)'}
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold rounded-xl text-xs hover:opacity-90 transition-opacity"
              >
                Simpan & Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function Sidebar() {
  return (
    <Suspense fallback={null}>
      <SidebarNav />
    </Suspense>
  );
}
