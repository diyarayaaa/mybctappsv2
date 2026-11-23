'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppConfig, CustomFieldConfig } from '@/types';
import { DEFAULT_APP_CONFIG } from '@/lib/white-label-defaults';

interface AppConfigContextType {
  config: AppConfig;
  isLoading: boolean;
  refreshConfig: () => Promise<void>;
  updateConfig: (
    partial: Partial<AppConfig>
  ) => Promise<{ ok: boolean; message?: string; error?: string }>;
  resetConfig: () => Promise<{ ok: boolean; message?: string; error?: string }>;
  isFeatureEnabled: (featureKey: string) => boolean;
  isRouteEnabled: (pathname: string, tab?: string | null) => boolean;
  getFeatureLabel: (featureKey: string, fallback?: string) => string;
  getFieldConfig: (fieldKey: string) => CustomFieldConfig | undefined;
  getFieldLabel: (fieldKey: string, fallback: string) => string;
  isFieldVisible: (fieldKey: string) => boolean;
  isFieldRequired: (fieldKey: string, defaultRequired?: boolean) => boolean;
}

const AppConfigContext = createContext<AppConfigContextType | undefined>(undefined);

const CACHE_KEY = 'bct_whitelabel_config_v1';

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const num = parseInt(full, 16);
  if (isNaN(num)) return { r: 37, g: 99, b: 235 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function darkenHex(hex: string, factor = 0.84): string {
  const { r, g, b } = hexToRgb(hex);
  const dr = Math.max(0, Math.round(r * factor));
  const dg = Math.max(0, Math.round(g * factor));
  const db = Math.max(0, Math.round(b * factor));
  return `#${[dr, dg, db].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function applyBrandingToDocument(config: AppConfig) {
  if (typeof document === 'undefined') return;
  const { appName, appSubtitle, logoUrl, primaryColor } = config.branding;

  // 1. Update CSS custom properties for primary accent color
  const primary = primaryColor || '#2563eb';
  const hover = darkenHex(primary, 0.84);
  const { r, g, b } = hexToRgb(primary);

  const root = document.documentElement;
  root.style.setProperty('--brand-primary', primary);
  root.style.setProperty('--brand-primary-hover', hover);
  root.style.setProperty('--brand-primary-rgb', `${r}, ${g}, ${b}`);
  root.style.setProperty('--brand-primary-soft', `rgba(${r}, ${g}, ${b}, 0.14)`);
  root.style.setProperty('--brand-primary-border', `rgba(${r}, ${g}, ${b}, 0.35)`);
  root.style.setProperty('--accent-blue', primary);
  root.style.setProperty('--accent-blue-hover', hover);

  // 2. Update document title
  if (appName) {
    document.title = appSubtitle ? `${appName} — ${appSubtitle}` : appName;
  }

  // 3. Dynamically update browser favicon
  if (logoUrl) {
    let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = logoUrl;

    const shortcut = document.querySelector("link[rel='shortcut icon']") as HTMLLinkElement | null;
    if (shortcut) {
      shortcut.href = logoUrl;
    }
  }
}

export function AppConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_APP_CONFIG);
  const [isLoading, setIsLoading] = useState(true);

  const refreshConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/app', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.config) {
        setConfig(data.config);
        applyBrandingToDocument(data.config);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(data.config));
        } catch {}
      }
    } catch (err) {
      console.error('[AppConfigProvider] Failed to fetch config:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Hydrate quickly from cache to avoid flicker
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as AppConfig;
        if (parsed && parsed.branding) {
          setConfig(parsed);
          applyBrandingToDocument(parsed);
        }
      }
    } catch {}

    refreshConfig();
  }, [refreshConfig]);

  useEffect(() => {
    applyBrandingToDocument(config);
  }, [config]);

  const updateConfig = useCallback(async (partial: Partial<AppConfig>) => {
    try {
      const res = await fetch('/api/settings/app', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partial)
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        return { ok: false, error: data.error || 'Gagal menyimpan konfigurasi' };
      }
      if (data.config) {
        setConfig(data.config);
        applyBrandingToDocument(data.config);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(data.config));
        } catch {}
      }
      return { ok: true, message: data.message || 'Konfigurasi berhasil disimpan' };
    } catch (err) {
      return { ok: false, error: (err as Error).message || 'Kesalahan jaringan' };
    }
  }, []);

  const resetConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/app', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || data.error) {
        return { ok: false, error: data.error || 'Gagal mereset konfigurasi' };
      }
      if (data.config) {
        setConfig(data.config);
        applyBrandingToDocument(data.config);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(data.config));
        } catch {}
      }
      return { ok: true, message: data.message || 'Konfigurasi berhasil direset ke default' };
    } catch (err) {
      return { ok: false, error: (err as Error).message || 'Kesalahan jaringan' };
    }
  }, []);

  const isFeatureEnabled = useCallback(
    (featureKey: string): boolean => {
      if (featureKey === 'dashboard') return true;
      const found = config.features.find((f) => f.feature_key === featureKey);
      return found ? found.is_enabled : true;
    },
    [config.features]
  );

  const isRouteEnabled = useCallback(
    (pathname: string, tab?: string | null): boolean => {
      // Always allow login, root dashboard, white-label settings, users, and ticket details when tickets enabled
      if (
        !pathname ||
        pathname === '/' ||
        pathname === '/login' ||
        pathname.startsWith('/settings') ||
        pathname === '/users'
      ) {
        return true;
      }

      if (pathname.startsWith('/statistik')) return isFeatureEnabled('statistik');
      if (pathname === '/tickets/new') return isFeatureEnabled('tickets_new');
      if (pathname.startsWith('/tickets')) return isFeatureEnabled('tickets');
      if (pathname.startsWith('/surat-jalan')) return isFeatureEnabled('surat_jalan');
      if (pathname.startsWith('/tracking')) return isFeatureEnabled('tracking');
      if (pathname.startsWith('/alamat')) return isFeatureEnabled('cetak_alamat');

      if (pathname === '/whatsapp') {
        if (tab === 'sales') return isFeatureEnabled('wa_sales');
        if (tab === 'quick') return isFeatureEnabled('wa_customer');
        return isFeatureEnabled('wa_mingguan');
      }

      if (pathname === '/master') {
        if (tab === 'customer') return isFeatureEnabled('master_customer');
        if (tab === 'keluhan') return isFeatureEnabled('master_keluhan');
        if (tab === 'backup') return isFeatureEnabled('backup_spreadsheet');
        return isFeatureEnabled('master_vendor');
      }

      return true;
    },
    [isFeatureEnabled]
  );

  const getFeatureLabel = useCallback(
    (featureKey: string, fallback?: string): string => {
      const found = config.features.find((f) => f.feature_key === featureKey);
      return found?.custom_label || found?.default_label || fallback || featureKey;
    },
    [config.features]
  );

  const getFieldConfig = useCallback(
    (fieldKey: string): CustomFieldConfig | undefined => {
      return config.fields.find((f) => f.field_key === fieldKey);
    },
    [config.fields]
  );

  const getFieldLabel = useCallback(
    (fieldKey: string, fallback: string): string => {
      const found = config.fields.find((f) => f.field_key === fieldKey);
      return found?.label || fallback;
    },
    [config.fields]
  );

  const isFieldVisible = useCallback(
    (fieldKey: string): boolean => {
      const found = config.fields.find((f) => f.field_key === fieldKey);
      return found ? found.is_visible_in_form : true;
    },
    [config.fields]
  );

  const isFieldRequired = useCallback(
    (fieldKey: string, defaultRequired = false): boolean => {
      const found = config.fields.find((f) => f.field_key === fieldKey);
      return found ? found.is_required : defaultRequired;
    },
    [config.fields]
  );

  return (
    <AppConfigContext.Provider
      value={{
        config,
        isLoading,
        refreshConfig,
        updateConfig,
        resetConfig,
        isFeatureEnabled,
        isRouteEnabled,
        getFeatureLabel,
        getFieldConfig,
        getFieldLabel,
        isFieldVisible,
        isFieldRequired
      }}
    >
      {children}
    </AppConfigContext.Provider>
  );
}

export function useAppConfig() {
  const ctx = useContext(AppConfigContext);
  if (!ctx) {
    throw new Error('useAppConfig must be used within an AppConfigProvider');
  }
  return ctx;
}

