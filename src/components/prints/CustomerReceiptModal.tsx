'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Ticket, BrandingConfig, CustomFieldConfig } from '@/types';
import { formatDateIndo } from '@/lib/whatsapp-formatter';
import { Printer, FileText, Sparkles } from 'lucide-react';
import { useAppConfig } from '@/components/config/AppConfigProvider';

interface CustomerReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket | null;
}

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

interface ReceiptRenderProps {
  ticket: Ticket;
  branding: BrandingConfig;
  snLabel: string;
  customFields: CustomFieldConfig[];
}

// FORMAT 1: TANDA TERIMA STANDAR
function StandardReceipt({ ticket, branding, snLabel, customFields }: ReceiptRenderProps) {
  const kelengkapanList = Array.isArray(ticket.kelengkapan) ? ticket.kelengkapan : [];
  const kelengkapanStr = kelengkapanList.length > 0 ? kelengkapanList.join(', ') : 'UNIT SAJA';
  const customerNameUpper =
    ticket.nama_customer.toUpperCase().startsWith('TN') || ticket.nama_customer.toUpperCase().startsWith('NY')
      ? ticket.nama_customer.toUpperCase()
      : `TN/NY. ${ticket.nama_customer.toUpperCase()}`;

  const filledCustomFields = customFields.filter((f) => {
    const val = ticket.custom_data?.[f.field_key];
    return val !== undefined && val !== null && String(val).trim() !== '';
  });

  return (
    <div
      className="bg-white text-black font-sans text-xs leading-tight w-full max-w-[780px] mx-auto print:max-w-none print:w-full print:p-0 print:m-0"
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      <div className="border-[1.5px] border-black p-3 sm:p-4 mb-2.5 bg-white">
        {/* 1. Dynamic Header (Logo, Nama Toko, Alamat, WA) */}
        <div className="flex items-start justify-between pb-2 border-b border-black">
          <div className="flex items-center gap-3">
            <img
              src={branding.logoUrl || '/logo.png'}
              alt="Logo"
              className="w-12 h-12 object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/logo.png';
              }}
            />
            <div>
              <h1 className="text-xs sm:text-sm font-bold tracking-tight text-black uppercase leading-tight">
                {branding.appName} {branding.appSubtitle}
              </h1>
              <p className="text-[10px] sm:text-[11px] text-black leading-tight">
                {branding.companyAddress}
              </p>
              <p className="text-[10px] sm:text-[11px] text-black leading-tight">
                WA. {branding.companyPhone}
              </p>
            </div>
          </div>

          <div className="text-right">
            <h2 className="text-base sm:text-xl font-bold text-black tracking-tight uppercase">
              TANDA TERIMA
            </h2>
            <p className="text-xs font-bold text-black font-mono mt-0.5">
              NO. {ticket.nomor_layanan}
            </p>
          </div>
        </div>

        {/* 2. Metadata Grid */}
        <div className="grid grid-cols-2 gap-4 py-2 text-[11px]">
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

          <div className="space-y-0.5 pl-8 sm:pl-12">
            <div className="flex">
              <span className="w-28 text-black">Tanggal Masuk</span>
              <span className="mr-1">:</span>
              <span className="text-black flex-1">{formatDateFullIndo(ticket.tanggal_masuk)}</span>
            </div>
            <div className="flex">
              <span className="w-28 text-black">Estimasi Selesai</span>
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

        {/* Optional Custom Fields Row */}
        {filledCustomFields.length > 0 && (
          <div className="border border-black px-2 py-1 mb-2 bg-slate-50 flex flex-wrap gap-x-4 gap-y-0.5 text-[10px]">
            {filledCustomFields.map((cf) => (
              <div key={cf.field_key}>
                <span className="font-bold uppercase">{cf.label}:</span>{' '}
                <span>{String(ticket.custom_data?.[cf.field_key])}</span>
              </div>
            ))}
          </div>
        )}

        {/* 3. Tabel Data Perangkat */}
        <div className="border border-black mb-2 overflow-hidden">
          <table className="w-full text-[10px] sm:text-[11px] border-collapse">
            <thead>
              <tr className="bg-slate-200 font-bold text-black">
                <th className="py-1 px-2 border-r border-b border-black w-[28%] text-center uppercase">NAMA PERANGKAT</th>
                <th className="py-1 px-2 border-r border-b border-black w-[20%] text-center uppercase">{snLabel}</th>
                <th className="py-1 px-2 border-r border-b border-black w-[26%] text-center uppercase">KELENGKAPAN</th>
                <th className="py-1 px-2 border-b border-black w-[26%] text-center uppercase">KELUHAN</th>
              </tr>
            </thead>
            <tbody>
              <tr className="text-black">
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

          {/* 4. Tanda Tangan, Biaya & Catatan */}
          <div className="grid grid-cols-12 text-[10px] sm:text-[11px] border-t border-black">
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

            <div className="col-span-4 border-r border-black flex flex-col">
              <div className="bg-slate-200 font-bold text-center py-0.5 border-b border-black text-[10px] sm:text-[11px]">
                BIAYA
              </div>
              <div className="p-1.5 space-y-0.5 text-[10px] sm:text-[11px] flex-1">
                <div className="flex items-center">
                  <span className="w-20 sm:w-22 shrink-0 text-black">Estimasi Biaya</span>
                  <span className="mr-1">:</span>
                  <span className="text-black">
                    {Number(ticket.estimasi_biaya || 0) > 0 ? `Rp${Number(ticket.estimasi_biaya).toLocaleString('id-ID')}` : '-'}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="w-20 sm:w-22 shrink-0 text-black">DP</span>
                  <span className="mr-1">:</span>
                  <span className="text-black">
                    {Number(ticket.dp || 0) > 0 ? `Rp${Number(ticket.dp).toLocaleString('id-ID')}` : '-'}
                  </span>
                </div>
                <div className="flex items-center font-semibold">
                  <span className="w-20 sm:w-22 shrink-0 text-black">Sisa</span>
                  <span className="mr-1">:</span>
                  <span className="text-black">
                    Rp{Number(ticket.sisa || 0).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>

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
        <div className="grid grid-cols-12 border border-black overflow-hidden">
          <div className="col-span-9 p-1.5 text-[9px] sm:text-[10px] space-y-0.5 leading-snug">
            <p className="font-bold uppercase text-[9px] sm:text-[10px]">CATATAN :</p>
            {(branding.receiptFooterNotes || []).map((note, idx) => (
              <p key={idx}>• {note}</p>
            ))}
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

      {/* 6. Garis Potong */}
      <div className="my-2.5 border-t border-dashed border-black w-full" />

      {/* 7. Slip Kupon Toko */}
      <div className="border border-black p-2.5 text-[10px] grid grid-cols-3 gap-2 bg-white">
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

// FORMAT 2: TANDA TERIMA PROFESIONAL
function ProfessionalReceipt({ ticket, branding, snLabel, customFields }: ReceiptRenderProps) {
  const kelengkapanList = Array.isArray(ticket.kelengkapan) ? ticket.kelengkapan : [];
  const kelengkapanStr = kelengkapanList.length > 0 ? kelengkapanList.join(', ') : 'Unit Saja';
  const filledCustomFields = customFields.filter((f) => {
    const val = ticket.custom_data?.[f.field_key];
    return val !== undefined && val !== null && String(val).trim() !== '';
  });

  return (
    <div className="bg-white text-slate-900 p-6 font-sans text-xs leading-relaxed max-w-[780px] mx-auto border border-slate-300 print:border-none print:p-0 print:m-0 print:max-w-none rounded-xl shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
        <div className="flex items-center gap-3">
          <img
            src={branding.logoUrl || '/logo.png'}
            alt="Logo"
            className="w-12 h-12 object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/logo.png';
            }}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black tracking-tight text-slate-900 uppercase">
                {branding.appName}
              </span>
              <span
                className="px-2 py-0.5 text-[9px] font-extrabold text-white rounded-md uppercase"
                style={{ backgroundColor: branding.primaryColor || '#2563eb' }}
              >
                {branding.appSubtitle}
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-700">
              {branding.companyAddress} • WA: {branding.companyPhone}
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="px-3 py-1 bg-slate-900 text-white font-mono font-bold text-xs rounded-lg inline-block mb-1">
            {ticket.nomor_layanan}
          </span>
          <p className="text-[11px] text-slate-500 font-medium">Tanda Terima Masuk ({ticket.jenis_layanan})</p>
        </div>
      </div>

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
          <p><span className="font-semibold text-slate-600">{snLabel}:</span> <span className="font-mono">{ticket.serial_number || '-'}</span></p>
          <p><span className="font-semibold text-slate-600">Estimasi Selesai:</span> {formatDateIndo(ticket.estimasi_selesai)}</p>
        </div>
      </div>

      {filledCustomFields.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px]">
          {filledCustomFields.map((cf) => (
            <div key={cf.field_key}>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">{cf.label}</span>
              <span className="font-semibold text-slate-900">{String(ticket.custom_data?.[cf.field_key])}</span>
            </div>
          ))}
        </div>
      )}

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

      <div className="grid grid-cols-2 gap-4 pt-2">
        <div className="text-[10px] text-slate-500 space-y-1">
          <p className="font-bold text-slate-700">Syarat & Ketentuan Pengambilan:</p>
          {(branding.receiptFooterNotes || []).map((note, idx) => (
            <p key={idx}>{idx + 1}. {note}</p>
          ))}
        </div>
        <div className="grid grid-cols-2 text-center text-[10px] pt-4">
          <div>
            <p className="text-slate-500 mb-8">Pelanggan</p>
            <p className="font-bold text-slate-800 border-t border-slate-300 pt-1">({ticket.nama_customer})</p>
          </div>
          <div>
            <p className="text-slate-500 mb-8">{branding.appName}</p>
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
  const { config, getFieldLabel } = useAppConfig();

  if (!ticket) return null;

  const snLabel = getFieldLabel('serial_number', 'SERIAL NUMBER');
  const customFields = config.fields.filter((f) => !f.is_builtin);

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
                  ? 'bg-brand text-white shadow-xs'
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
                  ? 'bg-brand text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>2. Tanda Terima Profesional</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium px-2">
            {receiptFormat === 'standard'
              ? `Format Standar ${config.branding.appName} (Kupon + Tanda Tangan)`
              : 'Format Profesional Modern'}
          </div>
        </div>

        {/* Printable Area */}
        <div id="receipt-print-area" className="printable-area">
          {receiptFormat === 'standard' ? (
            <StandardReceipt
              ticket={ticket}
              branding={config.branding}
              snLabel={snLabel}
              customFields={customFields}
            />
          ) : (
            <ProfessionalReceipt
              ticket={ticket}
              branding={config.branding}
              snLabel={snLabel}
              customFields={customFields}
            />
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
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-brand hover:bg-brand-hover active:scale-95 shadow-md rounded-xl transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Tanda Terima ({receiptFormat === 'standard' ? 'Standar' : 'Profesional'})</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
