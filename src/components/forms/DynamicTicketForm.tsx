'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  JenisLayanan,
  JenisBarang,
  StatusTiket,
  HasilServiceGaransi,
  Ticket,
  MasterVendor,
  MasterKeluhan
} from '@/types';
import {
  TEKNISI_LIST,
  JENIS_BARANG_LIST,
  KELENGKAPAN_MAP,
  STATUS_LIST_GARANSI,
  STATUS_LIST_SERVICE
} from '@/lib/constants';
import {
  Save,
  Wrench,
  ShieldAlert,
  FileText,
  Calendar,
  DollarSign,
  AlertCircle,
  Truck,
  ArrowLeft,
  Check
} from 'lucide-react';
import Link from 'next/link';
import { AppSheetEnumList } from '@/components/forms/AppSheetEnumList';

interface DynamicTicketFormProps {
  initialData?: Partial<Ticket>;
  isEditMode?: boolean;
}

export function DynamicTicketForm({
  initialData,
  isEditMode = false
}: DynamicTicketFormProps) {
  const router = useRouter();

  // Basic Details
  const [nomorLayanan, setNomorLayanan] = useState(initialData?.nomor_layanan || '');
  const [isAutoNumberLoading, setIsAutoNumberLoading] = useState(!initialData?.nomor_layanan);
  const [jenisLayanan, setJenisLayanan] = useState<JenisLayanan>(initialData?.jenis_layanan || 'SERVICE');

  // Customer
  const [namaCustomer, setNamaCustomer] = useState(
    initialData?.nama_customer || (isEditMode ? '' : 'TN/NY. ')
  );
  const [noHp, setNoHp] = useState(initialData?.no_hp || '');

  // Device
  const [jenisBarang, setJenisBarang] = useState<JenisBarang>(initialData?.jenis_barang || 'Laptop');
  const [namaBarang, setNamaBarang] = useState(initialData?.nama_barang || '');
  const [serialNumber, setSerialNumber] = useState(initialData?.serial_number || '');
  const [keluhan, setKeluhan] = useState(initialData?.keluhan || '');
  const [selectedKeluhan, setSelectedKeluhan] = useState<string[]>(() => {
    if (!initialData?.keluhan) return [];
    return initialData.keluhan
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  });

  const [kelengkapan, setKelengkapan] = useState<string[]>(
    Array.isArray(initialData?.kelengkapan) ? initialData.kelengkapan : ['Unit', 'Charger']
  );
  const [estimasiSelesai, setEstimasiSelesai] = useState(initialData?.estimasi_selesai || '');

  // Assignment & Status
  const [teknisi, setTeknisi] = useState(initialData?.teknisi || 'Wandi');
  const [status, setStatus] = useState<StatusTiket>(
    initialData?.status ?? (initialData?.jenis_layanan === 'GARANSI' ? ('' as StatusTiket) : 'PROSES SERVICE')
  );
  const [catatan, setCatatan] = useState(initialData?.catatan || '');

  // Finance
  const [estimasiBiaya, setEstimasiBiaya] = useState<number>(initialData?.estimasi_biaya ?? 0);
  const [dp, setDp] = useState<number>(initialData?.dp ?? 0);
  const [biayaAkhir, setBiayaAkhir] = useState<number>(initialData?.biaya_akhir ?? 0);

  // Vendor / RMA Logistics
  const [noSuratJalan, setNoSuratJalan] = useState(initialData?.no_surat_jalan || '');
  const [distributorVendor, setDistributorVendor] = useState(initialData?.distributor_vendor || '');
  const [tglKirimVendor, setTglKirimVendor] = useState(initialData?.tgl_kirim_vendor || '');
  const [tglDatangVendor, setTglDatangVendor] = useState(initialData?.tgl_datang_vendor || '');
  const [hasilServiceGaransi, setHasilServiceGaransi] = useState<HasilServiceGaransi | ''>(
    initialData?.hasil_service_garansi || ''
  );
  const [snBaru, setSnBaru] = useState(initialData?.sn_baru || '');
  const [tglDiambilCustomer, setTglDiambilCustomer] = useState(initialData?.tgl_diambil_customer || '');

  // Master Data
  const [vendors, setVendors] = useState<MasterVendor[]>([]);
  const [keluhanList, setKeluhanList] = useState<MasterKeluhan[]>([]);

  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [customKelengkapanInput, setCustomKelengkapanInput] = useState('');

  // Fetch next service number if creating new ticket
  useEffect(() => {
    if (!isEditMode && !nomorLayanan) {
      fetch('/api/tickets/next-number')
        .then((res) => res.json())
        .then((data) => {
          if (data.nextNumber) {
            setNomorLayanan(data.nextNumber);
          }
        })
        .catch((err) => console.error('Failed to get next number:', err))
        .finally(() => setIsAutoNumberLoading(false));
    }
  }, [isEditMode, nomorLayanan]);

  // Fetch Vendors & Keluhan list
  useEffect(() => {
    fetch('/api/master/vendors')
      .then((res) => res.json())
      .then((data) => setVendors(data.vendors || []))
      .catch((err) => console.error('Failed to fetch vendors:', err));

    fetch('/api/master/keluhan')
      .then((res) => res.json())
      .then((data) => setKeluhanList(data.keluhan || []))
      .catch((err) => console.error('Failed to fetch keluhan list:', err));
  }, []);

  const handleJenisBarangChange = (newJenis: JenisBarang) => {
    setJenisBarang(newJenis);
    if (!isEditMode) {
      if (newJenis === 'Laptop') setKelengkapan(['Unit', 'Charger']);
      else if (newJenis === 'PC') setKelengkapan(['Dus', 'PSU', 'Tutup case full']);
      else setKelengkapan(['Fulldus', 'Unit Saja']);
    }
  };

  const toggleKelengkapan = (item: string) => {
    if (kelengkapan.includes(item)) {
      setKelengkapan(kelengkapan.filter((k) => k !== item));
    } else {
      setKelengkapan([...kelengkapan, item]);
    }
  };

  const handleAddCustomKelengkapan = () => {
    if (customKelengkapanInput.trim() && !kelengkapan.includes(customKelengkapanInput.trim())) {
      setKelengkapan([...kelengkapan, customKelengkapanInput.trim()]);
      setCustomKelengkapanInput('');
    }
  };

  const sisaBiaya = Math.max(0, estimasiBiaya - dp);
  const isGaransiOrAlih = jenisLayanan === 'GARANSI' || status === 'ALIH SERVICE' || status === 'PROSES GARANSI';
  const isGantiBaru = hasilServiceGaransi === 'Diganti baru';
  const isSelesaiDiambil = status === 'SELESAI & DIAMBIL' || status === 'GAGAL SERVICE/GARANSI';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!namaCustomer.trim()) {
      setErrorMessage('Nama Customer wajib diisi');
      return;
    }
    if (!namaBarang.trim()) {
      setErrorMessage('Nama Barang / Perangkat wajib diisi');
      return;
    }
    if (!serialNumber.trim()) {
      setErrorMessage('Serial Number wajib diisi');
      return;
    }
    if (!keluhan.trim()) {
      setErrorMessage('Keluhan kerusakan wajib diisi');
      return;
    }
    if (isGaransiOrAlih && isGantiBaru && !snBaru.trim()) {
      setErrorMessage('Serial Number Baru (SN Baru) wajib diisi untuk hasil garansi Diganti baru');
      return;
    }

    setIsSubmitting(true);

    try {
      const activeActor = localStorage.getItem('bct_current_user') || teknisi || 'Wandi';

      const payload = {
        nomor_layanan: nomorLayanan.trim(),
        jenis_layanan: jenisLayanan,
        nama_customer: namaCustomer.trim(),
        no_hp: noHp.trim(),
        jenis_barang: jenisBarang,
        nama_barang: namaBarang.trim(),
        serial_number: serialNumber.trim(),
        keluhan: keluhan.trim(),
        kelengkapan: kelengkapan,
        estimasi_selesai: estimasiSelesai || null,
        teknisi: teknisi,
        status: status,
        catatan: catatan.trim() || null,
        estimasi_biaya: Number(estimasiBiaya) || 0,
        dp: Number(dp) || 0,
        sisa: sisaBiaya,
        biaya_akhir: isSelesaiDiambil ? (Number(biayaAkhir) || Number(estimasiBiaya)) : 0,
        no_surat_jalan: isGaransiOrAlih ? (noSuratJalan.trim() || null) : null,
        distributor_vendor: isGaransiOrAlih ? (distributorVendor.trim() || null) : null,
        tgl_kirim_vendor: isGaransiOrAlih ? (tglKirimVendor || null) : null,
        tgl_datang_vendor: isGaransiOrAlih ? (tglDatangVendor || null) : null,
        hasil_service_garansi: isGaransiOrAlih ? (hasilServiceGaransi || null) : null,
        sn_baru: isGaransiOrAlih && isGantiBaru ? (snBaru.trim() || null) : null,
        tgl_diambil_customer: isSelesaiDiambil ? (tglDiambilCustomer || new Date().toISOString().replace('T', ' ').slice(0, 19)) : null,
        actor: activeActor
      };

      const url = isEditMode && initialData?.id ? `/api/tickets/${initialData.id}` : '/api/tickets';
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Terjadi kesalahan saat menyimpan tiket');
      }

      if (isEditMode) {
        router.push(`/tickets/${initialData?.id || ''}`);
      } else {
        router.push(`/tickets/${data.ticket?.id || ''}`);
      }
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentKelengkapanOptions = KELENGKAPAN_MAP[jenisBarang] || KELENGKAPAN_MAP['Other'];

  return (
    <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8 max-w-5xl mx-auto pb-12">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/tickets"
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {isEditMode ? `Edit Tiket [${nomorLayanan}]` : 'Buat Tiket Servis & RMA Baru'}
            </h1>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-lg shadow-blue-600/25 rounded-xl transition-all disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{isSubmitting ? 'Menyimpan...' : isEditMode ? 'Simpan Perubahan' : 'Simpan Tiket'}</span>
        </button>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-3 text-rose-800 dark:text-rose-300 text-xs sm:text-sm font-medium animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Section 1: Kategori & No Layanan */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 sm:space-y-5 transition-colors">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Wrench className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            1. Jenis Layanan & Penomoran
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {/* Jenis Layanan Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Jenis Layanan *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setJenisLayanan('SERVICE');
                  if (!STATUS_LIST_SERVICE.includes(status)) setStatus('PROSES SERVICE');
                }}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border ${
                  jenisLayanan === 'SERVICE'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                SERVICE REGULER
              </button>
              <button
                type="button"
                onClick={() => {
                  setJenisLayanan('GARANSI');
                  if (!STATUS_LIST_GARANSI.includes(status)) setStatus('' as StatusTiket);
                }}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border ${
                  jenisLayanan === 'GARANSI'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                KLAIM GARANSI
              </button>
            </div>
          </div>

          {/* Nomor Layanan */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Nomor Layanan (RMA) *
              </label>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">
                Bisa diedit
              </span>
            </div>
            <input
              type="text"
              value={nomorLayanan}
              onChange={(e) => setNomorLayanan(e.target.value)}
              className="w-full px-3.5 py-2 sm:py-2.5 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 text-sm font-mono font-bold text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Teknisi */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Teknisi Penanggung Jawab *
            </label>
            <select
              value={teknisi}
              onChange={(e) => setTeknisi(e.target.value)}
              className="w-full px-3.5 py-2 sm:py-2.5 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:outline-hidden"
            >
              {TEKNISI_LIST.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Section 2: Data Pelanggan */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 sm:space-y-5 transition-colors">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <ShieldAlert className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            2. Informasi Pelanggan
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {/* Nama Customer */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Nama Customer *
              </label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setNamaCustomer('STOCK BCT')}
                  className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/70 rounded active:scale-95 transition-all"
                >
                  + STOCK BCT
                </button>
                <button
                  type="button"
                  onClick={() => setNamaCustomer('TN/NY. ')}
                  className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/70 rounded active:scale-95 transition-all"
                >
                  TN/NY.
                </button>
              </div>
            </div>
            <input
              type="text"
              value={namaCustomer}
              onChange={(e) => setNamaCustomer(e.target.value)}
              className="w-full px-3.5 py-2 sm:py-2.5 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Nomor WhatsApp */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Nomor WhatsApp / HP *
            </label>
            <input
              type="text"
              value={noHp}
              onChange={(e) => setNoHp(e.target.value)}
              className="w-full px-3.5 py-2 sm:py-2.5 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Section 3: Data Perangkat & Keluhan */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 sm:space-y-5 transition-colors">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            3. Informasi Perangkat, Keluhan & Kelengkapan
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {/* Jenis Barang */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Jenis Barang *
            </label>
            <select
              value={jenisBarang}
              onChange={(e) => handleJenisBarangChange(e.target.value as JenisBarang)}
              className="w-full px-3.5 py-2 sm:py-2.5 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:outline-hidden"
            >
              {JENIS_BARANG_LIST.map((jb) => (
                <option key={jb} value={jb}>
                  {jb}
                </option>
              ))}
            </select>
          </div>

          {/* Nama Barang */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Nama Barang / Model *
            </label>
            <input
              type="text"
              value={namaBarang}
              onChange={(e) => setNamaBarang(e.target.value)}
              className="w-full px-3.5 py-2 sm:py-2.5 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Serial Number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Serial Number (SN) *
            </label>
            <input
              type="text"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              className="w-full px-3.5 py-2 sm:py-2.5 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 text-sm font-mono font-bold text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Keluhan Kerusakan (AppSheet EnumList Dropdown) */}
        <AppSheetEnumList
          label="Keluhan Kerusakan"
          selectedValues={selectedKeluhan}
          options={keluhanList}
          onChange={(newValues) => {
            setSelectedKeluhan(newValues);
            setKeluhan(newValues.join(', '));
          }}
          onAddNewOption={async (newText) => {
            try {
              const res = await fetch('/api/master/keluhan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teks_keluhan: newText })
              });
              const data = await res.json();
              if (!data.error) {
                const listRes = await fetch('/api/master/keluhan');
                const listData = await listRes.json();
                if (listData.keluhan) {
                  setKeluhanList(listData.keluhan);
                }
              }
            } catch (err) {
              console.error('Failed to save custom keluhan to master:', err);
            }
          }}
          required
          placeholder="Pilih atau cari keluhan kerusakan..."
        />

        {/* Dynamic Kelengkapan Checklist */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Kelengkapan Dititipkan ({jenisBarang})
            </label>
            <span className="text-[11px] text-slate-400">Klik untuk memilih</span>
          </div>

          <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3">
            {currentKelengkapanOptions.map((opt) => {
              const isSelected = kelengkapan.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleKelengkapan(opt)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-slate-900 dark:bg-blue-500 text-white border-slate-900 dark:border-blue-500 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 dark:text-white" />}
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={customKelengkapanInput}
              onChange={(e) => setCustomKelengkapanInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomKelengkapan();
                }
              }}
              className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-hidden"
            />
            <button
              type="button"
              onClick={handleAddCustomKelengkapan}
              className="px-3 py-1.5 text-xs font-bold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-lg transition-colors"
            >
              + Tambah
            </button>
          </div>
        </div>

        {/* Catatan Tambahan */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
            Catatan Khusus / Password / PIN Perangkat
          </label>
          <input
            type="text"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Section 4: Status Pengerjaan & Estimasi */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 sm:space-y-5 transition-colors">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            4. Status Pengerjaan & Estimasi Waktu
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {/* Status Tiket */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Status Pengerjaan Saat Ini *
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusTiket)}
              className="w-full px-3.5 py-2 sm:py-2.5 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:outline-hidden"
            >
              {jenisLayanan === 'GARANSI' && (
                <option value="">-- Belum Ada Status (Kosong) --</option>
              )}
              {(jenisLayanan === 'GARANSI' ? STATUS_LIST_GARANSI : STATUS_LIST_SERVICE).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Estimasi Selesai */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Estimasi Selesai
            </label>
            <input
              type="date"
              value={estimasiSelesai}
              onChange={(e) => setEstimasiSelesai(e.target.value)}
              className="w-full px-3.5 py-2 sm:py-2.5 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Section 5: Matrix Kondisional Garansi & Alih Servis */}
      {isGaransiOrAlih && (
        <div className="bg-blue-50/50 dark:bg-blue-950/20 p-4 sm:p-6 rounded-2xl border-2 border-blue-200 dark:border-blue-800 shadow-sm space-y-4 sm:space-y-5 animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xs sm:text-sm font-bold text-blue-950 dark:text-blue-200 uppercase tracking-wider">
                5. Alur Logistik Vendor & Klaim Garansi
              </h2>
            </div>
            <span className="text-[10px] sm:text-xs font-bold bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-200 px-2.5 py-0.5 rounded-full">
              Vendor Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            {/* Vendor */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Distributor / Vendor *
              </label>
              <select
                value={distributorVendor}
                onChange={(e) => setDistributorVendor(e.target.value)}
                className="w-full px-3.5 py-2 sm:py-2.5 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="">-- Pilih Vendor --</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.nama_vendor}>
                    {v.nama_vendor} ({v.wilayah})
                  </option>
                ))}
              </select>
            </div>

            {/* No Surat Jalan */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                No. Surat Jalan
              </label>
              <input
                type="text"
                value={noSuratJalan}
                onChange={(e) => setNoSuratJalan(e.target.value)}
                className="w-full px-3.5 py-2 sm:py-2.5 bg-white dark:bg-slate-800 text-sm font-mono font-semibold text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            {/* Hasil Service */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Hasil Service / Garansi
              </label>
              <select
                value={hasilServiceGaransi}
                onChange={(e) => setHasilServiceGaransi(e.target.value as HasilServiceGaransi)}
                className="w-full px-3.5 py-2 sm:py-2.5 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="">-- Belum Ada Hasil --</option>
                <option value="Diservice">Diservice (Unit Sama)</option>
                <option value="Diganti baru">Diganti baru (Unit Baru)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Tgl Kirim ke Vendor
              </label>
              <input
                type="date"
                value={tglKirimVendor}
                onChange={(e) => setTglKirimVendor(e.target.value)}
                className="w-full px-3.5 py-2 sm:py-2.5 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Tgl Datang dari Vendor
              </label>
              <input
                type="date"
                value={tglDatangVendor}
                onChange={(e) => setTglDatangVendor(e.target.value)}
                className="w-full px-3.5 py-2 sm:py-2.5 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Conditional Mandatory SN Baru */}
          {isGantiBaru && (
            <div className="p-4 bg-blue-100 dark:bg-blue-950/60 rounded-xl border-2 border-blue-400 dark:border-blue-700 animate-in slide-in-from-top-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-extrabold text-blue-950 dark:text-blue-200 uppercase tracking-wider">
                  Serial Number Baru (SN Baru) * Wajib Diisi
                </label>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-500 text-white rounded">
                  Mandatory
                </span>
              </div>
              <input
                type="text"
                value={snBaru}
                onChange={(e) => setSnBaru(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 text-sm font-mono font-bold text-slate-900 dark:text-white rounded-xl border border-blue-400 dark:border-blue-600 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          )}
        </div>
      )}

      {/* Section 6: Keuangan & Pelunasan */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 sm:space-y-5 transition-colors">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            6. Rincian Keuangan
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {/* Estimasi Biaya */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Estimasi Biaya (Rp)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
              <input
                type="number"
                min="0"
                step="1000"
                value={estimasiBiaya}
                onChange={(e) => setEstimasiBiaya(Number(e.target.value))}
                className="w-full pl-10 pr-3.5 py-2 sm:py-2.5 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* DP */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              DP / Uang Muka (Rp)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
              <input
                type="number"
                min="0"
                step="1000"
                value={dp}
                onChange={(e) => setDp(Number(e.target.value))}
                className="w-full pl-10 pr-3.5 py-2 sm:py-2.5 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-emerald-700 dark:text-emerald-400 rounded-xl border border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Sisa */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Sisa Pembayaran (Auto)
            </label>
            <div className="px-3.5 py-2 sm:py-2.5 bg-blue-50/80 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 dark:text-blue-300">Sisa:</span>
              <span className="text-sm sm:text-base font-extrabold text-blue-600 dark:text-blue-400">
                Rp {sisaBiaya.toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>

        {/* Pelunasan if Selesai & Diambil */}
        {isSelesaiDiambil && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-300 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Biaya Akhir / Total Nota Pelunasan (Rp)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                <input
                  type="number"
                  min="0"
                  value={biayaAkhir || estimasiBiaya}
                  onChange={(e) => setBiayaAkhir(Number(e.target.value))}
                  className="w-full pl-10 pr-3.5 py-2 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-600 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Tanggal & Waktu Diambil Customer
              </label>
              <input
                type="datetime-local"
                value={tglDiambilCustomer ? tglDiambilCustomer.replace(' ', 'T').slice(0, 16) : ''}
                onChange={(e) => setTglDiambilCustomer(e.target.value.replace('T', ' '))}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-600 focus:outline-hidden"
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Save Bar */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
        <Link
          href="/tickets"
          className="px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
        >
          Batal
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 px-6 sm:px-8 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-lg shadow-blue-600/25 rounded-xl transition-all disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{isSubmitting ? 'Menyimpan...' : isEditMode ? 'Simpan Perubahan' : 'Simpan Tiket'}</span>
        </button>
      </div>
    </form>
  );
}
