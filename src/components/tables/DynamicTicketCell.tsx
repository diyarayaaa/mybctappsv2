'use client';

import React from 'react';
import { CustomFieldConfig, Ticket } from '@/types';
import { StatusBadge, ServiceTypeBadge } from '@/components/ui/Badge';
import { formatDateIndo } from '@/lib/whatsapp-formatter';

function formatRupiah(val?: number | null): string {
  if (val === undefined || val === null || val === 0) return '-';
  return 'Rp ' + Number(val).toLocaleString('id-ID');
}

function formatKelengkapan(val?: string[] | string | null): string {
  if (!val) return '-';
  if (Array.isArray(val)) {
    return val.length > 0 ? val.join(', ') : '-';
  }
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) return parsed.length > 0 ? parsed.join(', ') : '-';
  } catch {}
  return String(val);
}

export function getFieldHeaderAlignClass(field: CustomFieldConfig): string {
  if (['estimasi_biaya', 'dp', 'sisa', 'biaya_akhir'].includes(field.field_key)) {
    return 'text-right';
  }
  if (['teknisi', 'status'].includes(field.field_key)) {
    return 'text-center';
  }
  return '';
}

export function DynamicTicketCell({
  field,
  ticket
}: {
  field: CustomFieldConfig;
  ticket: Ticket;
}) {
  const isStock =
    ticket.nama_customer.toUpperCase().includes('STOCK BCT') ||
    ticket.nama_customer.toUpperCase().includes('GHITP');

  if (!field.is_builtin) {
    const rawVal = ticket.custom_data?.[field.field_key];
    const displayVal =
      rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== ''
        ? field.field_type === 'date'
          ? formatDateIndo(String(rawVal))
          : String(rawVal)
        : '-';
    return (
      <td
        className="px-3 py-3 text-xs text-slate-700 dark:text-slate-300 max-w-[180px] truncate"
        title={displayVal}
      >
        {displayVal}
      </td>
    );
  }

  switch (field.field_key) {
    case 'tanggal_masuk':
      return (
        <td className="px-3 py-3 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap font-mono">
          {formatDateIndo(ticket.tanggal_masuk)}
        </td>
      );
    case 'jenis_layanan':
      return (
        <td className="px-3 py-3 whitespace-nowrap">
          <ServiceTypeBadge type={ticket.jenis_layanan} />
        </td>
      );
    case 'nama_customer':
      return (
        <td className="px-3 py-3 whitespace-nowrap font-medium text-slate-900 dark:text-white">
          <div className="flex items-center gap-1.5">
            <span className="max-w-[140px] truncate" title={ticket.nama_customer}>
              {ticket.nama_customer}
            </span>
            {isStock && (
              <span className="text-[9px] px-1 py-0.2 rounded bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-extrabold shrink-0">
                STOK
              </span>
            )}
          </div>
        </td>
      );
    case 'no_hp':
      return (
        <td className="px-3 py-3 text-xs font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
          {ticket.no_hp && ticket.no_hp !== '-' ? (
            <a
              href={`https://wa.me/${ticket.no_hp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline flex items-center gap-1"
              title="Chat WhatsApp"
            >
              <span>{ticket.no_hp}</span>
            </a>
          ) : (
            '-'
          )}
        </td>
      );
    case 'jenis_barang':
      return (
        <td className="px-3 py-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap font-medium">
          {ticket.jenis_barang || '-'}
        </td>
      );
    case 'nama_barang':
      return (
        <td
          className="px-3 py-3 text-xs font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap max-w-[180px] truncate"
          title={ticket.nama_barang}
        >
          {ticket.nama_barang}
        </td>
      );
    case 'serial_number':
      return (
        <td className="px-3 py-3 text-xs font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
          {ticket.serial_number || '-'}
        </td>
      );
    case 'keluhan':
      return (
        <td
          className="px-3 py-3 text-xs text-slate-600 dark:text-slate-300 max-w-[200px] truncate"
          title={ticket.keluhan}
        >
          {ticket.keluhan}
        </td>
      );
    case 'kelengkapan':
      return (
        <td
          className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400 max-w-[160px] truncate"
          title={formatKelengkapan(ticket.kelengkapan)}
        >
          {formatKelengkapan(ticket.kelengkapan)}
        </td>
      );
    case 'estimasi_selesai':
      return (
        <td className="px-3 py-3 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap font-mono">
          {formatDateIndo(ticket.estimasi_selesai)}
        </td>
      );
    case 'estimasi_biaya':
      return (
        <td className="px-3 py-3 text-xs font-mono text-right text-slate-700 dark:text-slate-300 whitespace-nowrap">
          {formatRupiah(ticket.estimasi_biaya)}
        </td>
      );
    case 'dp':
      return (
        <td className="px-3 py-3 text-xs font-mono text-right text-slate-700 dark:text-slate-300 whitespace-nowrap">
          {formatRupiah(ticket.dp)}
        </td>
      );
    case 'sisa':
      return (
        <td className="px-3 py-3 text-xs font-mono text-right font-bold text-brand whitespace-nowrap">
          {formatRupiah(ticket.sisa)}
        </td>
      );
    case 'teknisi':
      return (
        <td className="px-3 py-3 text-center whitespace-nowrap">
          <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
            {ticket.teknisi}
          </span>
        </td>
      );
    case 'status':
      return (
        <td className="px-3 py-3 whitespace-nowrap text-center">
          <StatusBadge status={ticket.status} size="sm" />
        </td>
      );
    case 'distributor_vendor':
      return (
        <td
          className="px-3 py-3 text-xs text-purple-700 dark:text-purple-300 whitespace-nowrap font-medium max-w-[150px] truncate"
          title={ticket.distributor_vendor || ''}
        >
          {ticket.distributor_vendor || '-'}
        </td>
      );
    case 'tgl_kirim_vendor':
      return (
        <td className="px-3 py-3 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap font-mono">
          {formatDateIndo(ticket.tgl_kirim_vendor)}
        </td>
      );
    case 'tgl_datang_vendor':
      return (
        <td className="px-3 py-3 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap font-mono">
          {formatDateIndo(ticket.tgl_datang_vendor)}
        </td>
      );
    case 'tgl_diambil_customer':
      return (
        <td className="px-3 py-3 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap font-mono">
          {formatDateIndo(ticket.tgl_diambil_customer)}
        </td>
      );
    case 'hasil_service_garansi':
      return (
        <td className="px-3 py-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap font-medium">
          {ticket.hasil_service_garansi || '-'}
        </td>
      );
    case 'sn_baru':
      return (
        <td className="px-3 py-3 text-xs font-mono text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
          {ticket.sn_baru || '-'}
        </td>
      );
    case 'catatan':
      return (
        <td
          className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400 max-w-[180px] truncate"
          title={ticket.catatan || ''}
        >
          {ticket.catatan || '-'}
        </td>
      );
    case 'biaya_akhir':
      return (
        <td className="px-3 py-3 text-xs font-mono text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
          {formatRupiah(ticket.biaya_akhir)}
        </td>
      );
    case 'no_surat_jalan':
      return (
        <td className="px-3 py-3 text-xs font-mono text-brand whitespace-nowrap">
          {ticket.no_surat_jalan || '-'}
        </td>
      );
    default:
      return (
        <td className="px-3 py-3 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
          {String((ticket as unknown as Record<string, unknown>)[field.field_key] ?? '-')}
        </td>
      );
  }
}

