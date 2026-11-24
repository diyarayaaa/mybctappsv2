'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Palette,
  Sliders,
  LayoutGrid,
  FormInput,
  Save,
  RotateCcw,
  Upload,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  SlidersHorizontal,
  GripVertical,
  X,
  ListChecks
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useAppConfig } from '@/components/config/AppConfigProvider';
import {
  AppConfig,
  ColorSchemeKey,
  CustomFieldConfig,
  CustomFieldType,
  FormPresetsConfig
} from '@/types';
import {
  AVAILABLE_COLOR_SCHEMES,
  AVAILABLE_KPI_ICONS,
  PRIMARY_COLOR_PRESETS
} from '@/lib/white-label-defaults';
import { getLucideIcon } from '@/lib/icon-registry';
import { MetricCard } from '@/components/ui/MetricCard';

type SettingsTab = 'branding' | 'features' | 'kpi' | 'form';

function WhiteLabelSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = (searchParams.get('tab') as SettingsTab) || 'branding';

  const { user, isLoading: isAuthLoading } = useAuth();
  const { config, updateConfig, resetConfig } = useAppConfig();

  const [activeTab, setActiveTab] = useState<SettingsTab>('branding');
  const [draft, setDraft] = useState<AppConfig>(config);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [draggedKpiIndex, setDraggedKpiIndex] = useState<number | null>(null);

  // Add Custom Field Form State
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>('text');
  const [newFieldOptions, setNewFieldOptions] = useState('');
  const [newFieldPlaceholder, setNewFieldPlaceholder] = useState('');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldShowInTable, setNewFieldShowInTable] = useState(true);

  // Preset Inputs State
  const [presetInputs, setPresetInputs] = useState<Record<keyof FormPresetsConfig, string>>({
    jenisBarang: '',
    jenisLayanan: '',
    kelengkapanUmum: '',
    statusService: '',
    statusGaransi: '',
    teknisi: ''
  });

  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (['branding', 'features', 'kpi', 'form'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    setDraft(config);
  }, [config]);

  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    router.replace(`/settings/white-label?tab=${tab}`, { scroll: false });
  };

  // RBAC Check (Frontend Protection — Backend API also strictly enforces ADMIN)
  if (!isAuthLoading && user && user.role !== 'ADMIN') {
    return (
      <div className="max-w-lg mx-auto my-12 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-8 text-center space-y-4 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h1 className="text-lg font-extrabold text-slate-900 dark:text-white">
            Akses Ditolak (403 — Khusus Admin)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Halaman <strong>Custom Aplikasi</strong> hanya dapat diakses oleh pengguna dengan role <strong>ADMIN</strong>.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand hover:bg-brand-hover transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Dashboard</span>
        </Link>
      </div>
    );
  }

  const handleSaveAll = async () => {
    setIsSaving(true);
    setFeedback(null);
    const res = await updateConfig(draft);
    if (res.ok) {
      setFeedback({ type: 'success', text: res.message || 'Pengaturan White-Label berhasil disimpan & diterapkan secara real-time!' });
    } else {
      setFeedback({ type: 'error', text: res.error || 'Gagal menyimpan pengaturan' });
    }
    setIsSaving(false);
  };

  const handleResetDefaults = async () => {
    const confirmed = window.confirm(
      'Reset seluruh pengaturan White-Label (Branding, Menu, KPI, Form & Preset) ke tampilan default awal? Data tiket & customer TIDAK akan terhapus.'
    );
    if (!confirmed) return;

    setIsResetting(true);
    setFeedback(null);
    const res = await resetConfig();
    if (res.ok) {
      setFeedback({ type: 'success', text: res.message || 'Pengaturan dikembalikan ke default!' });
    } else {
      setFeedback({ type: 'error', text: res.error || 'Gagal mereset pengaturan' });
    }
    setIsResetting(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    setFeedback(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/settings/logo', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setFeedback({ type: 'error', text: data.error || 'Gagal mengunggah logo' });
      } else if (data.url) {
        setDraft((prev) => ({
          ...prev,
          branding: { ...prev.branding, logoUrl: data.url }
        }));
        setFeedback({ type: 'success', text: 'Logo berhasil diunggah! Klik "Simpan Perubahan" untuk menerapkan ke seluruh aplikasi.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', text: (err as Error).message || 'Kesalahan saat upload logo' });
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  // KPI reordering
  const moveKpi = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= draft.kpis.length) return;
    const next = [...draft.kpis];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    setDraft((prev) => ({
      ...prev,
      kpis: next.map((item, idx) => ({ ...item, sort_order: idx + 1 }))
    }));
  };

  const handleKpiDrop = (targetIndex: number) => {
    if (draggedKpiIndex === null || draggedKpiIndex === targetIndex) return;
    const next = [...draft.kpis];
    const [moved] = next.splice(draggedKpiIndex, 1);
    next.splice(targetIndex, 0, moved);
    setDraft((prev) => ({
      ...prev,
      kpis: next.map((item, idx) => ({ ...item, sort_order: idx + 1 }))
    }));
    setDraggedKpiIndex(null);
  };

  // Custom field operations
  const handleAddCustomField = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLabel = newFieldLabel.trim();
    if (!cleanLabel) return;

    const baseKey =
      'cf_' +
      cleanLabel
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    const uniqueKey = draft.fields.some((f) => f.field_key === baseKey)
      ? `${baseKey}_${Date.now().toString(36).slice(-3)}`
      : baseKey;

    const optionsArr =
      newFieldType === 'select'
        ? newFieldOptions
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

    const newField: CustomFieldConfig = {
      id: `fld-${uniqueKey}`,
      field_key: uniqueKey,
      label: cleanLabel,
      field_type: newFieldType,
      options: optionsArr,
      placeholder: newFieldPlaceholder.trim() || `Masukkan ${cleanLabel}...`,
      section: 'custom',
      is_builtin: false,
      is_visible_in_form: true,
      is_required: newFieldRequired,
      show_in_table: newFieldShowInTable,
      show_in_compact: false,
      sort_order: draft.fields.length + 1
    };

    setDraft((prev) => ({
      ...prev,
      fields: [...prev.fields, newField]
    }));

    setNewFieldLabel('');
    setNewFieldType('text');
    setNewFieldOptions('');
    setNewFieldPlaceholder('');
    setNewFieldRequired(false);
    setNewFieldShowInTable(true);
    setFeedback({ type: 'success', text: `Custom field "${cleanLabel}" ditambahkan! Klik "Simpan Perubahan" untuk menyimpan ke database.` });
  };

  const moveField = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= draft.fields.length) return;
    const next = [...draft.fields];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    setDraft((prev) => ({
      ...prev,
      fields: next.map((item, idx) => ({ ...item, sort_order: idx + 1 }))
    }));
  };

  const removeCustomField = (fieldKey: string) => {
    setDraft((prev) => ({
      ...prev,
      fields: prev.fields
        .filter((f) => f.field_key !== fieldKey || f.is_builtin)
        .map((item, idx) => ({ ...item, sort_order: idx + 1 }))
    }));
  };

  // Preset helpers
  const addPresetValue = (presetKey: keyof FormPresetsConfig) => {
    const val = presetInputs[presetKey].trim();
    if (!val) return;
    const current = draft.presets[presetKey] || [];
    if (current.some((item) => item.toLowerCase() === val.toLowerCase())) return;
    setDraft((prev) => ({
      ...prev,
      presets: {
        ...prev.presets,
        [presetKey]: [...current, val]
      }
    }));
    setPresetInputs((prev) => ({ ...prev, [presetKey]: '' }));
  };

  const removePresetValue = (presetKey: keyof FormPresetsConfig, valToRemove: string) => {
    setDraft((prev) => ({
      ...prev,
      presets: {
        ...prev.presets,
        [presetKey]: (prev.presets[presetKey] || []).filter((v) => v !== valToRemove)
      }
    }));
  };

  // Group features by group_name
  const featureGroups = Array.from(new Set(draft.features.map((f) => f.group_name)));

  return (
    <div className="space-y-6 w-full pb-16">
      {/* Top Action Header */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-brand-soft text-brand shrink-0">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                White-Label & Multi-Client Control Center
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                ADMIN ONLY
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Kustomisasi identitas toko, modul fitur sidebar, kartu KPI dashboard, dan dynamic form builder secara real-time tanpa edit kode.
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={isResetting || isSaving}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isResetting ? 'Mereset...' : 'Reset Default'}</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-brand hover:bg-brand-hover active:scale-95 shadow-md transition-all disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-3 animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2 font-semibold">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-[11px] font-bold underline shrink-0 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* 4 Pill Tabs Navigation */}
      <div className="flex items-center flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {[
          { key: 'branding' as SettingsTab, label: '1. Branding & Identitas Toko', icon: Palette },
          { key: 'features' as SettingsTab, label: '2. Feature Toggle & Sidebar', icon: Sliders },
          { key: 'kpi' as SettingsTab, label: '3. Kustomisasi KPI Dashboard', icon: LayoutGrid },
          { key: 'form' as SettingsTab, label: '4. Dynamic Form Builder & Tabel', icon: FormInput }
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                active
                  ? 'bg-brand text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* TAB 1: BRANDING & IDENTITAS TOKO                          */}
      {/* ========================================================= */}
      {activeTab === 'branding' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form (7 cols) */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider pb-3 border-b border-slate-100 dark:border-slate-800">
              Identitas Brand, Logo & Tema Warna
            </h3>

            {/* Logo Upload & URL */}
            <div className="space-y-2.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Logo Aplikasi (Sidebar, Favicon & Kop Struk)
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center p-2 shrink-0 overflow-hidden">
                  <img
                    src={draft.branding.logoUrl || '/logo.png'}
                    alt="Preview Logo"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/logo.png';
                    }}
                  />
                </div>

                <div className="flex-1 w-full space-y-2">
                  <div className="flex gap-2">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={isUploadingLogo}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploadingLogo ? 'Mengunggah...' : 'Upload Logo (PNG/JPG/SVG)'}</span>
                    </button>
                    {draft.branding.logoUrl !== '/logo.png' && (
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            branding: { ...prev.branding, logoUrl: '/logo.png' }
                          }))
                        }
                        className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 bg-slate-100 dark:bg-slate-800 dark:text-slate-300"
                      >
                        Logo Default
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={draft.branding.logoUrl}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        branding: { ...prev.branding, logoUrl: e.target.value }
                      }))
                    }
                    placeholder="Atau masukkan URL logo (contoh: /logo.png atau https://...)"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-800 dark:text-slate-100 rounded-xl border border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* App Name & Subtitle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Nama Aplikasi / Nama Toko *
                </label>
                <input
                  type="text"
                  value={draft.branding.appName}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      branding: { ...prev.branding, appName: e.target.value }
                    }))
                  }
                  placeholder="Contoh: BEST COMPUTEL"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Sub-Nama / Tagline
                </label>
                <input
                  type="text"
                  value={draft.branding.appSubtitle}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      branding: { ...prev.branding, appSubtitle: e.target.value }
                    }))
                  }
                  placeholder="Contoh: RMA & Service"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Address & Phone for Receipt/Invoice Header */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Alamat Toko (Kop Struk / Invoice)
                </label>
                <input
                  type="text"
                  value={draft.branding.companyAddress}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      branding: { ...prev.branding, companyAddress: e.target.value }
                    }))
                  }
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  No. WhatsApp / Telepon Toko
                </label>
                <input
                  type="text"
                  value={draft.branding.companyPhone}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      branding: { ...prev.branding, companyPhone: e.target.value }
                    }))
                  }
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Primary Color Picker */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Warna Aksen Utama (Primary Theme Color)
              </label>

              <div className="flex items-center flex-wrap gap-2">
                {PRIMARY_COLOR_PRESETS.map((preset) => {
                  const selected =
                    draft.branding.primaryColor.toLowerCase() === preset.hex.toLowerCase();
                  return (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          branding: { ...prev.branding, primaryColor: preset.hex }
                        }))
                      }
                      title={preset.name}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer ${
                        selected
                          ? 'border-slate-900 dark:border-white ring-2 ring-offset-1 ring-slate-400 bg-slate-50 dark:bg-slate-800'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full shrink-0 border border-black/10"
                        style={{ backgroundColor: preset.hex }}
                      />
                      <span className="text-slate-700 dark:text-slate-200">{preset.name}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-3 pt-1">
                <input
                  type="color"
                  value={draft.branding.primaryColor}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      branding: { ...prev.branding, primaryColor: e.target.value }
                    }))
                  }
                  className="w-10 h-10 rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer p-0.5 bg-white dark:bg-slate-800"
                />
                <input
                  type="text"
                  value={draft.branding.primaryColor}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      branding: { ...prev.branding, primaryColor: e.target.value }
                    }))
                  }
                  className="w-32 px-3 py-2 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-700"
                />
                <span className="text-[11px] text-slate-400">
                  Digunakan pada tombol utama, menu aktif & highlight UI
                </span>
              </div>
            </div>

            {/* Receipt Notes */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Syarat & Ketentuan pada Struk Cetak (1 Baris per Poin)
              </label>
              <textarea
                rows={4}
                value={(draft.branding.receiptFooterNotes || []).join('\n')}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    branding: {
                      ...prev.branding,
                      receiptFooterNotes: e.target.value.split('\n')
                    }
                  }))
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 rounded-xl border border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Right Live Preview (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            {/* Sidebar Header Live Preview */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Live Preview — Header Sidebar & Highlight Menu
              </span>
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 space-y-3">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <img
                    src={draft.branding.logoUrl || '/logo.png'}
                    alt="Preview"
                    className="w-9 h-9 object-contain shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-extrabold text-sm text-slate-900 dark:text-white leading-none truncate">
                      {draft.branding.appName || 'NAMA APLIKASI'}
                    </p>
                    <p className="text-[11px] text-slate-500 font-semibold mt-1 truncate">
                      {draft.branding.appSubtitle || 'Sub-nama / Tagline'}
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div
                    className="px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between"
                    style={{
                      backgroundColor: `${draft.branding.primaryColor}20`,
                      color: draft.branding.primaryColor,
                      border: `1px solid ${draft.branding.primaryColor}55`
                    }}
                  >
                    <span>Dashboard (Menu Aktif)</span>
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: draft.branding.primaryColor }}
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <span
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-white shadow-xs"
                      style={{ backgroundColor: draft.branding.primaryColor }}
                    >
                      Tombol Utama
                    </span>
                    <span className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                      Tombol Sekunder
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Receipt Header Live Preview */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Live Preview — Kop Struk / Tanda Terima Cetak
              </span>
              <div className="p-4 rounded-xl bg-white text-black border-[1.5px] border-black">
                <div className="flex items-start justify-between pb-2 border-b border-black gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={draft.branding.logoUrl || '/logo.png'}
                      alt="Logo Struk"
                      className="w-10 h-10 object-contain shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase leading-tight truncate">
                        {draft.branding.appName} {draft.branding.appSubtitle}
                      </p>
                      <p className="text-[10px] leading-tight truncate">
                        {draft.branding.companyAddress}
                      </p>
                      <p className="text-[10px] leading-tight">
                        WA. {draft.branding.companyPhone}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-extrabold uppercase">TANDA TERIMA</p>
                    <p className="text-[10px] font-mono font-bold">NO. RMA-0001</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: FEATURE TOGGLE & CUSTOM LABEL SIDEBAR              */}
      {/* ========================================================= */}
      {activeTab === 'features' && (
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Manajemen Fitur (Feature Toggle) & Label Menu Sidebar
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Matikan modul yang tidak dibutuhkan klien — menu otomatis hilang dari Sidebar dan URL-nya langsung terproteksi. Anda juga bisa mengganti nama menu sesuai istilah klien.
            </p>
          </div>

          <div className="space-y-6">
            {featureGroups.map((group) => {
              const items = draft.features.filter((f) => f.group_name === group);
              return (
                <div key={group} className="space-y-2.5">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                    Grup: {group}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {items.map((feature) => {
                      const Icon = getLucideIcon(feature.icon);
                      const isLocked = feature.feature_key === 'dashboard';
                      return (
                        <div
                          key={feature.feature_key}
                          className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                            feature.is_enabled
                              ? 'bg-slate-50/70 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                              : 'bg-slate-100/50 dark:bg-slate-900 border-dashed border-slate-300 dark:border-slate-800 opacity-70'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div
                              className={`p-2 rounded-lg shrink-0 ${
                                feature.is_enabled
                                  ? 'bg-brand-soft text-brand'
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                              <input
                                type="text"
                                value={feature.custom_label}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setDraft((prev) => ({
                                    ...prev,
                                    features: prev.features.map((f) =>
                                      f.feature_key === feature.feature_key
                                        ? { ...f, custom_label: val }
                                        : f
                                    )
                                  }));
                                }}
                                className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:outline-hidden"
                              />
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                                <span>{feature.href}</span>
                                <span>•</span>
                                <span>Asli: {feature.default_label}</span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={isLocked}
                            onClick={() => {
                              if (isLocked) return;
                              setDraft((prev) => ({
                                ...prev,
                                features: prev.features.map((f) =>
                                  f.feature_key === feature.feature_key
                                    ? { ...f, is_enabled: !f.is_enabled }
                                    : f
                                )
                              }));
                            }}
                            title={isLocked ? 'Dashboard utama selalu aktif' : 'Aktifkan / Nonaktifkan Fitur'}
                            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${
                              isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                            } ${
                              feature.is_enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition ${
                                feature.is_enabled ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: KUSTOMISASI TAMPILAN KPI DASHBOARD                 */}
      {/* ========================================================= */}
      {activeTab === 'kpi' && (
        <div className="space-y-6">
          {/* Live Preview of Visible KPI Cards */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Live Preview Kartu KPI Dashboard ({draft.kpis.filter((k) => k.is_visible).length} Aktif)
              </span>
              <span className="text-[11px] text-slate-400">
                Seret (drag-and-drop) atau klik panah di bawah untuk mengubah urutan
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800">
              {draft.kpis
                .filter((k) => k.is_visible)
                .map((kpi, idx) => (
                  <MetricCard
                    key={kpi.id}
                    title={kpi.label}
                    value={(idx + 1) * 4}
                    icon={getLucideIcon(kpi.icon)}
                    colorScheme={kpi.color_scheme}
                  />
                ))}
              {draft.kpis.filter((k) => k.is_visible).length === 0 && (
                <div className="col-span-full text-center py-6 text-xs text-slate-400">
                  Semua kartu KPI sedang disembunyikan.
                </div>
              )}
            </div>
          </div>

          {/* Editable KPI Rows */}
          <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider pb-3 border-b border-slate-100 dark:border-slate-800">
              Pengaturan Kartu KPI (Label, Ikon, Warna & Urutan)
            </h3>

            <div className="space-y-2.5">
              {draft.kpis.map((kpi, index) => {
                const KpiIcon = getLucideIcon(kpi.icon);
                return (
                  <div
                    key={kpi.id}
                    draggable
                    onDragStart={() => setDraggedKpiIndex(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleKpiDrop(index)}
                    className={`p-3.5 rounded-xl border flex flex-col lg:flex-row lg:items-center gap-3 transition-all ${
                      kpi.is_visible
                        ? 'bg-slate-50/70 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                        : 'bg-slate-100/50 dark:bg-slate-900 border-dashed border-slate-300 dark:border-slate-800 opacity-65'
                    }`}
                  >
                    {/* Order & Drag Handle */}
                    <div className="flex items-center gap-2 shrink-0">
                      <GripVertical className="w-4 h-4 text-slate-400 cursor-grab" />
                      <span className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center">
                        {index + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveKpi(index, -1)}
                          disabled={index === 0}
                          className="p-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                          title="Geser Naik"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveKpi(index, 1)}
                          disabled={index === draft.kpis.length - 1}
                          className="p-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                          title="Geser Turun"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Label Input */}
                    <div className="flex-1 min-w-0">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                        Judul Kartu ({kpi.kpi_key})
                      </label>
                      <input
                        type="text"
                        value={kpi.label}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraft((prev) => ({
                            ...prev,
                            kpis: prev.kpis.map((item) =>
                              item.id === kpi.id ? { ...item, label: val } : item
                            )
                          }));
                        }}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:outline-hidden"
                      />
                    </div>

                    {/* Icon Selector */}
                    <div className="w-full lg:w-44">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                        Ikon
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                          <KpiIcon className="w-4 h-4" />
                        </div>
                        <select
                          value={kpi.icon}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDraft((prev) => ({
                              ...prev,
                              kpis: prev.kpis.map((item) =>
                                item.id === kpi.id ? { ...item, icon: val } : item
                              )
                            }));
                          }}
                          className="flex-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 rounded-lg border border-slate-200 dark:border-slate-700"
                        >
                          {AVAILABLE_KPI_ICONS.map((iconName) => (
                            <option key={iconName} value={iconName}>
                              {iconName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Color Scheme Selector */}
                    <div className="w-full lg:w-40">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                        Warna Badge
                      </label>
                      <select
                        value={kpi.color_scheme}
                        onChange={(e) => {
                          const val = e.target.value as ColorSchemeKey;
                          setDraft((prev) => ({
                            ...prev,
                            kpis: prev.kpis.map((item) =>
                              item.id === kpi.id ? { ...item, color_scheme: val } : item
                            )
                          }));
                        }}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 rounded-lg border border-slate-200 dark:border-slate-700"
                      >
                        {AVAILABLE_COLOR_SCHEMES.map((c) => (
                          <option key={c.key} value={c.key}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Show/Hide Toggle */}
                    <div className="flex items-center justify-end lg:pt-4 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            kpis: prev.kpis.map((item) =>
                              item.id === kpi.id ? { ...item, is_visible: !item.is_visible } : item
                            )
                          }))
                        }
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          kpi.is_visible
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        {kpi.is_visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        <span>{kpi.is_visible ? 'Tampil' : 'Disembunyikan'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: DYNAMIC FORM BUILDER, KOLOM TABEL & PRESET         */}
      {/* ========================================================= */}
      {activeTab === 'form' && (
        <div className="space-y-6">
          {/* A. Add New Custom Field */}
          <form
            onSubmit={handleAddCustomField}
            className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4"
          >
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Plus className="w-4 h-4 text-brand" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Tambah Custom Field Baru (Form Input & Kolom Tabel)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Nama Field / Label *
                </label>
                <input
                  type="text"
                  required
                  value={newFieldLabel}
                  onChange={(e) => setNewFieldLabel(e.target.value)}
                  placeholder="Misal: IMEI / Nomor Plat / Kondisi Fisik"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Tipe Input
                </label>
                <select
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value as CustomFieldType)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-700"
                >
                  <option value="text">Text (Teks Singkat)</option>
                  <option value="number">Number (Angka)</option>
                  <option value="select">Dropdown / Select</option>
                  <option value="date">Date (Tanggal)</option>
                  <option value="textarea">Textarea (Teks Panjang)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  {newFieldType === 'select' ? 'Daftar Opsi (Pisahkan Koma) *' : 'Placeholder'}
                </label>
                {newFieldType === 'select' ? (
                  <input
                    type="text"
                    required
                    value={newFieldOptions}
                    onChange={(e) => setNewFieldOptions(e.target.value)}
                    placeholder="Contoh: Mulus, Lecet Ringan, Retak"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-700"
                  />
                ) : (
                  <input
                    type="text"
                    value={newFieldPlaceholder}
                    onChange={(e) => setNewFieldPlaceholder(e.target.value)}
                    placeholder="Contoh: Masukkan nomor..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-700"
                  />
                )}
              </div>

              <div className="flex flex-col justify-between gap-2">
                <div className="flex items-center gap-4 pt-1 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={newFieldRequired}
                      onChange={(e) => setNewFieldRequired(e.target.checked)}
                      className="rounded"
                    />
                    <span>Wajib Diisi</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={newFieldShowInTable}
                      onChange={(e) => setNewFieldShowInTable(e.target.checked)}
                      className="rounded"
                    />
                    <span>Tampil di Tabel</span>
                  </label>
                </div>
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand hover:bg-brand-hover transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambahkan Field</span>
                </button>
              </div>
            </div>
          </form>

          {/* B. Manage All Builtin + Custom Fields & Table Columns */}
          <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Konfigurasi Field Form Input & Urutan Kolom Tabel Antrean ({draft.fields.length} Field)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Ubah label field bawaan (misal ubah <b>SERIAL NUMBER</b> menjadi <b>IMEI</b> atau <b>Nomor Rangka</b>), atur wajib/opsional, sembunyikan field yang tidak dipakai, serta atur kolom & urutan tabel antrean.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 px-2">Urutan</th>
                    <th className="py-2.5 px-2">Label Tampilan</th>
                    <th className="py-2.5 px-2">Key / Tipe</th>
                    <th className="py-2.5 px-2 text-center">Tampil di Form</th>
                    <th className="py-2.5 px-2 text-center">Wajib (Req)</th>
                    <th className="py-2.5 px-2 text-center">Kolom Tabel</th>
                    <th className="py-2.5 px-2 text-center">Mode Ringkas</th>
                    <th className="py-2.5 px-2 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {draft.fields.map((fld, idx) => (
                    <tr
                      key={fld.field_key}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    >
                      <td className="py-2 px-2 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span className="w-5 text-center font-mono font-bold text-slate-400">
                            {idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => moveField(idx, -1)}
                            disabled={idx === 0}
                            className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveField(idx, 1)}
                            disabled={idx === draft.fields.length - 1}
                            className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      <td className="py-2 px-2 min-w-[180px]">
                        <input
                          type="text"
                          value={fld.label}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDraft((prev) => ({
                              ...prev,
                              fields: prev.fields.map((f) =>
                                f.field_key === fld.field_key ? { ...f, label: val } : f
                              )
                            }));
                          }}
                          className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:outline-hidden"
                        />
                        {!fld.is_builtin && fld.field_type === 'select' && (
                          <input
                            type="text"
                            value={(fld.options || []).join(', ')}
                            onChange={(e) => {
                              const opts = e.target.value
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean);
                              setDraft((prev) => ({
                                ...prev,
                                fields: prev.fields.map((f) =>
                                  f.field_key === fld.field_key ? { ...f, options: opts } : f
                                )
                              }));
                            }}
                            placeholder="Opsi dipisahkan koma..."
                            className="w-full mt-1 px-2 py-0.5 bg-slate-50 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700"
                          />
                        )}
                      </td>

                      <td className="py-2 px-2 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] text-slate-500">{fld.field_key}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              fld.is_builtin
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            }`}
                          >
                            {fld.is_builtin ? 'Bawaan' : `Custom (${fld.field_type})`}
                          </span>
                        </div>
                      </td>

                      <td className="py-2 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={fld.is_visible_in_form}
                          disabled={fld.field_key === 'nomor_layanan' || fld.field_key === 'nama_customer'}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              fields: prev.fields.map((f) =>
                                f.field_key === fld.field_key
                                  ? { ...f, is_visible_in_form: e.target.checked }
                                  : f
                              )
                            }))
                          }
                          className="rounded cursor-pointer disabled:opacity-40"
                        />
                      </td>

                      <td className="py-2 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={fld.is_required}
                          disabled={fld.field_key === 'nomor_layanan' || fld.field_key === 'nama_customer'}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              fields: prev.fields.map((f) =>
                                f.field_key === fld.field_key
                                  ? { ...f, is_required: e.target.checked }
                                  : f
                              )
                            }))
                          }
                          className="rounded cursor-pointer disabled:opacity-40"
                        />
                      </td>

                      <td className="py-2 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={fld.show_in_table}
                          disabled={fld.field_key === 'nomor_layanan'}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              fields: prev.fields.map((f) =>
                                f.field_key === fld.field_key
                                  ? { ...f, show_in_table: e.target.checked }
                                  : f
                              )
                            }))
                          }
                          className="rounded cursor-pointer disabled:opacity-40"
                        />
                      </td>

                      <td className="py-2 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={fld.show_in_compact}
                          disabled={fld.field_key === 'nomor_layanan'}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              fields: prev.fields.map((f) =>
                                f.field_key === fld.field_key
                                  ? { ...f, show_in_compact: e.target.checked }
                                  : f
                              )
                            }))
                          }
                          className="rounded cursor-pointer disabled:opacity-40"
                        />
                      </td>

                      <td className="py-2 px-2 text-right whitespace-nowrap">
                        {!fld.is_builtin ? (
                          <button
                            type="button"
                            onClick={() => removeCustomField(fld.field_key)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                            title="Hapus Custom Field"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* C. Preset Dropdown Manager */}
          <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <ListChecks className="w-5 h-5 text-brand" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Preset Dropdown & Opsi Form (Jenis Barang, Layanan, Kelengkapan, Status & Teknisi)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sesuaikan daftar pilihan untuk usaha apa pun (Servis HP, Laptop, Bengkel Motor, Elektronik, AC, dll).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {(
                [
                  { key: 'jenisBarang', label: 'Jenis Barang / Perangkat', placeholder: 'Misal: Smartphone, TV, Motor...' },
                  { key: 'jenisLayanan', label: 'Jenis Layanan / RMA', placeholder: 'Misal: SERVICE, GARANSI, MAINTENANCE...' },
                  { key: 'kelengkapanUmum', label: 'Preset Kelengkapan', placeholder: 'Misal: SIM Tray, STNK, Remote...' },
                  { key: 'teknisi', label: 'Daftar Teknisi / Pelaksana', placeholder: 'Tambah nama teknisi...' },
                  { key: 'statusService', label: 'Daftar Status Service Reguler', placeholder: 'Misal: MENUNGGU SPAREPART' },
                  { key: 'statusGaransi', label: 'Daftar Status Garansi / RMA', placeholder: 'Misal: DIKIRIM KE PUSAT' }
                ] as { key: keyof FormPresetsConfig; label: string; placeholder: string }[]
              ).map((presetMeta) => (
                <div
                  key={presetMeta.key}
                  className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3"
                >
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    {presetMeta.label}
                  </label>

                  <div className="flex flex-wrap gap-1.5">
                    {(draft.presets[presetMeta.key] || []).map((val) => (
                      <span
                        key={val}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
                      >
                        <span>{val}</span>
                        <button
                          type="button"
                          onClick={() => removePresetValue(presetMeta.key, val)}
                          className="text-slate-400 hover:text-rose-500 cursor-pointer"
                          title={`Hapus ${val}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={presetInputs[presetMeta.key]}
                      onChange={(e) =>
                        setPresetInputs((prev) => ({ ...prev, [presetMeta.key]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addPresetValue(presetMeta.key);
                        }
                      }}
                      placeholder={presetMeta.placeholder}
                      className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white rounded-lg border border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => addPresetValue(presetMeta.key)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 cursor-pointer"
                    >
                      + Tambah
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WhiteLabelSettingsPage() {
  return (
    <Suspense fallback={null}>
      <WhiteLabelSettingsContent />
    </Suspense>
  );
}

