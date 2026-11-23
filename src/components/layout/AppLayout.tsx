'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useAppConfig } from '@/components/config/AppConfigProvider';
import { useAuth } from '@/components/auth/AuthProvider';
import { ShieldAlert, ArrowLeft, Sliders } from 'lucide-react';

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const { isSidebarPinned } = useTheme();
  const { isRouteEnabled } = useAppConfig();
  const { user } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams ? searchParams.get('tab') : null;

  // If on login page or customer tracking page, render full screen without dashboard chrome
  if (pathname === '/login') {
    return <main className="w-full min-h-screen">{children}</main>;
  }

  if (pathname?.startsWith('/tracking')) {
    if (!isRouteEnabled('/tracking')) {
      return (
        <main className="w-full min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              Portal Tracking Sedang Dinonaktifkan
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Fitur ini saat ini dinonaktifkan oleh Administrator aplikasi.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand hover:bg-brand-hover transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Halaman Login</span>
            </Link>
          </div>
        </main>
      );
    }
    return <main className="w-full min-h-screen">{children}</main>;
  }

  const routeAllowed = isRouteEnabled(pathname || '/', currentTab);

  return (
    <div className="flex min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-h-screen min-w-0 overflow-x-hidden ${
          isSidebarPinned ? 'lg:pl-64' : 'lg:pl-16'
        }`}
      >
        <Topbar />
        <main className="flex-1 p-3 sm:p-5 lg:px-6 lg:py-5 bg-slate-50/70 dark:bg-slate-950 min-w-0">
          {routeAllowed ? (
            children
          ) : (
            <div className="max-w-lg mx-auto my-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                  Modul Fitur Dinonaktifkan
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Halaman atau fitur ini sedang dinonaktifkan melalui pengaturan White-Label oleh Administrator.
                </p>
              </div>
              <div className="flex items-center justify-center flex-wrap gap-2 pt-2">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Kembali ke Dashboard</span>
                </Link>
                {user?.role === 'ADMIN' && (
                  <Link
                    href="/settings/white-label?tab=features"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand hover:bg-brand-hover transition-colors"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Aktifkan di Custom Aplikasi</span>
                  </Link>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AppLayoutInner>{children}</AppLayoutInner>
    </Suspense>
  );
}
