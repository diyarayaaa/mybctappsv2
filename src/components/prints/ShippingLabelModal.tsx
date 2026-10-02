'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { MasterVendor, Ticket } from '@/types';
import { COMPANY_INFO } from '@/lib/constants';
import { Printer, Box, Truck, Edit3, Building2, MapPin, Phone } from 'lucide-react';

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
  const [wilayah, setWilayah] = useState<'BDG' | 'JKT' | 'OTHER' | string>('JKT');
  const [alamatLengkap, setAlamatLengkap] = useState('');
  const [kontakWa, setKontakWa] = useState('');
  const [customIsiPaket, setCustomIsiPaket] = useState('');
  const [ekspedisi, setEkspedisi] = useState('J&T / JNE / Travel');
  const [isEditingCustom, setIsEditingCustom] = useState(false);

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
            (v) => v.nama_vendor.toLowerCase() === vendorName.toLowerCase() ||
                   vendorName.toLowerCase().includes(v.nama_vendor.toLowerCase()) ||
                   v.nama_vendor.toLowerCase().includes(vendorName.toLowerCase())
          );
          if (found) {
            setSelectedVendorId(String(found.id));
            setNamaPenerima(found.nama_vendor);
            setWilayah(found.wilayah || 'JKT');
            setAlamatLengkap(found.alamat_lengkap || '');
            setKontakWa(found.kontak_wa || '-');
          } else {
            setSelectedVendorId('custom');
            setNamaPenerima(vendorName);
            setWilayah(vendorName.toUpperCase().includes('BDG') ? 'BDG' : 'JKT');
            setAlamatLengkap('Alamat vendor tujuan');
            setKontakWa('-');
          }
        } else if (list.length > 0) {
          // Default to first vendor
          const first = list[0];
          setSelectedVendorId(String(first.id));
          setNamaPenerima(first.nama_vendor);
          setWilayah(first.wilayah || 'JKT');
          setAlamatLengkap(first.alamat_lengkap || '');
          setKontakWa(first.kontak_wa || '-');
        }
      })
      .catch((err) => console.error('Failed to load vendors:', err));
  }, [isOpen, vendorName]);

  const handleVendorSelect = (vId: string) => {
    setSelectedVendorId(vId);
    if (vId === 'custom') {
      setIsEditingCustom(true);
      return;
    }
    const found = vendors.find((v) => String(v.id) === vId);
    if (found) {
      setNamaPenerima(found.nama_vendor);
      setWilayah(found.wilayah || 'JKT');
      setAlamatLengkap(found.alamat_lengkap || '');
      setKontakWa(found.kontak_wa || '-');
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
      title="Cetak Label Alamat Pengiriman (Stiker Paket)"
      subtitle="Pilih vendor dari Master Data atau ketik alamat tujuan secara fleksibel"
      maxWidth="3xl"
    >
      <div className="space-y-5">
        {/* Controls Bar (No Print) */}
        <div className="no-print bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Pilih Distributor / Vendor Tujuan:
              </label>
              <select
                value={selectedVendorId}
                onChange={(e) => handleVendorSelect(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-600 focus:outline-hidden"
              >
                <option value="custom">-- ✍️ Input Manual / Alamat Kustom --</option>
                {vendors.map((v) => (
                  <option key={v.id} value={String(v.id)}>
                    [{v.wilayah}] {v.nama_vendor}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setIsEditingCustom(!isEditingCustom)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditingCustom ? 'Sembunyikan Edit' : 'Edit Teks Label'}</span>
            </button>
          </div>

          {/* Quick Custom Inputs if editing */}
          {isEditingCustom && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Nama Penerima / Vendor</label>
                <input
                  type="text"
                  value={namaPenerima}
                  onChange={(e) => setNamaPenerima(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Wilayah / Ekspedisi</label>
                <input
                  type="text"
                  value={ekspedisi}
                  onChange={(e) => setEkspedisi(e.target.value)}
                  placeholder="Ekspedisi / Travel"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Alamat Lengkap Tujuan</label>
                <textarea
                  rows={2}
                  value={alamatLengkap}
                  onChange={(e) => setAlamatLengkap(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">UP / PIC & No. Telepon</label>
                <input
                  type="text"
                  value={kontakWa}
                  onChange={(e) => setKontakWa(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Catatan Isi Paket (Opsional)</label>
                <input
                  type="text"
                  value={customIsiPaket}
                  onChange={(e) => setCustomIsiPaket(e.target.value)}
                  placeholder="Contoh: 1 Unit Laptop Asus + Charger"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Printable Label Box */}
        <div
          id="shipping-label-area"
          className="printable-area bg-white p-6 rounded-2xl border-2 border-dashed border-slate-900 text-slate-900 text-sm shadow-sm space-y-4"
        >
          {/* Header Label */}
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-slate-900 text-white rounded-lg">
                <Box className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight uppercase">
                  LABEL PENGIRIMAN PAKET RMA & SERVIS
                </h3>
                <p className="text-xs font-semibold text-slate-600">FRAGILE / HATI-HATI BARANG ELEKTRONIK</p>
              </div>
            </div>

            <div className="text-right">
              {noSuratJalan ? (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">No. Surat Jalan</span>
                  <span className="font-mono font-bold text-sm bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                    {noSuratJalan}
                  </span>
                </div>
              ) : (
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Pengiriman</span>
                  <span className="font-bold text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                    {ekspedisi}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Grid Pengirim vs Penerima */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Pengirim */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-300">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1">
                PENGIRIM (FROM):
              </p>
              <p className="font-bold text-slate-900">{COMPANY_INFO.name}</p>
              <p className="text-xs font-semibold text-blue-600">{COMPANY_INFO.subName}</p>
              <p className="text-xs text-slate-600 mt-1">{COMPANY_INFO.address}</p>
              <p className="text-xs text-slate-800 font-mono mt-1">Telp/WA: {COMPANY_INFO.phone}</p>
            </div>

            {/* Penerima */}
            <div className="p-3 bg-amber-50/60 rounded-xl border-2 border-amber-400">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-900">
                  PENERIMA (TO):
                </p>
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-200 text-amber-900 border border-amber-400 uppercase">
                  {wilayah || 'VENDOR'}
                </span>
              </div>
              <p className="font-extrabold text-base text-slate-900">{namaPenerima || 'Distributor / Vendor'}</p>
              <p className="text-xs text-slate-700 mt-1 whitespace-pre-line font-medium leading-relaxed">
                {alamatLengkap || 'Alamat vendor tujuan'}
              </p>
              <p className="text-xs text-slate-900 font-mono font-bold mt-2 pt-1 border-t border-amber-200">
                UP / Kontak: {kontakWa || '-'}
              </p>
            </div>
          </div>

          {/* Isi Paket Ringkas (Jika ada tiket dari Surat Jalan atau Custom Input) */}
          {tickets.length > 0 ? (
            <div className="pt-2 border-t border-slate-200 text-xs">
              <p className="font-bold text-slate-700 mb-1">Isi Paket ({tickets.length} Unit Perangkat):</p>
              <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-mono text-[11px]">
                {tickets.map((t, idx) => (
                  <div key={idx} className="flex justify-between text-slate-700">
                    <span>
                      {idx + 1}. {t.nama_barang} (SN: {t.serial_number})
                    </span>
                    <span className="text-slate-500 font-sans">[{t.nomor_layanan}]</span>
                  </div>
                ))}
              </div>
            </div>
          ) : customIsiPaket ? (
            <div className="pt-2 border-t border-slate-200 text-xs">
              <p className="font-bold text-slate-700 mb-1">Deskripsi Paket:</p>
              <p className="bg-slate-50 p-2 rounded-lg border border-slate-200 font-medium text-slate-800">
                {customIsiPaket}
              </p>
            </div>
          ) : null}
        </div>

        {/* Action Buttons */}
        <div className="no-print flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 active:scale-95 shadow-md shadow-blue-500/20 rounded-xl transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Label Alamat (Stiker)</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}

