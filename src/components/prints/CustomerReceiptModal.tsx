'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Ticket } from '@/types';
import { formatDateIndo } from '@/lib/whatsapp-formatter';
import { Printer, FileText, Sparkles, Scissors } from 'lucide-react';

interface CustomerReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket | null;
}

// Helper format tanggal lengkap Indonesia seperti di contoh-tt-1.pdf ("Senin, 07 September 2026")
function formatDateFullIndo(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const dayName = days[d.getDay()];
    const day = String(d.getDate()).padStart(2, '0');
    const monthName = months[d.getMonth()];
    const year = d.getFullYear();
    return `${dayName}, ${day} ${monthName} ${year}`;
  } catch {
    return dateStr;
  }
}

// FORMAT 1: TANDA TERIMA STANDAR (Persis 100% seperti contoh-tt-1.pdf & Gambar 2)
function StandardReceipt({ ticket }: { ticket: Ticket }) {
  const kelengkapanList = Array.isArray(ticket.kelengkapan) ? ticket.kelengkapan : [];
  const kelengkapanStr = kelengkapanList.length > 0 ? kelengkapanList.join(', ') : 'TUTUP CASING FULL';
  const customerNameUpper = ticket.nama_customer.toUpperCase().startsWith('TN') || ticket.nama_customer.toUpperCase().startsWith('NY')
    ? ticket.nama_customer.toUpperCase()
    : `TN/NY. ${ticket.nama_customer.toUpperCase()}`;

  return (
    <div
      className="bg-white text-black font-sans text-xs leading-tight w-full max-w-[780px] mx-auto print:max-w-none print:w-full print:p-0 print:m-0"
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      {/* KOTAK ATAS: Dikelilingi Border Hitam Penuh di Semua Sisi (Sesuai Gambar 2) */}
      <div className="border-[1.5px] border-black p-3 sm:p-4 mb-2.5 bg-white">
        {/* 1. Header (Logo, Toko, Judul Tanda Terima) */}
        <div className="flex items-start justify-between pb-2 border-b border-black">
          {/* Kiri: Logo + Info Toko */}
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Logo"
              className="w-12 h-12 object-contain"
            />
            <div>
              <h1 className="text-xs sm:text-sm font-bold tracking-tight text-black uppercase leading-tight">
                BEST COMPUTEL RMA & SERVICE
              </h1>
              <p className="text-[10px] sm:text-[11px] text-black leading-tight">
                Jl. Terusan pembangunan No.9C, Tarogong kidul - Garut
              </p>
              <p className="text-[10px] sm:text-[11px] text-black leading-tight">
                WA. 0895-2665-5777
              </p>
            </div>
          </div>

          {/* Kanan: Judul & No RMA */}
          <div className="text-right">
            <h2 className="text-base sm:text-xl font-bold text-black tracking-tight uppercase">
              TANDA TERIMA
            </h2>
            <p className="text-xs font-bold text-black font-mono mt-0.5">
              NO. {ticket.nomor_layanan}
            </p>
          </div>
        </div>

        {/* 2. Metadata Grid (2 Kolom) */}
        <div className="grid grid-cols-2 gap-4 py-2 text-[11px]">
          {/* Kolom Kiri */}
          <div className="space-y-0.5">
            <div className="flex">
              <span className="w-28 text-black">Nama Customer</span>
              <span className="mr-1">:</span>
              <span className="font-bold text-black flex-1 uppercase">{customerNameUpper}</span>
            </div>
            <div className="flex">
              <span className="w-28 text-black">No.HP/WA</span>
              <span className="mr-1">:</span>
              <span className="text-black flex-1 font-mono">{ticket.no_hp}</span>
            </div>
            <div className="flex">
              <span className="w-28 text-black">Jenis Perangkat</span>
              <span className="mr-1">:</span>
              <span className="text-black flex-1 uppercase">{ticket.jenis_barang}</span>
            </div>
          </div>

          {/* Kolom Kanan */}
          <div className="space-y-0.5">
            <div className="flex">
              <span className="w-28 text-black">Tanggal Masuk</span>
              <span className="mr-1">:</span>
              <span className="text-black flex-1">{formatDateFullIndo(ticket.tanggal_masuk)}</span>
            </div>
            <div className="flex">
              <span className="w-28 text-black">Estimasi Selsai</span>
              <span className="mr-1">:</span>
              <span className="text-black flex-1">{formatDateFullIndo(ticket.estimasi_selesai)}</span>
            </div>
            <div className="flex">
              <span className="w-28 text-black">Jenis Pekerjaan</span>
              <span className="mr-1">:</span>
              <span className="text-black flex-1 uppercase">{ticket.jenis_layanan}</span>
            </div>
          </div>
        </div>

        {/* 3. Tabel Data Perangkat */}
        <div className="border border-black mb-2">
          <table className="w-full text-[10px] sm:text-[11px] border-collapse">
            <thead>
              <tr className="bg-slate-200 font-bold border-b border-black text-black">
                <th className="py-1 px-2 border-r border-black w-[28%] text-center uppercase">NAMA PERANGKAT</th>
                <th className="py-1 px-2 border-r border-black w-[20%] text-center uppercase">SERIAL NUMBER</th>
                <th className="py-1 px-2 border-r border-black w-[26%] text-center uppercase">KELENGKAPAN</th>
                <th className="py-1 px-2 w-[26%] text-center uppercase">KELUHAN</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-black text-black">
                <td className="py-3 px-2 border-r border-black uppercase text-center font-semibold">
                  {ticket.nama_barang}
                </td>
                <td className="py-3 px-2 border-r border-black uppercase text-center font-mono">
                  {ticket.serial_number || '-'}
                </td>
                <td className="py-3 px-2 border-r border-black uppercase text-center">
                  {kelengkapanStr}
                </td>
                <td className="py-3 px-2 uppercase text-center">
                  {ticket.keluhan}
                </td>
              </tr>
            </tbody>
          </table>

          {/* 4. Bagian Tanda Tangan, Biaya & Catatan */}
          <div className="grid grid-cols-12 text-[10px] sm:text-[11px]">
            {/* Kolom Tanda Tangan (Menerima, Menyerahkan, Mengambil) */}
            <div className="col-span-5 border-r border-black p-2 flex flex-col justify-between min-h-[85px]">
              <div className="grid grid-cols-3 text-center text-[10px]">
                <div>Menerima</div>
                <div>Menyerahkan</div>
                <div>Mengambil</div>
              </div>
              <div className="grid grid-cols-3 text-center text-[10px] pt-6">
                <div className="border-b border-black mx-1.5"></div>
                <div className="border-b border-black mx-1.5"></div>
                <div className="border-b border-black mx-1.5"></div>
              </div>
            </div>

            {/* Kolom Biaya */}
            <div className="col-span-4 border-r border-black flex flex-col">
              <div className="bg-slate-200 font-bold text-center py-0.5 border-b border-black text-[10px] sm:text-[11px]">
                BIAYA
              </div>
              <div className="p-1.5 space-y-0.5 text-[10px] sm:text-[11px] flex-1">
                <div className="flex justify-between">
                  <span>Estimasi Biaya</span>
                  <span>: {Number(ticket.estimasi_biaya || 0) > 0 ? `Rp${Number(ticket.estimasi_biaya).toLocaleString('id-ID')}` : ''}</span>
                </div>
                <div className="flex justify-between">
                  <span>DP</span>
                  <span>: {Number(ticket.dp || 0) > 0 ? `Rp${Number(ticket.dp).toLocaleString('id-ID')}` : ''}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sisa</span>
                  <span>: Rp{Number(ticket.sisa || 0).toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            {/* Kolom Catatan */}
            <div className="col-span-3 flex flex-col">
              <div className="bg-slate-200 font-bold text-center py-0.5 border-b border-black text-[10px] sm:text-[11px]">
                CATATAN
              </div>
              <div className="p-1.5 text-[9px] sm:text-[10px] text-slate-700 flex-1">
                {ticket.catatan || ''}
              </div>
            </div>
          </div>
        </div>

        {/* 5. Catatan Syarat & Ketentuan + Teknisi */}
        <div className="grid grid-cols-12 border border-black">
          <div className="col-span-9 p-1.5 text-[9px] sm:text-[10px] space-y-0.5 leading-snug">
            <p className="font-bold uppercase text-[9px] sm:text-[10px]">CATATAN :</p>
            <p>• Pantau status pengerjaan secara online di website/portal tracking menggunakan No. Tanda Terima di atas.</p>
            <p>• Tanda terima wajib dibawa saat pengambilan, jika tidak wajib verifikasi melalui WhatsApp.</p>
            <p>• Kami tidak bertanggung jawab atas kehilangan data yang disebabkan oleh kejadian tak terduga.</p>
            <p>• Barang yang tidak diambil dalam 30 hari setelah pemberitahuan berada di luar tanggung jawab kami.</p>
          </div>
          <div className="col-span-3 border-l border-black flex flex-col text-center">
            <div className="bg-slate-200 font-bold py-0.5 border-b border-black text-[10px] sm:text-[11px]">
              Teknisi
            </div>
            <div className="flex-1 flex items-center justify-center font-bold text-xs sm:text-sm py-2 text-black">
              {ticket.teknisi}
            </div>
          </div>
        </div>
      </div>

      {/* 6. Garis Potong (Dashed Cut Line) */}
      <div className="my-2.5 border-t border-dashed border-black w-full" />

      {/* 7. Slip Kupon Toko Bagian Bawah (Kotak Border Keliling Penuh 4 Sisi) */}
      <div className="border-[1.5px] border-black p-2.5 text-[10px] grid grid-cols-3 gap-2 bg-white">
        <div className="space-y-0.5">
          <div className="flex">
            <span className="w-16">No RMA</span>
            <span className="mr-1">:</span>
            <span className="font-bold font-mono text-black">{ticket.nomor_layanan}</span>
          </div>
          <div className="flex">
            <span className="w-16">Customer</span>
            <span className="mr-1">:</span>
            <span className="font-bold uppercase truncate">{customerNameUpper}</span>
          </div>
          <div className="flex">
            <span className="w-16">No HP/WA</span>
            <span className="mr-1">:</span>
            <span className="font-mono">{ticket.no_hp}</span>
          </div>
        </div>

        <div className="space-y-0.5">
          <div className="flex">
            <span className="w-12">Unit</span>
            <span className="mr-1">:</span>
            <span className="font-bold uppercase truncate">{ticket.nama_barang}</span>
          </div>
          <div className="flex">
            <span className="w-12">S/N</span>
            <span className="mr-1">:</span>
            <span className="font-mono truncate">{ticket.serial_number || '-'}</span>
          </div>
          <div className="flex">
            <span className="w-12">Keluhan</span>
            <span className="mr-1">:</span>
            <span className="truncate uppercase">{ticket.keluhan}</span>
          </div>
        </div>

        <div className="space-y-0.5">
          <div className="flex">
            <span className="w-18">Kelngkapn</span>
            <span className="mr-1">:</span>
            <span className="truncate uppercase">{kelengkapanStr}</span>
          </div>
          <div className="flex">
            <span className="w-18">Tgl Masuk</span>
            <span className="mr-1">:</span>
            <span>{formatDateFullIndo(ticket.tanggal_masuk)}</span>
          </div>
          <div className="flex">
            <span className="w-18">Estms Selsai</span>
            <span className="mr-1">:</span>
            <span>{formatDateFullIndo(ticket.estimasi_selesai)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// FORMAT 2: TANDA TERIMA PROFESIONAL (Modern Layout - Siap diisi template profesional)
function ProfessionalReceipt({ ticket }: { ticket: Ticket }) {
  const kelengkapanList = Array.isArray(ticket.kelengkapan) ? ticket.kelengkapan : [];
  const kelengkapanStr = kelengkapanList.length > 0 ? kelengkapanList.join(', ') : 'Unit Saja';

  return (
    <div className="bg-white text-slate-900 p-6 font-sans text-xs leading-relaxed max-w-[780px] mx-auto border border-slate-300 print:border-none print:p-0 print:m-0 print:max-w-none rounded-xl shadow-xs space-y-4">
      {/* Header Modern */}
      <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="w-12 h-12 object-contain" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black tracking-tight text-slate-900">BEST COMPUTEL</span>
              <span className="px-2 py-0.5 text-[9px] font-extrabold bg-blue-500 text-white rounded-md">
                SERVICE & RMA
              </span>
            </div>
            <p className="text-[11px] text-slate-600">Pusat Layanan Servis, Komputer, Laptop & Klaim Garansi</p>
            <p className="text-[11px] font-semibold text-slate-700">Jl. Terusan pembangunan No.9C, Garut • WA: 0895-2665-5777</p>
          </div>
        </div>

        <div className="text-right">
          <span className="px-3 py-1 bg-slate-900 text-white font-mono font-bold text-xs rounded-lg inline-block mb-1">
            {ticket.nomor_layanan}
          </span>
          <p className="text-[11px] text-slate-500 font-medium">Tanda Terima Masuk ({ticket.jenis_layanan})</p>
        </div>
      </div>

      {/* Grid Informasi */}
      <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Informasi Pelanggan</p>
          <p><span className="font-semibold text-slate-600">Nama:</span> <span className="font-bold text-slate-900">{ticket.nama_customer}</span></p>
          <p><span className="font-semibold text-slate-600">WhatsApp:</span> <span className="font-mono text-slate-900">{ticket.no_hp}</span></p>
          <p><span className="font-semibold text-slate-600">Tanggal Masuk:</span> {formatDateIndo(ticket.tanggal_masuk)}</p>
        </div>

        <div className="space-y-1.5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Detail Perangkat & Pengerjaan</p>
          <p><span className="font-semibold text-slate-600">Perangkat:</span> <span className="font-bold text-slate-900">{ticket.nama_barang}</span> ({ticket.jenis_barang})</p>
          <p><span className="font-semibold text-slate-600">Serial Number:</span> <span className="font-mono">{ticket.serial_number || '-'}</span></p>
          <p><span className="font-semibold text-slate-600">Estimasi Selesai:</span> {formatDateIndo(ticket.estimasi_selesai)}</p>
        </div>
      </div>

      {/* Keluhan & Kelengkapan */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 border border-slate-200 rounded-xl bg-slate-50/50">
          <p className="font-bold text-slate-700 text-[11px] mb-1">Keluhan Kerusakan / Masalah:</p>
          <p className="text-slate-800">{ticket.keluhan}</p>
        </div>
        <div className="p-3 border border-slate-200 rounded-xl bg-slate-50/50">
          <p className="font-bold text-slate-700 text-[11px] mb-1">Kelengkapan Unit yang Diterima:</p>
          <p className="text-slate-800">{kelengkapanStr}</p>
        </div>
      </div>

      {/* Rincian Biaya */}
      <div className="p-3.5 bg-slate-900 text-white rounded-xl flex items-center justify-between">
        <div>
          <p className="text-[10px] text-slate-400 uppercase font-bold">Teknisi Penanggung Jawab</p>
          <p className="text-sm font-bold text-blue-400">{ticket.teknisi}</p>
        </div>
        <div className="flex items-center gap-6 text-right">
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold">Estimasi Biaya</p>
            <p className="font-mono font-semibold">Rp{Number(ticket.estimasi_biaya || 0).toLocaleString('id-ID')}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold">DP</p>
            <p className="font-mono font-semibold">Rp{Number(ticket.dp || 0).toLocaleString('id-ID')}</p>
          </div>
          <div className="pl-4 border-l border-slate-700">
            <p className="text-[10px] text-slate-400 uppercase font-bold">Sisa Pembayaran</p>
            <p className="text-base font-bold font-mono text-emerald-400">Rp{Number(ticket.sisa || 0).toLocaleString('id-ID')}</p>
          </div>
        </div>
      </div>

      {/* Tanda Tangan & S&K */}
      <div className="grid grid-cols-2 gap-4 pt-2">
        <div className="text-[10px] text-slate-500 space-y-1">
          <p className="font-bold text-slate-700">Syarat & Ketentuan Pengambilan:</p>
          <p>1. Tanda terima ini adalah bukti sah kepemilikan dan wajib dibawa saat pengambilan unit.</p>
          <p>2. Lacak progres pengerjaan unit kapan saja di portal tracking online dengan No. Tanda Terima di atas.</p>
          <p>3. Konfirmasi otomatis akan dikirimkan via WhatsApp setelah servis selesai.</p>
        </div>
        <div className="grid grid-cols-2 text-center text-[10px] pt-4">
          <div>
            <p className="text-slate-500 mb-8">Pelanggan</p>
            <p className="font-bold text-slate-800 border-t border-slate-300 pt-1">({ticket.nama_customer})</p>
          </div>
          <div>
            <p className="text-slate-500 mb-8">Best Computel</p>
            <p className="font-bold text-slate-800 border-t border-slate-300 pt-1">({ticket.teknisi})</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CustomerReceiptModal({
  isOpen,
  onClose,
  ticket
}: CustomerReceiptModalProps) {
  const [receiptFormat, setReceiptFormat] = useState<'standard' | 'professional'>('standard');

  if (!ticket) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cetak Tanda Terima Servis"
      subtitle={`No RMA: ${ticket.nomor_layanan}`}
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {/* Format Selector Toolbar */}
        <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <button
              type="button"
              onClick={() => setReceiptFormat('standard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                receiptFormat === 'standard'
                  ? 'bg-blue-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>1. Tanda Terima Standar</span>
            </button>

            <button
              type="button"
              onClick={() => setReceiptFormat('professional')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                receiptFormat === 'professional'
                  ? 'bg-blue-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>2. Tanda Terima Profesional</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium px-2">
            {receiptFormat === 'standard'
              ? 'Format Standar BCT (Kupon Toko + Tanda Tangan)'
              : 'Format Profesional (Siap dikustomisasi)'}
          </div>
        </div>

        {/* Printable Area */}
        <div id="receipt-print-area" className="printable-area">
          {receiptFormat === 'standard' ? (
            <StandardReceipt ticket={ticket} />
          ) : (
            <ProfessionalReceipt ticket={ticket} />
          )}
        </div>

        {/* Modal Action Buttons */}
        <div className="no-print flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 active:scale-95 shadow-md shadow-blue-500/20 rounded-xl transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Tanda Terima ({receiptFormat === 'standard' ? 'Standar' : 'Profesional'})</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
