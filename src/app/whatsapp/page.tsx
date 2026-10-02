'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  MessageSquare,
  Copy,
  Check,
  Send,
  Building2,
  Boxes,
  Users,
  Search,
  RefreshCw
} from 'lucide-react';
import { SALES_WA_NUMBER, SALES_WA_DISPLAY } from '@/lib/constants';
import { Ticket } from '@/types';
import {
  formatCustomerReceiptMessage,
  formatCustomerDoneMessage,
  createWhatsAppUrl
} from '@/lib/whatsapp-formatter';

function WhatsAppHubContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab = tabParam === 'sales' ? 'sales' : tabParam === 'quick' ? 'quick' : 'operational';
  const initialTicketId = searchParams.get('ticket_id') || '';

  const [activeTab, setActiveTab] = useState<'operational' | 'sales' | 'quick'>(initialTab);

  // Sync tab state when URL searchParams changes (e.g. navigation from Sidebar)
  useEffect(() => {
    if (tabParam === 'sales') {
      setActiveTab('sales');
    } else if (tabParam === 'quick') {
      setActiveTab('quick');
    } else {
      setActiveTab('operational');
    }
  }, [tabParam]);

  const handleTabChange = (tab: 'operational' | 'sales' | 'quick') => {
    setActiveTab(tab);
    if (tab === 'operational') {
      router.replace('/whatsapp', { scroll: false });
    } else {
      router.replace(`/whatsapp?tab=${tab}`, { scroll: false });
    }
  };

  // Operational Report State
  const [operationalText, setOperationalText] = useState('');
  const [isOpLoading, setIsOpLoading] = useState(false);

  // Sales Report State
  const [salesText, setSalesText] = useState('');
  const [isSalesLoading, setIsSalesLoading] = useState(false);

  // Quick Dispatch State
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState(initialTicketId);
  const [templateType, setTemplateType] = useState<'receipt' | 'done'>('receipt');
  const [searchTicket, setSearchTicket] = useState('');

  // Copy Feedback
  const [isCopied, setIsCopied] = useState(false);

  const fetchOperationalReport = useCallback(async () => {
    setIsOpLoading(true);
    try {
      const res = await fetch('/api/whatsapp/generate?type=operational');
      const data = await res.json();
      if (!data.error) setOperationalText(data.message);
    } catch (err) {
      console.error('Failed to load operational report:', err);
    } finally {
      setIsOpLoading(false);
    }
  }, []);

  const fetchSalesReport = useCallback(async () => {
    setIsSalesLoading(true);
    try {
      const res = await fetch('/api/whatsapp/generate?type=sales');
      const data = await res.json();
      if (!data.error) setSalesText(data.message);
    } catch (err) {
      console.error('Failed to load sales report:', err);
    } finally {
      setIsSalesLoading(false);
    }
  }, []);

  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch('/api/tickets');
      const data = await res.json();
      if (!data.error) {
        setTickets(data.tickets || []);
        if (!selectedTicketId && data.tickets?.length > 0) {
          setSelectedTicketId(data.tickets[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load tickets:', err);
    }
  }, [selectedTicketId]);

  useEffect(() => {
    fetchOperationalReport();
    fetchSalesReport();
    fetchTickets();
  }, [fetchOperationalReport, fetchSalesReport, fetchTickets]);

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) || tickets[0];
  const quickMessage = selectedTicket
    ? templateType === 'receipt'
      ? formatCustomerReceiptMessage(selectedTicket)
      : formatCustomerDoneMessage(selectedTicket)
    : '';

  const quickWaUrl = selectedTicket ? createWhatsAppUrl(selectedTicket.no_hp, quickMessage) : '';
  const salesWaUrl = createWhatsAppUrl(SALES_WA_NUMBER, salesText);

  return (
    <div className="space-y-6 w-full pb-12 animate-in fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
            <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Laporan & Otomasi WhatsApp
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Rekap otomatis siap kirim untuk grup tim logistik, update sales toko, dan notifikasi pelanggan.
            </p>
          </div>
        </div>
      </div>

      {/* Main Tabs Segmented Control */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl w-full sm:w-fit overflow-x-auto border border-slate-200/70 dark:border-slate-700/60">
        <button
          onClick={() => handleTabChange('operational')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'operational'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-700/60'
          }`}
        >
          <Building2 className={`w-4 h-4 ${activeTab === 'operational' ? 'text-white' : 'text-slate-400'}`} />
          <span>Laporan WA Mingguan</span>
        </button>

        <button
          onClick={() => handleTabChange('sales')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'sales'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-700/60'
          }`}
        >
          <Boxes className={`w-4 h-4 ${activeTab === 'sales' ? 'text-white' : 'text-slate-400'}`} />
          <span>Laporan WA Garansi Stock</span>
        </button>

        <button
          onClick={() => handleTabChange('quick')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'quick'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-700/60'
          }`}
        >
          <Users className={`w-4 h-4 ${activeTab === 'quick' ? 'text-white' : 'text-slate-400'}`} />
          <span>Laporan WA Customer</span>
        </button>
      </div>

      {/* TAB 1: OPERATIONAL REPORT */}
      {activeTab === 'operational' && (
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-7 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-5 animate-in fade-in transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Rekap Logistik & Alur Servis Vendor
                </h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60">
                  Jadwal: Hari Kamis
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Rekap unit barang ke BDG, di vendor BDG, di vendor JKT, dan yang belum diproses untuk dikirim ke grup WA tim.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={fetchOperationalReport}
                disabled={isOpLoading}
                className="p-2.5 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors shrink-0 cursor-pointer"
                title="Muat Ulang Teks"
              >
                <RefreshCw className={`w-4 h-4 ${isOpLoading ? 'animate-spin text-blue-600' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => handleCopyText(operationalText)}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                {isCopied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{isCopied ? 'Tersalin ke Clipboard!' : 'Salin Format WA'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="font-semibold text-slate-600 dark:text-slate-300">Preview Teks Siap Kirim</span>
              </div>
              <span className="font-mono text-[11px]">{operationalText.length} Karakter</span>
            </div>
            <textarea
              rows={16}
              readOnly
              value={operationalText}
              placeholder="Memuat data laporan operasional..."
              className="w-full p-4 sm:p-5 bg-slate-950 text-slate-100 font-mono text-xs sm:text-sm rounded-2xl border border-slate-800 focus:outline-hidden leading-relaxed shadow-inner selection:bg-blue-600 selection:text-white"
            />
          </div>
        </div>
      )}

      {/* TAB 2: SALES REPORT */}
      {activeTab === 'sales' && (
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-7 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-5 animate-in fade-in transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Laporan RMA Stok Toko (STOCK BCT & GHITP)
                </h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 font-mono">
                  {SALES_WA_DISPLAY}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Perbandingan SN Lama vs SN Baru unit garansi stok toko yang sudah selesai servis.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={fetchSalesReport}
                disabled={isSalesLoading}
                className="p-2.5 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors shrink-0 cursor-pointer"
                title="Muat Ulang Teks"
              >
                <RefreshCw className={`w-4 h-4 ${isSalesLoading ? 'animate-spin text-blue-600' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => handleCopyText(salesText)}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                {isCopied ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{isCopied ? 'Tersalin' : 'Salin Teks'}</span>
              </button>

              <a
                href={salesWaUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Kirim ke WhatsApp Sales</span>
              </a>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="font-semibold text-slate-600 dark:text-slate-300">Format Pesan WhatsApp Sales</span>
              </div>
              <span className="font-mono text-[11px]">{salesText.length} Karakter</span>
            </div>
            <textarea
              rows={16}
              readOnly
              value={salesText}
              placeholder="Memuat data laporan garansi stok..."
              className="w-full p-4 sm:p-5 bg-slate-950 text-slate-100 font-mono text-xs sm:text-sm rounded-2xl border border-slate-800 focus:outline-hidden leading-relaxed shadow-inner selection:bg-blue-600 selection:text-white"
            />
          </div>
        </div>
      )}

      {/* TAB 3: QUICK DISPATCH */}
      {activeTab === 'quick' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in">
          {/* Left Column: Ticket Selector */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Pilih Tiket Pelanggan
              </h3>
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-900/50">
                {tickets.length} Tiket
              </span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTicket}
                onChange={(e) => setSearchTicket(e.target.value)}
                placeholder="Cari nomor servis atau nama..."
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 focus:outline-hidden transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="max-h-96 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 dark:divide-slate-800">
              {tickets
                .filter(
                  (t) =>
                    !searchTicket ||
                    t.nomor_layanan.toLowerCase().includes(searchTicket.toLowerCase()) ||
                    t.nama_customer.toLowerCase().includes(searchTicket.toLowerCase())
                )
                .map((t) => {
                  const isSelected = t.id === selectedTicketId;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTicketId(t.id)}
                      className={`w-full text-left p-3 rounded-2xl transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-blue-50/80 dark:bg-blue-950/50 border-blue-500 dark:border-blue-600 shadow-xs'
                          : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-mono font-bold text-xs ${isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-slate-900 dark:text-white'}`}>
                          {t.nomor_layanan}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{t.no_hp || '-'}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 truncate">
                        {t.nama_customer}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {t.nama_barang}
                      </p>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Right Column: Message Preview & Dispatch */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-5 sm:p-7 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
            {selectedTicket ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      Penerima Pesan Pelanggan:
                    </div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base mt-0.5">
                      {selectedTicket.nama_customer}{' '}
                      <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                        ({selectedTicket.no_hp || 'No HP belum ada'})
                      </span>
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setTemplateType('receipt')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        templateType === 'receipt'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Tanda Terima Masuk
                    </button>
                    <button
                      type="button"
                      onClick={() => setTemplateType('done')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        templateType === 'done'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Pemberitahuan Selesai
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="font-semibold text-slate-600 dark:text-slate-300">Format Pesan WhatsApp Customer</span>
                    </div>
                    <span className="font-mono text-[11px]">{quickMessage.length} Karakter</span>
                  </div>
                  <textarea
                    rows={12}
                    readOnly
                    value={quickMessage}
                    className="w-full p-4 sm:p-5 bg-slate-950 text-slate-100 font-mono text-xs sm:text-sm rounded-2xl border border-slate-800 focus:outline-hidden leading-relaxed shadow-inner selection:bg-blue-600 selection:text-white"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => handleCopyText(quickMessage)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                  >
                    {isCopied ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{isCopied ? 'Tersalin' : 'Salin Teks'}</span>
                  </button>

                  <a
                    href={quickWaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Kirim via WhatsApp</span>
                  </a>
                </div>
              </>
            ) : (
              <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                <Users className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                <p className="text-xs">Pilih salah satu tiket di sebelah kiri untuk melihat pesan otomatis WhatsApp.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function WhatsAppHubPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 dark:text-slate-400">Memuat WhatsApp Hub...</div>}>
      <WhatsAppHubContent />
    </Suspense>
  );
}
