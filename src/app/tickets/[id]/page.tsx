'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Wrench,
  Clock,
  CheckCircle,
  Truck,
  MessageSquare,
  Printer,
  History,
  Edit3,
  Trash2,
  DollarSign,
  User,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { StatusBadge, ServiceTypeBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { CustomerReceiptModal } from '@/components/prints/CustomerReceiptModal';
import { ShippingLabelModal } from '@/components/prints/ShippingLabelModal';
import { DynamicTicketForm } from '@/components/forms/DynamicTicketForm';
import { Ticket, AuditLog, StatusTiket } from '@/types';
import { STATUS_LIST, STATUS_LIST_GARANSI, STATUS_LIST_SERVICE, TEKNISI_LIST } from '@/lib/constants';
import {
  formatDateIndo,
  formatDateTimeIndo,
  createWhatsAppUrl,
  formatCustomerReceiptMessage,
  formatCustomerDoneMessage
} from '@/lib/whatsapp-formatter';

export default function TicketDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Modals
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);

  // Status Change Form State
  const [newStatus, setNewStatus] = useState<StatusTiket>('PROSES SERVICE');
  const [statusActor, setStatusActor] = useState('Wandi');
  const [newHasilGaransi, setNewHasilGaransi] = useState<'Diservice' | 'Diganti baru' | ''>('');
  const [newSnBaru, setNewSnBaru] = useState('');
  const [newBiayaAkhir, setNewBiayaAkhir] = useState<number>(0);
  const [newTglDiambil, setNewTglDiambil] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchTicket = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/tickets/${id}`);
      const data = await res.json();
      if (!data.error && data.ticket) {
        setTicket(data.ticket);
        setLogs(data.logs || []);
        setNewStatus(data.ticket.status);
        setStatusActor(localStorage.getItem('bct_current_user') || data.ticket.teknisi || 'Wandi');
        setNewHasilGaransi(data.ticket.hasil_service_garansi || '');
        setNewSnBaru(data.ticket.sn_baru || '');
        setNewBiayaAkhir(data.ticket.biaya_akhir || data.ticket.estimasi_biaya || 0);
        const todayDate = new Date().toLocaleDateString('en-CA');
        setNewTglDiambil(data.ticket.tgl_diambil_customer ? data.ticket.tgl_diambil_customer.slice(0, 10) : todayDate);
      }
    } catch (err) {
      console.error('Failed to load ticket:', err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket) return;

    setIsUpdatingStatus(true);
    try {
      const payload: Record<string, unknown> = {
        status: newStatus,
        actor: statusActor,
        hasil_service_garansi: newHasilGaransi || null,
        sn_baru: newHasilGaransi === 'Diganti baru' ? newSnBaru : null
      };

      if (newStatus === 'SELESAI & DIAMBIL' || newStatus === 'GAGAL SERVICE/GARANSI') {
        payload.biaya_akhir = Number(newBiayaAkhir) || Number(ticket.estimasi_biaya);
        if (newStatus === 'SELESAI & DIAMBIL') {
          payload.tgl_diambil_customer = newTglDiambil
            ? (newTglDiambil.includes(' ') ? newTglDiambil : `${newTglDiambil} 00:00:00`)
            : new Date().toISOString().replace('T', ' ').slice(0, 19);
        }
      }

      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsStatusModalOpen(false);
        fetchTicket();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeleteTicket = async () => {
    if (!ticket) return;
    const confirmDelete = window.confirm(
      `Apakah Anda yakin ingin menghapus tiket [${ticket.nomor_layanan}] - ${ticket.nama_barang}?`
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/tickets');
      }
    } catch (err) {
      console.error('Failed to delete ticket:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-slate-500 dark:text-slate-400 font-medium">
        <Clock className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
        Memuat detail tiket servis...
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="py-20 text-center text-slate-500 dark:text-slate-400">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Tiket Tidak Ditemukan</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Tiket dengan ID ini tidak ada atau telah dihapus.</p>
        <Link
          href="/tickets"
          className="inline-flex items-center gap-1.5 px-4 py-2 mt-4 bg-slate-900 dark:bg-blue-500 text-white rounded-xl text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Antrean
        </Link>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsEditing(false)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            Batal Edit & Lihat Detail
          </button>
        </div>
        <DynamicTicketForm initialData={ticket} isEditMode={true} />
      </div>
    );
  }

  const kelengkapanList = Array.isArray(ticket.kelengkapan) ? ticket.kelengkapan : [];
  const receiptWaUrl = createWhatsAppUrl(ticket.no_hp, formatCustomerReceiptMessage(ticket));
  const doneWaUrl = createWhatsAppUrl(ticket.no_hp, formatCustomerDoneMessage(ticket));

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/tickets"
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
                {ticket.nomor_layanan}
              </h1>
              <ServiceTypeBadge type={ticket.jenis_layanan} />
              <StatusBadge status={ticket.status} size="md" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Diterima pada {formatDateTimeIndo(ticket.tanggal_masuk)} • Teknisi:{' '}
              <span className="font-bold text-slate-800 dark:text-slate-200">{ticket.teknisi}</span>
            </p>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Status Update */}
          <button
            onClick={() => setIsStatusModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 text-xs font-bold text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 border border-transparent dark:border-slate-700 rounded-xl shadow-xs transition-colors"
          >
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>Update Status</span>
          </button>

          {/* Edit Ticket */}
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs transition-colors"
          >
            <Edit3 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span>Edit</span>
          </button>

          {/* Delete Ticket */}
          <button
            onClick={handleDeleteTicket}
            title="Hapus Tiket"
            className="p-2 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 rounded-xl border border-rose-200 dark:border-rose-800 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Information Cards */}
        <div className="lg:col-span-2 space-y-6">
          {/* Perangkat & Keluhan */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-blue-500" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Informasi Perangkat & Kerusakan
                </h3>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                {ticket.jenis_barang}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div>
                <p className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  Nama Perangkat / Tipe
                </p>
                <p className="font-bold text-slate-900 dark:text-white text-base mt-0.5">{ticket.nama_barang}</p>
              </div>

              <div>
                <p className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  Serial Number (SN)
                </p>
                <p className="font-mono font-bold text-slate-900 dark:text-white text-base mt-0.5">
                  {ticket.serial_number}
                </p>
              </div>
            </div>

            <div>
              <p className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[10px] tracking-wider mb-1">
                Keluhan Kerusakan
              </p>
              <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl text-amber-950 dark:text-amber-200 font-medium text-xs sm:text-sm">
                {ticket.keluhan}
              </div>
            </div>

            <div>
              <p className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[10px] tracking-wider mb-1.5">
                Kelengkapan yang Dititipkan
              </p>
              <div className="flex flex-wrap gap-1.5">
                {kelengkapanList.length > 0 ? (
                  kelengkapanList.map((k, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      ✓ {k}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">Hanya Unit Saja</span>
                )}
              </div>
            </div>

            {ticket.catatan && (
              <div>
                <p className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[10px] tracking-wider mb-1">
                  Catatan Khusus / Password
                </p>
                <p className="text-xs bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 italic font-mono">
                  {ticket.catatan}
                </p>
              </div>
            )}
          </div>

          {/* Alur Garansi / Vendor */}
          {(ticket.distributor_vendor || ticket.jenis_layanan === 'GARANSI' || ticket.status === 'ALIH SERVICE') && (
            <div className="bg-purple-50/50 dark:bg-purple-950/20 p-4 sm:p-6 rounded-2xl border-2 border-purple-200 dark:border-purple-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <h3 className="text-xs sm:text-sm font-bold text-purple-950 dark:text-purple-200 uppercase tracking-wider">
                    Logistik Distributor / Vendor
                  </h3>
                </div>
                {ticket.distributor_vendor && (
                  <button
                    onClick={() => setIsLabelModalOpen(true)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/60 hover:bg-purple-200 px-3 py-1 rounded-lg transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Cetak Label Paket
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm">
                <div>
                  <p className="text-purple-700 dark:text-purple-400 font-bold uppercase text-[10px]">Vendor</p>
                  <p className="font-extrabold text-slate-900 dark:text-white mt-0.5">
                    {ticket.distributor_vendor || '(Belum Ditugaskan)'}
                  </p>
                </div>

                <div>
                  <p className="text-purple-700 dark:text-purple-400 font-bold uppercase text-[10px]">No. Surat Jalan</p>
                  <p className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                    {ticket.no_surat_jalan ? (
                      <Link
                        href={`/surat-jalan/print/${ticket.no_surat_jalan}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                      >
                        {ticket.no_surat_jalan}
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    ) : (
                      '-'
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-purple-700 dark:text-purple-400 font-bold uppercase text-[10px]">Hasil Garansi</p>
                  <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                    {ticket.hasil_service_garansi || '-'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-purple-700 dark:text-purple-400 font-medium">Tgl Kirim ke Vendor:</span>{' '}
                  <span className="font-bold text-slate-900 dark:text-white">{formatDateIndo(ticket.tgl_kirim_vendor)}</span>
                </div>
                <div>
                  <span className="text-purple-700 dark:text-purple-400 font-medium">Tgl Datang dari Vendor:</span>{' '}
                  <span className="font-bold text-slate-900 dark:text-white">{formatDateIndo(ticket.tgl_datang_vendor)}</span>
                </div>
              </div>

              {ticket.hasil_service_garansi === 'Diganti baru' && ticket.sn_baru && (
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-purple-300 dark:border-purple-700 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 dark:text-purple-300 block">
                      Serial Number Baru (SN Baru):
                    </span>
                    <span className="font-mono font-black text-sm text-slate-900 dark:text-white">{ticket.sn_baru}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded">
                    Unit Baru Ready
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Audit Trail Log */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <History className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Audit Trail & Histori Aktivitas
              </h3>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {logs.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Belum ada riwayat tercatat.</p>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">{log.actor}</span>
                        <span className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[10px] rounded">
                          {log.action}
                        </span>
                      </div>
                      <span className="text-slate-400 text-[11px]">{formatDateTimeIndo(log.created_at)}</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 font-medium">{log.keterangan}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Column: Customer, Finance & WhatsApp */}
        <div className="space-y-6">
          {/* Customer Info Card */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Informasi Pelanggan
              </h3>
            </div>

            <div className="space-y-2">
              <div>
                <p className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[10px]">Nama Pemilik</p>
                <p className="font-bold text-slate-900 dark:text-white text-base mt-0.5">{ticket.nama_customer}</p>
              </div>

              <div>
                <p className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[10px]">No. WhatsApp</p>
                <p className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5">{ticket.no_hp}</p>
              </div>

              <div>
                <p className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[10px]">Estimasi Selesai</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs mt-0.5">
                  {formatDateIndo(ticket.estimasi_selesai)}
                </p>
              </div>
            </div>
          </div>

          {/* Rincian Keuangan Card */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Rincian Biaya
              </h3>
            </div>

            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Estimasi Biaya:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  Rp {Number(ticket.estimasi_biaya || 0).toLocaleString('id-ID')}
                </span>
              </div>

              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>DP / Uang Muka:</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  Rp {Number(ticket.dp || 0).toLocaleString('id-ID')}
                </span>
              </div>

              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-800 font-extrabold text-sm text-slate-900 dark:text-white">
                <span>Sisa Pembayaran:</span>
                <span className="text-blue-600 dark:text-blue-400">
                  Rp {Number(ticket.sisa || 0).toLocaleString('id-ID')}
                </span>
              </div>

              {ticket.biaya_akhir ? (
                <div className="mt-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs flex justify-between font-bold text-slate-800 dark:text-slate-200">
                  <span>Biaya Akhir / Nota:</span>
                  <span>Rp {Number(ticket.biaya_akhir).toLocaleString('id-ID')}</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* WhatsApp Direct Dispatch Hub */}
          <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-4 sm:p-6 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 shadow-xs space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-emerald-200 dark:border-emerald-800">
              <MessageSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xs sm:text-sm font-bold text-emerald-950 dark:text-emerald-200 uppercase tracking-wider">
                WhatsApp Automation
              </h3>
            </div>

            <p className="text-xs text-emerald-900 dark:text-emerald-300">
              Kirim notifikasi langsung ke <span className="font-mono font-bold">{ticket.no_hp}</span>:
            </p>

            <div className="space-y-2">
              <a
                href={receiptWaUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-emerald-100/70 dark:hover:bg-slate-800 border border-emerald-300 dark:border-emerald-800 text-xs font-bold text-emerald-950 dark:text-emerald-200 shadow-xs transition-all"
              >
                <span>1. Kirim Tanda Terima Masuk</span>
                <ExternalLink className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              </a>

              <a
                href={doneWaUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-between p-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
              >
                <span>2. Kirim Unit Selesai Siap Ambil</span>
                <ExternalLink className="w-4 h-4 text-white shrink-0" />
              </a>
            </div>
          </div>

          {/* Cetak Dokumen Button */}
          <button
            type="button"
            onClick={() => setIsReceiptModalOpen(true)}
            className="w-full inline-flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-blue-500 hover:bg-blue-600 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Tanda Terima Servis (Struk)</span>
          </button>
        </div>
      </div>

      {/* Modal Quick Status Updater */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Update Status Pengerjaan Servis & Garansi"
        subtitle={`Tiket: ${ticket.nomor_layanan} (${ticket.nama_barang})`}
        maxWidth="lg"
      >
        <form onSubmit={handleUpdateStatus} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Pilih Status Baru *
            </label>
            <select
              value={newStatus}
              onChange={(e) => {
                const val = e.target.value as StatusTiket;
                setNewStatus(val);
                if (val === 'SELESAI & DIAMBIL' && !newTglDiambil) {
                  setNewTglDiambil(new Date().toLocaleDateString('en-CA'));
                }
              }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-hidden"
            >
              {ticket.jenis_layanan === 'GARANSI' && (
                <option value="">-- Belum Ada Status (Kosong) --</option>
              )}
              {(ticket.jenis_layanan === 'GARANSI' ? STATUS_LIST_GARANSI : STATUS_LIST_SERVICE).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Teknisi / Aktor Pelaksana *
            </label>
            <select
              value={statusActor}
              onChange={(e) => setStatusActor(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-hidden"
            >
              {TEKNISI_LIST.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
              <option value="Admin Kasir">Admin Kasir</option>
            </select>
          </div>

          {(ticket.distributor_vendor || ticket.jenis_layanan === 'GARANSI' || newStatus === 'ALIH SERVICE') && (
            <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800 space-y-3">
              <div>
                <label className="block text-xs font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wider mb-1">
                  Hasil Servis Garansi
                </label>
                <select
                  value={newHasilGaransi}
                  onChange={(e) => setNewHasilGaransi(e.target.value as 'Diservice' | 'Diganti baru')}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold rounded-lg border border-purple-300 dark:border-purple-700 focus:outline-hidden"
                >
                  <option value="">-- Belum Ada Hasil --</option>
                  <option value="Diservice">Diservice (Unit Sama)</option>
                  <option value="Diganti baru">Diganti baru (Unit Baru)</option>
                </select>
              </div>

              {newHasilGaransi === 'Diganti baru' && (
                <div>
                  <label className="block text-xs font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wider mb-1">
                    Serial Number Baru (SN Baru) *
                  </label>
                  <input
                    type="text"
                    value={newSnBaru}
                    onChange={(e) => setNewSnBaru(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono font-bold rounded-lg border border-purple-400 dark:border-purple-600 focus:outline-hidden"
                  />
                </div>
              )}
            </div>
          )}

                    {newStatus === 'SELESAI & DIAMBIL' && (
            <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 space-y-1.5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-blue-950 dark:text-blue-200 uppercase tracking-wider">
                  Tanggal Diambil (Tgl Diambil) *
                </label>
                <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-md">
                  Wajib Diisi
                </span>
              </div>
              <input
                type="date"
                required
                value={newTglDiambil}
                onChange={(e) => setNewTglDiambil(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold rounded-lg border border-blue-300 dark:border-blue-700 focus:border-blue-500 focus:outline-hidden shadow-2xs"
              />
              <p className="text-[11px] text-blue-700 dark:text-blue-300">
                Tanggal saat unit barang diserahkan ke pelanggan / customer.
              </p>
            </div>
          )}

          {(newStatus === 'SELESAI & DIAMBIL' || newStatus === 'GAGAL SERVICE/GARANSI') && (
            <div className="p-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-300 dark:border-slate-700">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Biaya Akhir / Total Nota Pelunasan (Rp)
              </label>
              <input
                type="number"
                min="0"
                value={newBiayaAkhir}
                onChange={(e) => setNewBiayaAkhir(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-600 focus:outline-hidden"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setIsStatusModalOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isUpdatingStatus}
              className="px-5 py-2 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs"
            >
              {isUpdatingStatus ? 'Menyimpan...' : 'Simpan Status Baru'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Customer Receipt Modal */}
      <CustomerReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        ticket={ticket}
      />

      {/* Shipping Label Modal */}
      {ticket.distributor_vendor && (
        <ShippingLabelModal
          isOpen={isLabelModalOpen}
          onClose={() => setIsLabelModalOpen(false)}
          vendorName={ticket.distributor_vendor}
          noSuratJalan={ticket.no_surat_jalan || undefined}
          tickets={[ticket]}
        />
      )}
    </div>
  );
}
