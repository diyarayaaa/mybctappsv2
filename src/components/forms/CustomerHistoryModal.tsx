'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { formatDateIndo, formatPhoneNumber } from '@/lib/whatsapp-formatter';
import {
  Wrench,
  ShieldCheck,
  Calendar,
  User,
  MessageCircle,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  ChevronRight,
  Sparkles
} from 'lucide-react';

export interface CustomerTicketHistory {
  id: string;
  nomor_layanan: string;
  tanggal_masuk: string;
  jenis_layanan: string;
  jenis_barang: string;
  nama_barang: string;
  keluhan: string;
  status: string;
  estimasi_biaya: number;
  biaya_akhir: number;
  teknisi: string;
  catatan?: string;
}

interface CustomerHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  noHp?: string;
  tickets: CustomerTicketHistory[];
  isLoading?: boolean;
  onSelectDevice?: (jenisBarang: string, namaBarang: string) => void;
}

export function CustomerHistoryModal({
  isOpen,
  onClose,
  customerName,
  noHp,
  tickets,
  isLoading = false,
  onSelectDevice,
}: CustomerHistoryModalProps) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const cleanPhone = (noHp || '').trim();
  const waUrl =
    cleanPhone && cleanPhone !== '-'
      ? `https://wa.me/${formatPhoneNumber(cleanPhone)}?text=${encodeURIComponent(
          `Halo ${customerName}, kami dari Best Computel...`
        )}`
      : '';

  const formatRupiah = (val?: number | null) => {
    if (val === undefined || val === null || val === 0) return 'Rp 0';
    return 'Rp ' + Number(val).toLocaleString('id-ID');
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s.includes('SELESAI') || s.includes('SUDAH DIAMBIL')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
          <CheckCircle2 className="w-3 h-3" />
          {status}
        </span>
      );
    }
    if (s.includes('GAGAL') || s.includes('BATAL') || s.includes('CANCEL')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
          <XCircle className="w-3 h-3" />
          {status}
        </span>
      );
    }
    if (s.includes('GARANSI')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-300 dark:border-purple-700">
          <ShieldCheck className="w-3 h-3" />
          {status}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
        <Clock className="w-3 h-3" />
        {status || 'PROSES'}
      </span>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Riwayat Servis: ${customerName || 'Pelanggan'}`}
      subtitle={`No. Handphone: ${noHp || '-'} • Total ${tickets.length} Tiket Servis`}
      maxWidth="3xl"
    >
      <div className="space-y-5">
        {/* Customer Header Info & Actions */}
        <div className="p-4 rounded-2xl bg-linear-to-r from-blue-50/80 via-indigo-50/50 to-slate-50 dark:from-slate-800/80 dark:via-blue-950/40 dark:to-slate-800/60 border border-blue-100 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-blue-500/25">
              {customerName ? customerName.replace(/^tn\/ny\.?\s*/i, '').charAt(0).toUpperCase() || 'P' : 'P'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {customerName}
                </h4>
                <span className="text-[10px] font-black px-2 py-0.5 bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 rounded-md border border-blue-200 dark:border-blue-800">
                  {tickets.length}x Servis
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                {noHp || 'Tidak ada no handphone'}
              </p>
            </div>
          </div>

          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 shadow-sm rounded-xl transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Chat WhatsApp</span>
            </a>
          )}
        </div>

        {/* Tickets Timeline / List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Daftar Riwayat Perangkat & Servis Sebelumnya
            </h5>
            <span className="text-xs text-slate-400 font-medium">
              Urut dari yang terbaru
            </span>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-sm animate-pulse">
              Memuat riwayat tiket...
            </div>
          ) : tickets.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              Belum ada riwayat tiket sebelumnya untuk pelanggan ini.
            </div>
          ) : (
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-800 transition-all shadow-xs group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                        {t.nomor_layanan}
                      </span>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded ${
                          t.jenis_layanan === 'GARANSI'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {t.jenis_layanan}
                      </span>
                      {getStatusBadge(t.status)}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDateIndo(t.tanggal_masuk)}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300">
                        <User className="w-3.5 h-3.5" />
                        {t.teknisi || 'Teknisi'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                    <div className="sm:col-span-8 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          {t.jenis_barang || 'Barang'}:
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          {t.nama_barang || '-'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300">
                        <span className="font-semibold text-slate-700 dark:text-slate-400">
                          Keluhan:{' '}
                        </span>
                        <span>{t.keluhan || '-'}</span>
                      </div>
                      {t.catatan && (
                        <div className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-2 rounded-lg font-mono">
                          <span className="font-bold">Catatan:</span> {t.catatan}
                        </div>
                      )}
                    </div>

                    <div className="sm:col-span-4 flex flex-col sm:items-end justify-between gap-2.5 h-full pt-1 sm:pt-0">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                          Biaya Akhir
                        </span>
                        <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white font-mono">
                          {formatRupiah(t.biaya_akhir || t.estimasi_biaya)}
                        </span>
                      </div>

                      {onSelectDevice && t.nama_barang && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectDevice(t.jenis_barang || 'Laptop', t.nama_barang);
                            onClose();
                          }}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-lg active:scale-95 transition-all"
                          title="Gunakan nama & jenis barang ini untuk form servis saat ini"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>Gunakan Perangkat Ini</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
