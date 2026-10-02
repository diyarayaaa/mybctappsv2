'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { SuratJalan, MasterVendor, Ticket } from '@/types';
import { COMPANY_INFO } from '@/lib/constants';
import { formatDateIndo } from '@/lib/whatsapp-formatter';
import { Printer, ArrowLeft, Truck, CheckCircle2, FileText } from 'lucide-react';

export default function PrintSuratJalanPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [suratJalan, setSuratJalan] = useState<SuratJalan | null>(null);
  const [vendor, setVendor] = useState<MasterVendor | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/surat-jalan/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setSuratJalan(data.suratJalan);
          setVendor(data.vendor);
        }
      })
      .catch((err) => console.error('Failed to load surat jalan print:', err))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-slate-500 font-medium">
        Memuat dokumen Surat Jalan...
      </div>
    );
  }

  if (!suratJalan) {
    return (
      <div className="py-20 text-center text-slate-500">
        <p className="font-bold text-slate-800 text-lg">Surat Jalan tidak ditemukan</p>
        <Link
          href="/surat-jalan"
          className="inline-flex items-center gap-1.5 px-4 py-2 mt-4 bg-slate-900 text-white rounded-xl text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Daftar
        </Link>
      </div>
    );
  }

  const tickets: Ticket[] = suratJalan.tickets || [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Action Bar (hidden on print) */}
      <div className="no-print flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <Link
          href="/surat-jalan"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Manajemen Surat Jalan
        </Link>

        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>Cetak Surat Jalan (Ctrl+P)</span>
        </button>
      </div>

      {/* Printable Paper Document (A4 dibagi 2) */}
      <div className="print-grid-2 print-sheet">
        {[0, 1].map((copy) => (
          <div
            key={copy}
            id={copy === 0 ? 'surat-jalan-document' : undefined}
            className="print-cell bg-white p-6 sm:p-8 rounded-none border-slate-300 text-slate-900 text-sm font-sans space-y-4"
          >
        {/* Kop Surat Header */}
        <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              {COMPANY_INFO.name}
            </h1>
            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">
              {COMPANY_INFO.subName}
            </p>
            <p className="text-xs text-slate-600 mt-1">{COMPANY_INFO.address}</p>
            <p className="text-xs text-slate-600 font-mono">Telp / WhatsApp: {COMPANY_INFO.phone}</p>
          </div>

          <div className="text-right">
            <div className="inline-block bg-slate-900 text-white px-4 py-2 rounded-lg text-center">
              <span className="text-[10px] uppercase font-bold tracking-widest block text-blue-400">
                SURAT JALAN VENDOR
              </span>
              <span className="text-lg font-mono font-extrabold tracking-wider">
                {suratJalan.no_surat_jalan}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 font-medium">
              Tanggal Kirim: <span className="font-bold text-slate-900">{formatDateIndo(suratJalan.tgl_kirim)}</span>
            </p>
          </div>
        </div>

        {/* Info Tujuan & Ekspedisi */}
        <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
              KEPADA YTH (DISTRIBUTOR / VENDOR):
            </span>
            <p className="text-sm font-black text-slate-900">{suratJalan.distributor_vendor}</p>
            <p className="text-slate-600 mt-0.5 whitespace-pre-line font-medium">
              {vendor?.alamat_lengkap || 'Alamat Distributor'}
            </p>
            <p className="text-slate-800 font-mono font-bold mt-1">
              Kontak / WA: {vendor?.kontak_wa || '-'}
            </p>
          </div>

          <div className="space-y-1.5 border-l border-slate-200 pl-4">
            <span className="font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
              PENGIRIMAN & EKSPEDISI:
            </span>
            <p>
              <span className="text-slate-600">Ekspedisi:</span>{' '}
              <span className="font-bold text-slate-900">{suratJalan.ekspedisi || 'Ekspedisi Toko'}</span>
            </p>
            <p>
              <span className="text-slate-600">No. Resi:</span>{' '}
              <span className="font-mono font-bold text-slate-900">{suratJalan.no_resi || '-'}</span>
            </p>
            <p>
              <span className="text-slate-600">Dibuat Oleh:</span>{' '}
              <span className="font-semibold text-slate-900">{suratJalan.created_by}</span>
            </p>
          </div>
        </div>

        {/* Tabel Rincian Seluruh Barang */}
        <div>
          <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs mb-2">
            Rincian Barang yang Dikirim ({tickets.length} Unit):
          </h3>
          <table className="w-full text-left text-xs border border-slate-300">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
              <tr>
                <th className="p-2 border-r border-slate-300 w-8 text-center">No</th>
                <th className="p-2 border-r border-slate-300 w-28">No RMA</th>
                <th className="p-2 border-r border-slate-300">Nama / Tipe Barang</th>
                <th className="p-2 border-r border-slate-300 w-36 font-mono">Serial Number</th>
                <th className="p-2 border-r border-slate-300">Keluhan Kerusakan</th>
                <th className="p-2">Kelengkapan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 text-slate-800">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-slate-400 italic">
                    Belum ada unit yang ditautkan ke surat jalan ini.
                  </td>
                </tr>
              ) : (
                tickets.map((t, idx) => {
                  const kelengkapanStr = Array.isArray(t.kelengkapan) && t.kelengkapan.length > 0
                    ? t.kelengkapan.join(', ')
                    : 'Unit Saja';

                  return (
                    <tr key={t.id}>
                      <td className="p-2 border-r border-slate-300 text-center font-bold">{idx + 1}</td>
                      <td className="p-2 border-r border-slate-300 font-mono font-bold">{t.nomor_layanan}</td>
                      <td className="p-2 border-r border-slate-300 font-semibold">{t.nama_barang}</td>
                      <td className="p-2 border-r border-slate-300 font-mono">{t.serial_number}</td>
                      <td className="p-2 border-r border-slate-300">{t.keluhan}</td>
                      <td className="p-2 text-[11px]">{kelengkapanStr}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Catatan */}
        {suratJalan.catatan && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
            <span className="font-bold text-slate-800 block mb-0.5">Catatan:</span>
            <p className="text-slate-600 italic">{suratJalan.catatan}</p>
          </div>
        )}

        {/* Tanda Tangan 3 Kolom (Pengirim, Ekspedisi, Penerima) */}
        <div className="pt-8 grid grid-cols-3 text-center text-xs">
          <div>
            <p className="text-slate-600 mb-16">Pengirim (Best Computel),</p>
            <p className="font-bold text-slate-900 uppercase">({suratJalan.created_by})</p>
            <p className="text-[10px] text-slate-400">Tgl: _______________</p>
          </div>

          <div>
            <p className="text-slate-600 mb-16">Ekspedisi / Pembawa,</p>
            <p className="font-bold text-slate-900 uppercase">( ___________________ )</p>
            <p className="text-[10px] text-slate-400">Tgl: _______________</p>
          </div>

          <div>
            <p className="text-slate-600 mb-16">Penerima (Vendor / Distributor),</p>
            <p className="font-bold text-slate-900 uppercase">( ___________________ )</p>
            <p className="text-[10px] text-slate-400">Tgl: _______________</p>
          </div>
        </div>
          </div>
        ))}
      </div>
    </div>
  );
}
