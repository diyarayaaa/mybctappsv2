'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Building2,
  PlusCircle,
  ClipboardList,
  MapPin,
  Phone,
  Users,
  Search,
  CheckCircle2,
  Calendar,
  Smartphone,
  Pencil,
  Trash2,
  AlertTriangle,
  FileSpreadsheet,
  CloudUpload,
  Clock,
  Copy,
  Check,
  ExternalLink,
  Download,
  RefreshCw,
  Info,
  XCircle
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { MasterVendor, MasterKeluhan, Ticket } from '@/types';

interface BackupHistoryItem {
  id: string;
  timestamp: string;
  type: 'AUTO' | 'MANUAL';
  status: 'SUCCESS' | 'ERROR';
  message: string;
  counts?: {
    tickets: number;
    suratJalan: number;
    vendors: number;
    keluhan: number;
  };
}

interface BackupConfig {
  enabled: boolean;
  webhookUrl: string;
  spreadsheetUrl: string;
  scheduleTime: string;
  lastBackupDate: string | null;
  lastBackupAt: string | null;
  lastBackupStatus: 'SUCCESS' | 'ERROR' | null;
  lastBackupMessage: string | null;
  history: BackupHistoryItem[];
}

function MasterDataContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') || 'vendor';

  const [activeTab, setActiveTab] = useState<'vendor' | 'customer' | 'keluhan' | 'backup'>('vendor');

  useEffect(() => {
    if (tabParam === 'customer') {
      setActiveTab('customer');
    } else if (tabParam === 'keluhan') {
      setActiveTab('keluhan');
    } else if (tabParam === 'backup') {
      setActiveTab('backup');
    } else {
      setActiveTab('vendor');
    }
  }, [tabParam]);

  const [vendors, setVendors] = useState<MasterVendor[]>([]);
  const [keluhanList, setKeluhanList] = useState<MasterKeluhan[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Backup state
  const [backupConfig, setBackupConfig] = useState<BackupConfig>({
    enabled: false,
    webhookUrl: '',
    spreadsheetUrl: '',
    scheduleTime: '17:00',
    lastBackupDate: null,
    lastBackupAt: null,
    lastBackupStatus: null,
    lastBackupMessage: null,
    history: []
  });
  const [scriptTemplate, setScriptTemplate] = useState('');
  const [isSavingBackupConfig, setIsSavingBackupConfig] = useState(false);
  const [isRunningBackup, setIsRunningBackup] = useState(false);
  const [backupAlert, setBackupAlert] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isScriptCopied, setIsScriptCopied] = useState(false);
  const [showScriptGuide, setShowScriptGuide] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Tambah Vendor
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [namaVendor, setNamaVendor] = useState('');
  const [wilayah, setWilayah] = useState<'BDG' | 'JKT' | 'OTHER'>('BDG');
  const [alamatLengkap, setAlamatLengkap] = useState('');
  const [kontakWa, setKontakWa] = useState('');
  const [isSubmittingVendor, setIsSubmittingVendor] = useState(false);

  // Vendor File Import (CSV / Excel)
  const vendorFileInputRef = useRef<HTMLInputElement>(null);
  const [isImportingVendor, setIsImportingVendor] = useState(false);
  const [vendorImportMsg, setVendorImportMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleVendorFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingVendor(true);
    setVendorImportMsg(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/master/vendors/import', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setVendorImportMsg({ type: 'error', text: data.error || 'Gagal mengimpor data vendor' });
      } else {
        setVendorImportMsg({ type: 'success', text: data.message || 'Berhasil mengimpor data vendor' });
        fetchMasterData();
      }
    } catch (err: unknown) {
      setVendorImportMsg({ type: 'error', text: (err as Error).message || 'Terjadi kesalahan sistem saat upload' });
    } finally {
      setIsImportingVendor(false);
      if (vendorFileInputRef.current) vendorFileInputRef.current.value = '';
    }
  };

  // Modal Edit Vendor
  const [isEditVendorModalOpen, setIsEditVendorModalOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<MasterVendor | null>(null);
  const [editNamaVendor, setEditNamaVendor] = useState('');
  const [editWilayah, setEditWilayah] = useState<'BDG' | 'JKT' | 'OTHER'>('BDG');
  const [editAlamatLengkap, setEditAlamatLengkap] = useState('');
  const [editKontakWa, setEditKontakWa] = useState('');
  const [isSubmittingEditVendor, setIsSubmittingEditVendor] = useState(false);
  const [editVendorError, setEditVendorError] = useState('');

  // Modal Hapus Vendor
  const [isDeleteVendorModalOpen, setIsDeleteVendorModalOpen] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState<MasterVendor | null>(null);
  const [isDeletingVendor, setIsDeletingVendor] = useState(false);
  const [deleteVendorError, setDeleteVendorError] = useState('');

  // Modal Keluhan
  const [isKeluhanModalOpen, setIsKeluhanModalOpen] = useState(false);
  const [teksKeluhan, setTeksKeluhan] = useState('');
  const [isSubmittingKeluhan, setIsSubmittingKeluhan] = useState(false);

  const fetchMasterData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [vRes, kRes, tRes, bRes] = await Promise.all([
        fetch('/api/master/vendors'),
        fetch('/api/master/keluhan'),
        fetch('/api/tickets'),
        fetch('/api/backup')
      ]);
      const vData = await vRes.json();
      const kData = await kRes.json();
      const tData = await tRes.json();
      const bData = await bRes.json();
      setVendors(vData.vendors || []);
      setKeluhanList(kData.keluhan || []);
      setTickets(tData.tickets || []);
      if (bData.config) {
        setBackupConfig(bData.config);
      }
      if (bData.scriptTemplate) {
        setScriptTemplate(bData.scriptTemplate);
      }
    } catch (err) {
      console.error('Failed to load master data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMasterData();
  }, [fetchMasterData]);

  const handleTabChange = (tab: 'vendor' | 'customer' | 'keluhan' | 'backup') => {
    setActiveTab(tab);
    router.push(`/master?tab=${tab}`);
  };

  const handleSaveBackupSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBackupConfig(true);
    setBackupAlert(null);
    try {
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_config',
          enabled: backupConfig.enabled,
          webhookUrl: backupConfig.webhookUrl,
          spreadsheetUrl: backupConfig.spreadsheetUrl,
          scheduleTime: backupConfig.scheduleTime
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setBackupAlert({ type: 'error', text: data.error || 'Gagal menyimpan pengaturan backup' });
      } else {
        setBackupConfig(data.config);
        setBackupAlert({ type: 'success', text: data.message || 'Pengaturan backup berhasil disimpan!' });
      }
    } catch (err: unknown) {
      setBackupAlert({ type: 'error', text: (err as Error).message || 'Kesalahan sistem' });
    } finally {
      setIsSavingBackupConfig(false);
    }
  };

  const handleRunBackupNow = async () => {
    if (!backupConfig.webhookUrl.trim()) {
      setBackupAlert({
        type: 'error',
        text: 'Silakan masukkan URL Web App Google Apps Script terlebih dahulu di bawah.'
      });
      return;
    }

    setIsRunningBackup(true);
    setBackupAlert(null);
    try {
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'run_now',
          webhookUrl: backupConfig.webhookUrl,
          spreadsheetUrl: backupConfig.spreadsheetUrl
        })
      });
      const data = await res.json();
      if (data.config) {
        setBackupConfig(data.config);
      }
      if (!res.ok || data.error) {
        setBackupAlert({ type: 'error', text: data.error || 'Backup ke Google Spreadsheet gagal.' });
      } else {
        setBackupAlert({
          type: 'success',
          text: data.message || 'Database berhasil dibackup ke Google Spreadsheet!'
        });
      }
    } catch (err: unknown) {
      setBackupAlert({
        type: 'error',
        text: (err as Error).message || 'Gagal menghubungi server untuk proses backup.'
      });
    } finally {
      setIsRunningBackup(false);
    }
  };

  const handleCopyScript = async () => {
    if (!scriptTemplate) return;
    try {
      await navigator.clipboard.writeText(scriptTemplate);
      setIsScriptCopied(true);
      setTimeout(() => setIsScriptCopied(false), 2500);
    } catch {
      // Fallback copy
    }
  };

  // Build unique customers list
  const customerMap = new Map<string, { nama: string; no_hp: string; totalTiket: number; lastDate: string }>();
  tickets.forEach((t) => {
    const key = t.nama_customer.trim().toLowerCase();
    if (!key) return;
    const existing = customerMap.get(key);
    if (existing) {
      existing.totalTiket += 1;
      if (new Date(t.tanggal_masuk) > new Date(existing.lastDate)) {
        existing.lastDate = t.tanggal_masuk;
      }
    } else {
      customerMap.set(key, {
        nama: t.nama_customer,
        no_hp: t.no_hp || '-',
        totalTiket: 1,
        lastDate: t.tanggal_masuk
      });
    }
  });
  const customers = Array.from(customerMap.values());

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaVendor.trim()) return;

    setIsSubmittingVendor(true);
    try {
      const res = await fetch('/api/master/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama_vendor: namaVendor.trim(),
          wilayah,
          alamat_lengkap: alamatLengkap.trim() || null,
          kontak_wa: kontakWa.trim() || null
        })
      });

      if (res.ok) {
        setIsVendorModalOpen(false);
        setNamaVendor('');
        setAlamatLengkap('');
        setKontakWa('');
        fetchMasterData();
      }
    } catch (err) {
      console.error('Failed to create vendor:', err);
    } finally {
      setIsSubmittingVendor(false);
    }
  };

  const handleOpenEditVendor = (v: MasterVendor) => {
    setSelectedVendor(v);
    setEditNamaVendor(v.nama_vendor);
    setEditWilayah((v.wilayah as 'BDG' | 'JKT' | 'OTHER') || 'BDG');
    setEditAlamatLengkap(v.alamat_lengkap || '');
    setEditKontakWa(v.kontak_wa || '');
    setEditVendorError('');
    setIsEditVendorModalOpen(true);
  };

  const handleUpdateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendor || !editNamaVendor.trim()) return;

    setIsSubmittingEditVendor(true);
    setEditVendorError('');
    try {
      const res = await fetch(`/api/master/vendors/${selectedVendor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama_vendor: editNamaVendor.trim(),
          wilayah: editWilayah,
          alamat_lengkap: editAlamatLengkap.trim() || null,
          kontak_wa: editKontakWa.trim() || null
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setEditVendorError(data.error || 'Gagal memperbarui vendor');
        return;
      }

      setIsEditVendorModalOpen(false);
      setSelectedVendor(null);
      fetchMasterData();
    } catch (err) {
      console.error('Failed to update vendor:', err);
      setEditVendorError('Terjadi kesalahan saat memperbarui vendor');
    } finally {
      setIsSubmittingEditVendor(false);
    }
  };

  const handleOpenDeleteVendor = (v: MasterVendor) => {
    setVendorToDelete(v);
    setDeleteVendorError('');
    setIsDeleteVendorModalOpen(true);
  };

  const handleConfirmDeleteVendor = async () => {
    if (!vendorToDelete) return;

    setIsDeletingVendor(true);
    setDeleteVendorError('');
    try {
      const res = await fetch(`/api/master/vendors/${vendorToDelete.id}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (!res.ok) {
        setDeleteVendorError(data.error || 'Gagal menghapus vendor');
        return;
      }

      setIsDeleteVendorModalOpen(false);
      setVendorToDelete(null);
      fetchMasterData();
    } catch (err) {
      console.error('Failed to delete vendor:', err);
      setDeleteVendorError('Terjadi kesalahan saat menghapus vendor');
    } finally {
      setIsDeletingVendor(false);
    }
  };

  const handleCreateKeluhan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teksKeluhan.trim()) return;

    setIsSubmittingKeluhan(true);
    try {
      const res = await fetch('/api/master/keluhan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teks_keluhan: teksKeluhan.trim() })
      });

      if (res.ok) {
        setIsKeluhanModalOpen(false);
        setTeksKeluhan('');
        fetchMasterData();
      }
    } catch (err) {
      console.error('Failed to create keluhan:', err);
    } finally {
      setIsSubmittingKeluhan(false);
    }
  };

  // Filtered lists
  const filteredVendors = vendors.filter((v) =>
    v.nama_vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.wilayah.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCustomers = customers.filter((c) =>
    c.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.no_hp.includes(searchQuery)
  );

  const filteredKeluhan = keluhanList.filter((k) =>
    k.teks_keluhan.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Tab Navigation Pill Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleTabChange('vendor')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'vendor'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Data Master Vendor ({vendors.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('customer')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'customer'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Master Customer ({customers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('keluhan')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'keluhan'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Preset Form Option / Keluhan ({keluhanList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('backup')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'backup'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Backup Google Spreadsheet</span>
            {backupConfig.enabled && (
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
            )}
          </button>
        </div>

        {/* Quick Search (hide on backup tab) */}
        {activeTab !== 'backup' && (
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter daftar..."
              className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 text-xs rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-hidden focus:border-blue-500"
            />
          </div>
        )}
      </div>

      {/* Tab 1: Vendor */}
      {activeTab === 'vendor' && (
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Distributor & Vendor Garansi
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={vendorFileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls"
                className="hidden"
                onChange={handleVendorFileUpload}
              />
              <button
                type="button"
                onClick={() => vendorFileInputRef.current?.click()}
                disabled={isImportingVendor}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>{isImportingVendor ? 'Mengimpor...' : 'Import CSV/Excel'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsVendorModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Tambah Vendor</span>
              </button>
            </div>
          </div>

          {vendorImportMsg && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center justify-between gap-2 ${
                vendorImportMsg.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
            >
              <span>{vendorImportMsg.text}</span>
              <button
                type="button"
                onClick={() => setVendorImportMsg(null)}
                className="font-bold underline cursor-pointer text-[11px]"
              >
                Tutup
              </button>
            </div>
          )}

          {filteredVendors.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50">
              <Building2 className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Belum Ada Data Distributor / Vendor
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Database vendor saat ini kosong. Anda dapat menambahkan vendor secara manual atau mengunggah file spreadsheet CSV / Excel.
              </p>
              <div className="flex items-center justify-center gap-2.5 mt-4">
                <button
                  type="button"
                  onClick={() => vendorFileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Upload File CSV / Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsVendorModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Tambah Manual</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredVendors.map((v) => (
                <div
                  key={v.id}
                  className="p-3.5 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-sm leading-tight flex-1">
                      {v.nama_vendor}
                    </h3>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          v.wilayah === 'BDG'
                            ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
                            : v.wilayah === 'JKT'
                            ? 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {v.wilayah}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenEditVendor(v)}
                        title="Edit Vendor"
                        className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenDeleteVendor(v)}
                        title="Hapus Vendor"
                        className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/60 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{v.alamat_lengkap || 'Alamat belum diatur'}</span>
                  </p>
                  <p className="text-slate-700 dark:text-slate-300 font-mono font-semibold flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{v.kontak_wa || '-'}</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Customer */}
      {activeTab === 'customer' && (
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Daftar Pelanggan / Master Customer
              </h2>
            </div>
            <span className="text-xs text-slate-400">Total {customers.length} Pelanggan Terdaftar</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredCustomers.map((c) => (
              <div
                key={c.nama}
                className="p-3.5 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">{c.nama}</h3>
                  <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                    {c.totalTiket} Tiket
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5 font-mono">
                  <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{c.no_hp}</span>
                </p>
                <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Kunjungan terakhir: {c.lastDate}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Keluhan */}
      {activeTab === 'keluhan' && (
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Preset Form Option / Kamus Keluhan
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setIsKeluhanModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Tambah Preset</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {filteredKeluhan.map((k) => (
              <div
                key={k.id}
                className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2"
              >
                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                <span className="truncate">{k.teks_keluhan}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Backup Database ke Google Spreadsheet */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          {/* Top Summary & Action Banner */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Backup Otomatis Database ke Google Spreadsheet
                    </h2>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        backupConfig.enabled
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {backupConfig.enabled
                        ? `Aktif • Setiap Hari Jam ${backupConfig.scheduleTime} WIB`
                        : 'Jadwal Otomatis Nonaktif'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Seluruh data Tiket Servis, Surat Jalan, Master Vendor, dan Keluhan disinkronkan otomatis per hari ke Google Spreadsheet di Google Drive Anda.
                  </p>
                </div>
              </div>

              <div className="flex items-center flex-wrap gap-2 shrink-0">
                {backupConfig.spreadsheetUrl && (
                  <a
                    href={backupConfig.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka Google Sheet</span>
                  </a>
                )}

                <a
                  href="/api/backup/excel"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold text-xs rounded-xl transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Excel (.xlsx)</span>
                </a>

                <button
                  type="button"
                  onClick={handleRunBackupNow}
                  disabled={isRunningBackup}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isRunningBackup ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CloudUpload className="w-4 h-4" />
                  )}
                  <span>{isRunningBackup ? 'Mengirim ke Spreadsheet...' : 'Backup Sekarang ke Google Sheet'}</span>
                </button>
              </div>
            </div>

            {backupAlert && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-start justify-between gap-3 ${
                  backupAlert.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
                }`}
              >
                <div className="flex items-start gap-2">
                  {backupAlert.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span className="font-medium leading-relaxed">{backupAlert.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setBackupAlert(null)}
                  className="font-bold underline text-[11px] shrink-0"
                >
                  Tutup
                </button>
              </div>
            )}

            {/* Status Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Backup Terakhir
                </span>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">
                  {backupConfig.lastBackupAt || 'Belum pernah dibackup'}
                </p>
                {backupConfig.lastBackupStatus && (
                  <span
                    className={`inline-block mt-1 text-[11px] font-bold ${
                      backupConfig.lastBackupStatus === 'SUCCESS' ? 'text-emerald-600' : 'text-rose-500'
                    }`}
                  >
                    Status: {backupConfig.lastBackupStatus === 'SUCCESS' ? 'Berhasil' : 'Gagal'}
                  </span>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Jadwal Harian Otomatis
                </span>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span>Setiap Hari Pukul {backupConfig.scheduleTime} WIB</span>
                </p>
                <span className="text-[11px] text-slate-500 block mt-1">
                  {backupConfig.enabled
                    ? 'Otomatis berjalan 1x sehari saat jam tercapai'
                    : 'Aktifkan sakelar di bawah untuk mulai'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Total Data Siap Backup
                </span>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">
                  {tickets.length} Tiket • {vendors.length} Vendor • {keluhanList.length} Keluhan
                </p>
                <span className="text-[11px] text-slate-500 block mt-1">
                  Tersusun rapi dalam 5 Sheet terpisah
                </span>
              </div>
            </div>
          </div>

          {/* Configuration Form & Setup Guide */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 cols: Form Settings */}
            <form
              onSubmit={handleSaveBackupSettings}
              className="lg:col-span-7 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4"
            >
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider pb-3 border-b border-slate-100 dark:border-slate-800">
                Pengaturan Koneksi & Jadwal Harian
              </h3>

              {/* Toggle Auto Backup */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Aktifkan Backup Otomatis Per Hari
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Jika diaktifkan, sistem akan otomatis mengirim seluruh database ke Google Spreadsheet setiap hari pada jam yang ditentukan.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setBackupConfig((prev) => ({ ...prev, enabled: !prev.enabled }))
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    backupConfig.enabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                      backupConfig.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Jam Backup Harian */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Jam Backup Otomatis Harian (WIB)
                </label>
                <input
                  type="time"
                  value={backupConfig.scheduleTime}
                  onChange={(e) =>
                    setBackupConfig((prev) => ({ ...prev, scheduleTime: e.target.value }))
                  }
                  className="w-full sm:w-48 px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-hidden focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Contoh: 17:00 (Sore menjelang tutup toko). Jika PC baru dinyalakan lewat dari jam tersebut, backup hari itu tetap langsung dijalankan otomatis.
                </p>
              </div>

              {/* Webhook URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  URL Aplikasi Web (Google Apps Script Webhook) *
                </label>
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  value={backupConfig.webhookUrl}
                  onChange={(e) =>
                    setBackupConfig((prev) => ({ ...prev, webhookUrl: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-hidden focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Tempelkan URL hasil Deploy Web App dari menu <b>Ekstensi &rarr; Apps Script</b> di Google Spreadsheet Anda (lihat panduan di sebelah kanan).
                </p>
              </div>

              {/* Link Spreadsheet (Opsional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Link File Google Spreadsheet (Opsional - Untuk Tombol Pintas)
                </label>
                <input
                  type="url"
                  placeholder="https://docs.google.com/spreadsheets/d/1abc.../edit"
                  value={backupConfig.spreadsheetUrl}
                  onChange={(e) =>
                    setBackupConfig((prev) => ({ ...prev, spreadsheetUrl: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="submit"
                  disabled={isSavingBackupConfig}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSavingBackupConfig ? 'Menyimpan...' : 'Simpan Pengaturan Backup'}
                </button>
              </div>
            </form>

            {/* Right 5 cols: Step-by-step Google Spreadsheet Connector Guide */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Cara Menghubungkan ke Google Sheet
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-xs transition-all cursor-pointer"
                >
                  {isScriptCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isScriptCopied ? 'Kode Tersalin!' : 'Salin Kode Script'}</span>
                </button>
              </div>

              <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-2.5 list-decimal list-inside leading-relaxed">
                <li>
                  Buka <a href="https://sheets.new" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 font-bold underline">Google Spreadsheet Baru (sheets.new)</a> di akun Google Drive Anda, beri nama misalnya <b>Backup Database BCT</b>.
                </li>
                <li>
                  Di menu atas Google Sheet, klik <b>Ekstensi (Extensions)</b> &rarr; <b>Apps Script</b>.
                </li>
                <li>
                  Hapus isi kode yang ada di sana, klik tombol hijau <b>&ldquo;Salin Kode Script&rdquo;</b> di atas, lalu <b>Paste</b> dan tekan <b>Ctrl + S</b> (Simpan).
                </li>
                <li>
                  Klik tombol biru <b>Terapkan (Deploy)</b> di kanan atas &rarr; pilih <b>Deployment baru (New deployment)</b>.
                </li>
                <li>
                  Klik ikon roda gigi (Pilih jenis) &rarr; pilih <b>Aplikasi Web (Web app)</b>:
                  <ul className="list-disc list-inside pl-4 mt-1 text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                    <li>Execute as / Jalankan sebagai: <b>Me (Saya)</b></li>
                    <li>Who has access / Siapa yang memiliki akses: <b>Anyone (Siapa saja)</b></li>
                  </ul>
                </li>
                <li>
                  Klik <b>Terapkan (Deploy)</b>, klik <i>Authorize access / Berikan izin</i>, lalu salin <b>URL Aplikasi Web</b> yang muncul dan tempelkan ke kolom di sebelah kiri!
                </li>
              </ol>

              <div>
                <button
                  type="button"
                  onClick={() => setShowScriptGuide(!showScriptGuide)}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  {showScriptGuide ? 'Sembunyikan Kode Apps Script ▲' : 'Lihat Kode Apps Script ▼'}
                </button>

                {showScriptGuide && (
                  <pre className="mt-2 p-3 bg-slate-950 text-slate-100 rounded-xl text-[10px] font-mono overflow-x-auto max-h-56 border border-slate-800">
                    {scriptTemplate}
                  </pre>
                )}
              </div>
            </div>
          </div>

          {/* Backup History Log Table */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider pb-3 border-b border-slate-100 dark:border-slate-800">
              Riwayat Aktivitas Backup (Otomatis & Manual)
            </h3>

            {backupConfig.history.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                Belum ada riwayat backup. Klik &ldquo;Backup Sekarang ke Google Sheet&rdquo; untuk menguji koneksi pertama Anda.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                      <th className="py-2.5 px-3">Waktu Backup</th>
                      <th className="py-2.5 px-3">Metode</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                    {backupConfig.history.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-mono font-semibold whitespace-nowrap text-slate-700 dark:text-slate-300">
                          {item.timestamp}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              item.type === 'AUTO'
                                ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                                : 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                            }`}
                          >
                            {item.type === 'AUTO' ? 'OTOMATIS HARIAN' : 'MANUAL'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              item.status === 'SUCCESS'
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                            }`}
                          >
                            {item.status === 'SUCCESS' ? 'BERHASIL' : 'GAGAL'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                          {item.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Add Vendor */}
      <Modal
        isOpen={isVendorModalOpen}
        onClose={() => setIsVendorModalOpen(false)}
        title="Tambah Vendor Garansi"
        maxWidth="md"
      >
        <form onSubmit={handleCreateVendor} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Nama Vendor *
            </label>
            <input
              type="text"
              value={namaVendor}
              onChange={(e) => setNamaVendor(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Wilayah Operasional *
            </label>
            <select
              value={wilayah}
              onChange={(e) => setWilayah(e.target.value as 'BDG' | 'JKT' | 'OTHER')}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-hidden"
            >
              <option value="BDG">Bandung (BDG)</option>
              <option value="JKT">Jakarta (JKT)</option>
              <option value="OTHER">Lainnya (OTHER)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Alamat Lengkap
            </label>
            <textarea
              rows={3}
              value={alamatLengkap}
              onChange={(e) => setAlamatLengkap(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Kontak WhatsApp / HP
            </label>
            <input
              type="text"
              value={kontakWa}
              onChange={(e) => setKontakWa(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsVendorModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmittingVendor || !namaVendor.trim()}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 rounded-xl transition-colors disabled:opacity-50"
            >
              {isSubmittingVendor ? 'Menyimpan...' : 'Simpan Vendor'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Add Keluhan */}
      <Modal
        isOpen={isKeluhanModalOpen}
        onClose={() => setIsKeluhanModalOpen(false)}
        title="Tambah Preset Keluhan"
        maxWidth="sm"
      >
        <form onSubmit={handleCreateKeluhan} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Teks Keluhan *
            </label>
            <input
              type="text"
              value={teksKeluhan}
              onChange={(e) => setTeksKeluhan(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsKeluhanModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmittingKeluhan || !teksKeluhan.trim()}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 rounded-xl transition-colors disabled:opacity-50"
            >
              {isSubmittingKeluhan ? 'Menyimpan...' : 'Simpan Preset'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Edit Vendor */}
      <Modal
        isOpen={isEditVendorModalOpen}
        onClose={() => {
          if (!isSubmittingEditVendor) setIsEditVendorModalOpen(false);
        }}
        title="Edit Data Vendor"
        maxWidth="md"
      >
        <form onSubmit={handleUpdateVendor} className="space-y-4">
          {editVendorError && (
            <div className="p-2.5 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs rounded-xl border border-red-200 dark:border-red-900/50 font-semibold">
              {editVendorError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Nama Vendor *
            </label>
            <input
              type="text"
              required
              value={editNamaVendor}
              onChange={(e) => setEditNamaVendor(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Wilayah Operasional *
            </label>
            <select
              value={editWilayah}
              onChange={(e) => setEditWilayah(e.target.value as 'BDG' | 'JKT' | 'OTHER')}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-hidden focus:border-blue-500"
            >
              <option value="BDG">Bandung (BDG)</option>
              <option value="JKT">Jakarta (JKT)</option>
              <option value="OTHER">Lainnya (OTHER)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Alamat Lengkap
            </label>
            <textarea
              rows={3}
              value={editAlamatLengkap}
              onChange={(e) => setEditAlamatLengkap(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Kontak WhatsApp / HP
            </label>
            <input
              type="text"
              value={editKontakWa}
              onChange={(e) => setEditKontakWa(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={isSubmittingEditVendor}
              onClick={() => setIsEditVendorModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmittingEditVendor || !editNamaVendor.trim()}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>{isSubmittingEditVendor ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Delete Vendor */}
      <Modal
        isOpen={isDeleteVendorModalOpen}
        onClose={() => {
          if (!isDeletingVendor) setIsDeleteVendorModalOpen(false);
        }}
        title="Konfirmasi Hapus Vendor"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-xl border border-red-200 dark:border-red-900/50">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
            <div className="text-xs space-y-1">
              <p className="font-bold">Apakah Anda yakin ingin menghapus vendor ini?</p>
              <p className="text-slate-600 dark:text-slate-300 font-medium">
                Vendor <span className="font-bold text-slate-900 dark:text-white uppercase">&ldquo;{vendorToDelete?.nama_vendor}&rdquo;</span> ({vendorToDelete?.wilayah}) akan dihapus dari database data master.
              </p>
            </div>
          </div>

          {deleteVendorError && (
            <p className="text-xs text-red-600 font-semibold">{deleteVendorError}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={isDeletingVendor}
              onClick={() => setIsDeleteVendorModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isDeletingVendor}
              onClick={handleConfirmDeleteVendor}
              className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-xs shadow-red-500/20"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeletingVendor ? 'Menghapus...' : 'Ya, Hapus'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function MasterDataPage() {
  return (
    <Suspense fallback={null}>
      <MasterDataContent />
    </Suspense>
  );
}
