'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { SuratJalan, MasterVendor, Ticket } from '@/types';
import { COMPANY_INFO } from '@/lib/constants';
import { formatDateIndo } from '@/lib/whatsapp-formatter';
import { Printer, ArrowLeft, Truck } from 'lucide-react';

export default function PrintSuratJalanBdgPage({
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
      .catch((err) => console.error('Failed to load surat jalan BDG print:', err))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return <div className="py-20 text-center text-slate-500 font-medium">Memuat dokumen Surat Jalan BDG...</div>;
  }

  if (!suratJalan) {
    return (
      <div className="py-20 text-center text-slate-500">
        <p className="font-bold text-slate-800 text-lg">Surat Jalan tidak ditemukan</p>
        <Link href="/surat-jalan" className="inline-flex items-center gap-1.5 px-4 py-2 mt-4 bg-slate-900 text-white rounded-xl text-xs font-bold">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar
        </Link>
      </div>
    );
  }

  const tickets: Ticket[] = suratJalan.tickets || [];

  // BDG = 4 stiker per A4 (2x2), field ringkas
  const cells = Array.from({ length: Math.max(1, Math.ceil(tickets.length / 1)) }, (_, i) => i);
  const perPage = 4;
  const pages = Math.max(1, Math.ceil(cells.length / perPage));

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="no-print flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <Link href="/surat-jalan" className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-900">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Manajemen Surat Jalan
        </Link>
        <button type="button" onClick={handlePrint}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all">
          <Printer className="w-4 h-4" /> Cetak Surat Jalan BDG (4 stiker/A4)
        </button>
      </div>

      {Array.from({ length: pages }, (_, p) => (
        <div key={p} className="printable-area">
          <div className="print-grid-4 print-sheet">
            {cells.slice(p * perPage, p * perPage + perPage).map((idx) => {
              const t = tickets[idx];
              return (
                <div key={idx} className="print-cell-sm flex flex-col gap-0.5 border border-slate-400">
                  <div className="flex justify-between">
                    <span className="font-extrabold text-slate-900">{suratJalan.no_surat_jalan}</span>
                    <span className="font-bold">{vendor?.nama_vendor || suratJalan.distributor_vendor}</span>
                  </div>
                  {t ? (
                    <>
                      <p><span className="font-bold">RMA:</span> {t.nomor_layanan}</p>
                      <p><span className="font-bold">Barang:</span> {t.nama_barang}</p>
                      <p className="font-mono"><span className="font-bold">S/N:</span> {t.serial_number}</p>
                      <p><span className="font-bold">Keluhan:</span> {t.keluhan}</p>
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
