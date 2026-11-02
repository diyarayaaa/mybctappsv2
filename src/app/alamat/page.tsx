'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Printer,
  Building2,
  Edit3,
  RotateCcw,
  ExternalLink,
  SlidersHorizontal,
  Check,
  Package,
  MapPin,
  Phone
} from 'lucide-react';
import { MasterVendor } from '@/types';
import { COMPANY_INFO } from '@/lib/constants';

export default function AlamatVendorPage() {
  const [vendors, setVendors] = useState<MasterVendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Editable label fields
  const [headerTitle, setHeaderTitle] = useState('');
  const [namaPenerima, setNamaPenerima] = useState('');
  const [alamatLengkap, setAlamatLengkap] = useState('');
  const [kontakWa, setKontakWa] = useState('');
  const [wilayah, setWilayah] = useState('BDG');
  const [isEditingCustom, setIsEditingCustom] = useState(false);

  // Filter view: 'all' (Berdampingan), 'small' (Hanya Kecil), 'large' (Hanya Besar)
  const [viewFilter, setViewFilter] = useState<'all' | 'small' | 'large'>('all');

  // Currently printing target (for single print)
  const [printTarget, setPrintTarget] = useState<'small' | 'large' | 'all'>('all');

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/master/vendors');
      const data = await res.json();
      const list: MasterVendor[] = data.vendors || [];
      setVendors(list);

      if (list.length > 0) {
        // Select first vendor by default (e.g. Q-CHOX or first)
        setSelectedVendorId(String(list[0].id));
        applyVendorData(list[0]);
      }
    } catch (err) {
      console.error('Failed to load vendors:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const applyVendorData = (v: MasterVendor) => {
    const shortName = v.nama_vendor
      .replace(/^(PT\.|CV\.|TOKO|SERVICE CENTER)\s+/i, '')
      .trim();
    setHeaderTitle(shortName || v.nama_vendor);
    setNamaPenerima(v.nama_vendor);
    setAlamatLengkap(v.alamat_lengkap || '');
    setKontakWa(v.kontak_wa || '');
    setWilayah(v.wilayah || 'BDG');
  };

  const handleVendorChange = (vId: string) => {
    setSelectedVendorId(vId);
    if (vId === 'custom') {
      setIsEditingCustom(true);
      setHeaderTitle('ALAMAT TUJUAN');
      setNamaPenerima('');
      setAlamatLengkap('');
      setKontakWa('');
      return;
    }
    const found = vendors.find((v) => String(v.id) === vId);
    if (found) {
      applyVendorData(found);
    }
  };

  const handleResetToVendor = () => {
    const found = vendors.find((v) => String(v.id) === selectedVendorId);
    if (found) {
      applyVendorData(found);
    }
  };

  const triggerPrint = (target: 'small' | 'large' | 'all') => {
    setPrintTarget(target);
    setTimeout(() => {
      window.print();
    }, 50);
  };

  return (
    <div className="space-y-6 w-full pb-16">
      {/* Page Header (No Print) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span className="text-red-600 text-2xl">📍</span>
            <span>Cetak Alamat Vendor (Stiker Pengiriman)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Format stiker paket rapi & modern dengan data otomatis tersinkronisasi dari Master Vendor
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/master?tab=vendor"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl transition-all shadow-2xs"
          >
            <Building2 className="w-3.5 h-3.5 text-blue-500" />
            <span>Kelola Master Vendor</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </Link>
        </div>
      </div>

      {/* Main Control Panel (No Print) */}
      <div className="no-print bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Dropdown Vendor */}
          <div className="flex-1 max-w-lg">
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-red-600" />
              <span>PILIH ALAMAT / VENDOR :</span>
            </label>
            <select
              value={selectedVendorId}
              onChange={(e) => handleVendorChange(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-bold rounded-xl border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-hidden transition-all cursor-pointer shadow-2xs"
            >
              {vendors.length === 0 && <option value="">Memuat data vendor...</option>}
              {vendors.map((v) => (
                <option key={v.id} value={String(v.id)}>
                  [{v.wilayah}] {v.nama_vendor}
                </option>
              ))}
              <option value="custom">-- ✍️ Input Manual / Alamat Kustom Baru --</option>
            </select>
          </div>

          {/* View Filter & Edit Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Selector */}
            <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
              <button
                type="button"
                onClick={() => setViewFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  viewFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Keduanya (A4)
              </button>
              <button
                type="button"
                onClick={() => setViewFilter('small')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  viewFilter === 'small'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Hanya Kecil
              </button>
              <button
                type="button"
                onClick={() => setViewFilter('large')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  viewFilter === 'large'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Hanya Besar
              </button>
            </div>

            {/* Edit Toggle Button */}
            <button
              type="button"
              onClick={() => setIsEditingCustom(!isEditingCustom)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-all ${
                isEditingCustom
                  ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300'
                  : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditingCustom ? 'Tutup Edit' : 'Edit Teks Stiker'}</span>
            </button>
          </div>
        </div>

        {/* Collapsible Quick Editor */}
        {isEditingCustom && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50/50 dark:bg-slate-800/40 p-4 rounded-xl border">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Header Bar Stiker (Nama Singkat Vendor)
              </label>
              <input
                type="text"
                value={headerTitle}
                onChange={(e) => setHeaderTitle(e.target.value)}
                placeholder="Contoh: Q CHOCK / ASUS BANDUNG"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Penerima (Nama Toko / Distributor)
              </label>
              <input
                type="text"
                value={namaPenerima}
                onChange={(e) => setNamaPenerima(e.target.value)}
                placeholder="Contoh: Q-CHOX COMPUTER"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Alamat Lengkap & Patokan
              </label>
              <textarea
                rows={2}
                value={alamatLengkap}
                onChange={(e) => setAlamatLengkap(e.target.value)}
                placeholder="Jalan, Desa, Kecamatan, Kota, Kode Pos & Patokan"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white leading-relaxed"
              />
            </div>

            <div className="sm:col-span-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  UP (PIC) & No. Telepon / WA
                </label>
                <input
                  type="text"
                  value={kontakWa}
                  onChange={(e) => setKontakWa(e.target.value)}
                  placeholder="Contoh: UP ANDI Q CHOCK (0821-2222-7280)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="sm:self-end">
                <button
                  type="button"
                  onClick={handleResetToVendor}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-100"
                  title="Kembalikan ke data default vendor ini"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Default</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Display Area (Berdampingan seperti Excel dulu) */}
      <div
        id="alamat-print-container"
        className="printable-area grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-start justify-center"
      >
        {/* ===================== KARTU 1: UKURAN KECIL ===================== */}
        {(viewFilter === 'all' || viewFilter === 'small') && (
          <div
            className={`flex flex-col items-center space-y-2.5 ${
              printTarget === 'large' ? 'print:hidden' : ''
            }`}
          >
            {/* Click to print button banner matching the classic Excel format */}
            <div className="no-print flex items-center justify-between w-full max-w-[440px]">
              <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                UKURAN KECIL
              </span>
              <button
                type="button"
                onClick={() => triggerPrint('small')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-black rounded-lg shadow-xs transition-all cursor-pointer"
                title="Cetak Stiker Ukuran Kecil"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>KLIK DISINI UNTUK CETAK</span>
              </button>
            </div>

            {/* Sticker Card - Ukuran Kecil */}
            <div
              className="w-full max-w-[440px] bg-white rounded-lg border-2 border-red-600 overflow-hidden shadow-md text-slate-900 font-sans"
              style={{
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact'
              }}
            >
              {/* Red Header Bar */}
              <div
                className="bg-red-600 text-white font-black text-center text-sm sm:text-base py-1.5 px-3 tracking-widest uppercase select-none"
                style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
              >
                {headerTitle || namaPenerima || 'ALAMAT PENERIMA'}
              </div>

              {/* Body Content */}
              <div className="p-4 sm:p-5 space-y-3.5 text-xs sm:text-sm">
                {/* Penerima */}
                <div>
                  <div className="font-black text-slate-900">
                    Penerima :{' '}
                    <span className="font-black text-slate-900 uppercase">
                      {namaPenerima || 'NAMA VENDOR'}
                    </span>
                  </div>

                  <div className="mt-1 pl-4 text-slate-800 font-medium whitespace-pre-line leading-relaxed text-[11px] sm:text-xs">
                    {alamatLengkap || 'Alamat vendor tujuan belum diatur di Master Vendor'}
                  </div>

                  <div className="mt-1 pl-4 font-bold text-slate-900 text-[11px] sm:text-xs">
                    {kontakWa ? (kontakWa.toUpperCase().startsWith('UP') ? kontakWa : `UP ${kontakWa}`) : '-'}
                  </div>
                </div>

                {/* Divider Line */}
                <div className="border-t border-slate-300 my-2" />

                {/* Pengirim */}
                <div>
                  <div className="font-black text-slate-900">
                    Pengirim :{' '}
                    <span className="font-bold text-slate-900">
                      {COMPANY_INFO.name}
                    </span>
                  </div>

                  <div className="mt-0.5 pl-4 text-slate-800 font-bold font-mono text-[11px] sm:text-xs">
                    ({COMPANY_INFO.phone})
                  </div>
                  <div className="pl-4 text-slate-500 text-[10px] sm:text-[11px]">
                    {COMPANY_INFO.address}
                  </div>
                </div>
              </div>

              {/* Red Warning Footer Bar */}
              <div
                className="bg-red-600 text-white font-black text-center text-[11px] sm:text-xs py-1.5 px-3 tracking-wider uppercase select-none"
                style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
              >
                HATI HATI BARANG MUDAH PECAH !!!
              </div>
            </div>
          </div>
        )}

        {/* ===================== KARTU 2: UKURAN BESAR ===================== */}
        {(viewFilter === 'all' || viewFilter === 'large') && (
          <div
            className={`flex flex-col items-center space-y-2.5 ${
              printTarget === 'small' ? 'print:hidden' : ''
            }`}
          >
            {/* Click to print button banner matching the classic Excel format */}
            <div className="no-print flex items-center justify-between w-full max-w-[560px]">
              <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                UKURAN BESAR
              </span>
              <button
                type="button"
                onClick={() => triggerPrint('large')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-black rounded-lg shadow-xs transition-all cursor-pointer"
                title="Cetak Stiker Ukuran Besar"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>KLIK DISINI UNTUK CETAK</span>
              </button>
            </div>

            {/* Sticker Card - Ukuran Besar */}
            <div
              className="w-full max-w-[560px] bg-white rounded-xl border-4 border-red-600 overflow-hidden shadow-lg text-slate-900 font-sans"
              style={{
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact'
              }}
            >
              {/* Red Header Bar */}
              <div
                className="bg-red-600 text-white font-black text-center text-lg sm:text-xl py-2.5 px-4 tracking-widest uppercase select-none"
                style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
              >
                {headerTitle || namaPenerima || 'ALAMAT PENERIMA'}
              </div>

              {/* Body Content */}
              <div className="p-5 sm:p-7 space-y-5 text-sm sm:text-base">
                {/* Penerima */}
                <div>
                  <div className="font-black text-base sm:text-lg text-slate-900">
                    Penerima :{' '}
                    <span className="font-black text-slate-900 uppercase">
                      {namaPenerima || 'NAMA VENDOR'}
                    </span>
                  </div>

                  <div className="mt-1.5 pl-5 text-slate-800 font-medium whitespace-pre-line leading-relaxed text-xs sm:text-sm">
                    {alamatLengkap || 'Alamat vendor tujuan belum diatur di Master Vendor'}
                  </div>

                  <div className="mt-1.5 pl-5 font-bold text-slate-900 text-xs sm:text-sm">
                    {kontakWa ? (kontakWa.toUpperCase().startsWith('UP') ? kontakWa : `UP ${kontakWa}`) : '-'}
                  </div>
                </div>

                {/* Divider Line */}
                <div className="border-t-2 border-slate-300 my-3" />

                {/* Pengirim */}
                <div>
                  <div className="font-black text-sm sm:text-base text-slate-900">
                    Pengirim :{' '}
                    <span className="font-extrabold text-slate-900">
                      {COMPANY_INFO.name}
                    </span>
                  </div>

                  <div className="mt-1 pl-5 text-slate-800 font-bold font-mono text-xs sm:text-sm">
                    ({COMPANY_INFO.phone})
                  </div>
                  <div className="pl-5 text-slate-500 text-xs mt-0.5">
                    {COMPANY_INFO.address}
                  </div>
                </div>
              </div>

              {/* Red Warning Footer Bar */}
              <div
                className="bg-red-600 text-white font-black text-center text-xs sm:text-sm py-2 px-4 tracking-widest uppercase select-none"
                style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
              >
                HATI HATI BARANG MUDAH PECAH !!!
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Bottom Bar for Bulk Print (No Print) */}
      <div className="no-print fixed bottom-4 right-4 sm:right-8 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl flex items-center gap-3">
        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 hidden md:inline">
          Cetak Cepat:
        </span>
        <button
          type="button"
          onClick={() => triggerPrint('small')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Kecil</span>
        </button>
        <button
          type="button"
          onClick={() => triggerPrint('large')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Besar</span>
        </button>
        <button
          type="button"
          onClick={() => triggerPrint('all')}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:scale-95 shadow-md shadow-red-600/20 rounded-xl transition-all cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Cetak 1 Lembar A4</span>
        </button>
      </div>
    </div>
  );
}
