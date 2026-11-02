'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { MasterVendor, Ticket } from '@/types';
import { COMPANY_INFO } from '@/lib/constants';
import { Printer, Edit3, Building2, Eye, SlidersHorizontal, Check } from 'lucide-react';

interface ShippingLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorName?: string;
  noSuratJalan?: string;
  tickets?: Ticket[];
}

export function ShippingLabelModal({
  isOpen,
  onClose,
  vendorName = '',
  noSuratJalan = '',
  tickets = []
}: ShippingLabelModalProps) {
  const [vendors, setVendors] = useState<MasterVendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');

  // Editable fields for label
  const [namaPenerima, setNamaPenerima] = useState('');
  const [headerTitle, setHeaderTitle] = useState('');
  const [wilayah, setWilayah] = useState<string>('BDG');
  const [alamatLengkap, setAlamatLengkap] = useState('');
  const [kontakWa, setKontakWa] = useState('');
  const [isEditingCustom, setIsEditingCustom] = useState(false);

  // Size option: 'small' (Ukuran Kecil), 'large' (Ukuran Besar), 'both' (Keduanya di 1 lembar A4)
  const [labelSize, setLabelSize] = useState<'small' | 'large' | 'both'>('small');

  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/master/vendors')
      .then((res) => res.json())
      .then((data) => {
        const list: MasterVendor[] = data.vendors || [];
        setVendors(list);

        // Match initial vendorName if provided
        if (vendorName) {
          const found = list.find(
            (v) =>
              v.nama_vendor.toLowerCase() === vendorName.toLowerCase() ||
              vendorName.toLowerCase().includes(v.nama_vendor.toLowerCase()) ||
              v.nama_vendor.toLowerCase().includes(vendorName.toLowerCase())
          );
          if (found) {
            setSelectedVendorId(String(found.id));
            applyVendor(found);
          } else {
            setSelectedVendorId('custom');
            setHeaderTitle(vendorName.toUpperCase());
            setNamaPenerima(vendorName);
            setWilayah('OTHER');
            setAlamatLengkap('Alamat vendor / penerima tujuan');
            setKontakWa('-');
          }
        } else if (list.length > 0) {
          // Default to first vendor (e.g. Q-CHOX or first in list)
          const first = list[0];
          setSelectedVendorId(String(first.id));
          applyVendor(first);
        }
      })
      .catch((err) => console.error('Failed to load vendors:', err));
  }, [isOpen, vendorName]);

  const applyVendor = (v: MasterVendor) => {
    // Generate clean header name (short or full name)
    const shortName = v.nama_vendor
      .replace(/^(PT\.|CV\.|TOKO|SERVICE CENTER)\s+/i, '')
      .trim();
    setHeaderTitle(shortName || v.nama_vendor);
    setNamaPenerima(v.nama_vendor);
    setWilayah(v.wilayah || 'BDG');
    setAlamatLengkap(v.alamat_lengkap || '');
    setKontakWa(v.kontak_wa || '-');
  };

  const handleVendorSelect = (vId: string) => {
    setSelectedVendorId(vId);
    if (vId === 'custom') {
      setIsEditingCustom(true);
      return;
    }
    const found = vendors.find((v) => String(v.id) === vId);
    if (found) {
      applyVendor(found);
    }
  };

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cetak Label Alamat Pengiriman Vendor"
      subtitle="Format stiker pengiriman modern & rapi dengan data dari Master Vendor"
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Controls Toolbar (Hidden on Print) */}
        <div className="no-print bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Vendor Dropdown */}
            <div className="flex-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-500" />
                <span>Pilih Alamat Vendor (Dari Master Data):</span>
              </label>
              <select
                value={selectedVendorId}
                onChange={(e) => handleVendorSelect(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-hidden transition-all cursor-pointer shadow-2xs"
              >
                <option value="">-- Pilih Alamat Vendor --</option>
                {vendors.map((v) => (
                  <option key={v.id} value={String(v.id)}>
                    [{v.wilayah}] {v.nama_vendor}
                  </option>
                ))}
                <option value="custom">-- ✍️ Input Manual / Alamat Baru --</option>
              </select>
            </div>

            {/* Size Selector Segments */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Pilih Ukuran Cetak:
              </label>
              <div className="inline-flex items-center p-1 bg-slate-200/80 dark:bg-slate-700 rounded-xl">
                <button
                  type="button"
                  onClick={() => setLabelSize('small')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    labelSize === 'small'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  Ukuran Kecil
                </button>
                <button
                  type="button"
                  onClick={() => setLabelSize('large')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    labelSize === 'large'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  Ukuran Besar
                </button>
                <button
                  type="button"
                  onClick={() => setLabelSize('both')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    labelSize === 'both'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  Keduanya (A4)
                </button>
              </div>
            </div>

            {/* Toggle Edit Fields */}
            <div className="self-end md:self-auto">
              <button
                type="button"
                onClick={() => setIsEditingCustom(!isEditingCustom)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold rounded-xl border transition-all ${
                  isEditingCustom
                    ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                    : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditingCustom ? 'Sembunyikan Edit' : 'Edit Teks Langsung'}</span>
              </button>
            </div>
          </div>

          {/* Quick Custom Inputs (if user wants to customize before print) */}
          {isEditingCustom && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs animate-in fade-in duration-150">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Judul Header Bar (Nama Singkat Vendor)
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
                  Nama Penerima (Lengkap / Toko)
                </label>
                <input
                  type="text"
                  value={namaPenerima}
                  onChange={(e) => setNamaPenerima(e.target.value)}
                  placeholder="Contoh: Q-CHOX COMPUTER"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
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
                  placeholder="Jalan, No, Desa, Kecamatan, Kota / Patokan Alun-alun"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white leading-relaxed"
                />
              </div>

              <div className="sm:col-span-2">
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
            </div>
          )}
        </div>

        {/* Printable Area - Modernized Address Sticker Layout */}
        <div id="shipping-label-printable" className="printable-area space-y-8">
          {/* Label Ukuran Kecil */}
          {(labelSize === 'small' || labelSize === 'both') && (
            <div className="flex flex-col items-center">
              <span className="no-print text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                ── UKURAN KECIL ──
              </span>

              <div
                className="w-full max-w-[420px] bg-white rounded-lg border-2 border-red-600 overflow-hidden shadow-md text-slate-900 font-sans"
                style={{
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact'
                }}
              >
                {/* Red Header Bar */}
                <div
                  className="bg-red-600 text-white font-black text-center text-sm sm:text-base py-1.5 px-3 tracking-widest uppercase"
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

                  {/* Clean Divider */}
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
                  className="bg-red-600 text-white font-black text-center text-[11px] sm:text-xs py-1.5 px-3 tracking-wider uppercase"
                  style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
                >
                  HATI HATI BARANG MUDAH PECAH !!!
                </div>
              </div>
            </div>
          )}

          {/* Label Ukuran Besar */}
          {(labelSize === 'large' || labelSize === 'both') && (
            <div className="flex flex-col items-center">
              <span className="no-print text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                ── UKURAN BESAR ──
              </span>

              <div
                className="w-full max-w-[560px] bg-white rounded-xl border-4 border-red-600 overflow-hidden shadow-lg text-slate-900 font-sans"
                style={{
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact'
                }}
              >
                {/* Red Header Bar */}
                <div
                  className="bg-red-600 text-white font-black text-center text-lg sm:text-xl py-2.5 px-4 tracking-widest uppercase"
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

                  {/* Clean Divider */}
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
                  className="bg-red-600 text-white font-black text-center text-xs sm:text-sm py-2 px-4 tracking-widest uppercase"
                  style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
                >
                  HATI HATI BARANG MUDAH PECAH !!!
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions (No Print) */}
        <div className="no-print flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
            Tip: Format stiker siap tempel di kardus/paket pengiriman barang garansi & servis.
          </p>

          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:scale-95 shadow-md shadow-red-600/20 rounded-xl transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>
                Cetak Stiker {labelSize === 'small' ? '(Kecil)' : labelSize === 'large' ? '(Besar)' : '(Keduanya)'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
