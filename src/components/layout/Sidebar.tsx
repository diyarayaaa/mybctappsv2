'use client';

import React, { useState, useRef, useCallback, Suspense, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  HelpCircle,
  Settings,
  Pin,
  PinOff,
  X,
  Wrench,
  Phone,
  Mail,
  Moon,
  Sun,
  Laptop,
  SlidersHorizontal
} from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useAuth } from '@/components/auth/AuthProvider';
import { useAppConfig } from '@/components/config/AppConfigProvider';
import { getLucideIcon } from '@/lib/icon-registry';

interface DynamicNavItem {
  key: string;
  name: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

interface DynamicNavGroup {
  groupName: string;
  items: DynamicNavItem[];
}

function SidebarNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams ? searchParams.get('tab') : null;

  const { user } = useAuth();
  const { config } = useAppConfig();

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
    }, 100);
  }, []);

  // Build navigation groups dynamically from AppConfig feature toggles
  const navigationGroups = useMemo<DynamicNavGroup[]>(() => {
    const groupOrder = ['UTAMA', 'OPERASIONAL', 'KOMUNIKASI', 'DATA MASTER', 'ADMINISTRASI', 'PENGATURAN'];
    const map = new Map<string, DynamicNavItem[]>();

    for (const g of groupOrder) {
      map.set(g, []);
    }

    const sortedFeatures = [...config.features].sort((a, b) => a.sort_order - b.sort_order);

    for (const f of sortedFeatures) {
      if (!f.is_enabled && f.feature_key !== 'dashboard') continue;
      if (f.admin_only && user?.role !== 'ADMIN') continue;

      const list = map.get(f.group_name) || [];
      list.push({
        key: f.feature_key,
        name: f.custom_label || f.default_label,
        href: f.href,
        icon: getLucideIcon(f.icon),
        adminOnly: f.admin_only
      });
      map.set(f.group_name, list);
    }

    // Always inject White-Label Settings for ADMIN only under ADMINISTRASI
    if (user?.role === 'ADMIN') {
      const adminGroup = map.get('ADMINISTRASI') || [];
      adminGroup.push({
        key: 'white_label_settings',
        name: 'Custom Aplikasi',
        href: '/settings/white-label',
        icon: SlidersHorizontal,
        adminOnly: true
      });
      map.set('ADMINISTRASI', adminGroup);
    }

    const groups: DynamicNavGroup[] = [];
    map.forEach((items, groupName) => {
      if (items.length > 0) {
        groups.push({ groupName, items });
      }
    });
    return groups;
  }, [config.features, user?.role]);

  // If on login page, don't show sidebar
  if (pathname === '/login') return null;

  const isExpanded = isSidebarPinned || isHovered;

  // Exact matching helper to prevent multi-highlight bug
  const isItemActive = (href: string) => {
    const [targetPath, targetQuery] = href.split('?');
    const targetParams = new URLSearchParams(targetQuery || '');
    const targetTab = targetParams.get('tab');

    if (href === '/') return pathname === '/';
    if (href === '/statistik') return pathname === '/statistik' || pathname.startsWith('/statistik/');
    if (href === '/settings/white-label') return pathname.startsWith('/settings/white-label');
    if (href === '/tickets/new') return pathname === '/tickets/new';
    if (href === '/tickets') {
      return pathname === '/tickets' || (pathname.startsWith('/tickets/') && pathname !== '/tickets/new');
    }
    if (href === '/surat-jalan') {
      return (pathname === '/surat-jalan' && (!currentTab || currentTab !== 'cetak')) || (pathname.startsWith('/surat-jalan/') && !pathname.includes('print'));
    }
    if (targetPath === '/whatsapp') {
      if (pathname !== '/whatsapp') return false;
      if (targetTab === 'sales') return currentTab === 'sales';
      if (targetTab === 'quick') return currentTab === 'quick';
      return !currentTab || currentTab === 'operational';
    }
    if (targetPath === '/master') {
      if (pathname !== '/master') return false;
      if (targetTab === 'customer') return currentTab === 'customer';
      if (targetTab === 'keluhan') return currentTab === 'keluhan';
      if (targetTab === 'backup') return currentTab === 'backup';
      return !currentTab || currentTab === 'vendor';
    }

    return pathname === targetPath;
  };

  const renderSidebarContent = (isMobile = false) => {
    const expanded = isMobile ? true : isExpanded;
    const { appName, appSubtitle, logoUrl } = config.branding;

    return (
      <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 select-none">
        {/* 1. Header / Dynamic Brand Logo */}
        <div className="h-20 px-3 border-b border-slate-200/90 dark:border-slate-800 flex items-center shrink-0">
          <div className="flex items-center justify-between w-full min-h-[36px]">
            <Link
              href="/"
              onClick={() => {
                if (isMobile) setIsMobileSidebarOpen(false);
              }}
              className={`flex items-center gap-2.5 overflow-hidden ${expanded ? 'px-1' : 'justify-center w-full'}`}
            >
              <img
                src={logoUrl || '/logo.png'}
                alt={appName || 'Logo'}
                className="h-8 w-8 shrink-0 object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/logo.png';
                }}
              />

              {expanded && (
                <div className="min-w-0 truncate">
                  <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white leading-none block truncate">
                    {appName || 'BEST COMPUTEL'}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold leading-tight block mt-1 truncate">
                    {appSubtitle || 'RMA & Service'}
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
                className={`hidden lg:flex p-1.5 rounded-lg transition-colors text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 ${isSidebarPinned ? 'text-brand bg-brand-soft' : ''
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
        </div>

        {/* 2. Dynamic Navigation Groups List */}
        <div className="flex-1 py-2 px-2 overflow-y-auto overflow-x-hidden space-y-3">
          {navigationGroups.map((group) => (
            <div key={group.groupName} className="space-y-1">
              {expanded ? (
                <div className="px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 truncate">
                  {group.groupName}
                </div>
              ) : (
                <div className="my-1 border-t border-slate-100 dark:border-slate-800/80 mx-1" />
              )}

              {group.items.map((item) => {
                const active = isItemActive(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={() => {
                      if (isMobile) setIsMobileSidebarOpen(false);
                    }}
                    title={!expanded ? item.name : undefined}
                    className={`flex items-center rounded-xl text-xs transition-colors duration-100 group relative ${expanded
                      ? 'gap-2.5 px-3 py-2 font-medium'
                      : 'justify-center p-2.5 w-10 h-10 mx-auto'
                      } ${active
                        ? 'bg-brand-soft text-brand font-semibold border border-brand shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80'
                      }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${active
                        ? 'text-brand'
                        : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                        }`}
                    />

                    {expanded && <span className="truncate whitespace-nowrap">{item.name}</span>}

                    {!expanded && (
                      <span className="fixed left-16 ml-2.5 px-2.5 py-1 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl border border-slate-700 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                        {item.name}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* 3. Bottom Pinned Items: Support & Settings */}
        <div className="p-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1">
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

          <button
            type="button"
            onClick={() => {
              setIsSettingsModalOpen(true);
              if (isMobile) setIsMobileSidebarOpen(false);
            }}
            title={!expanded ? 'Pengaturan Tampilan' : undefined}
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
                <div className="p-2 rounded-xl bg-brand-soft text-brand">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Support & Bantuan</h3>
                  <p className="text-xs text-slate-500">{config.branding.appName} Service Desk</p>
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
                  <Wrench className="w-4 h-4 text-brand" />
                  {config.branding.appName} — {config.branding.appSubtitle}
                </p>
                <p className="text-slate-500 leading-relaxed">
                  Sistem manajemen tiket servis, tracking garansi vendor, cetak tanda terima & surat jalan.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                  <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Kontak Toko / Support</p>
                    <p className="text-slate-500">{config.branding.companyPhone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                  <Mail className="w-4 h-4 text-brand shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Alamat Operasional</p>
                    <p className="text-slate-500">{config.branding.companyAddress}</p>
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
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Mode Warna Tema
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-colors ${theme === 'light'
                      ? 'border-brand bg-brand-soft text-brand font-semibold'
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
                      ? 'border-brand bg-brand-soft text-brand font-semibold'
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
                      ? 'border-brand bg-brand-soft text-brand font-semibold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                  >
                    <Laptop className="w-4 h-4 text-slate-400" />
                    <span>Otomatis</span>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Sematkan Menu Samping (Pin)</p>
                  <p className="text-[11px] text-slate-500">Kunci menu agar tetap terbuka atau aktifkan auto-hide</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSidebarPin()}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${isSidebarPinned
                    ? 'bg-brand text-white shadow-xs'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                >
                  {isSidebarPinned ? 'Terkunci' : 'Auto-Hide (Aktif)'}
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
