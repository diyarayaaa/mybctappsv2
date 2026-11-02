'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { formatDateIndo } from '@/lib/whatsapp-formatter';
import {
  Search,
  User,
  Phone,
  Clock,
  History,
  Check,
  ChevronRight,
  Sparkles,
  X,
  FileText
} from 'lucide-react';

export interface CustomerSummary {
  nama_customer: string;
  no_hp: string;
  total_servis: number;
  servis_terakhir: string;
  barang_terakhir: string;
  jenis_barang_terakhir: string;
}

interface CustomerSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (customer: CustomerSummary) => void;
  onViewHistory: (customer: CustomerSummary) => void;
}

export function CustomerSearchModal({
  isOpen,
  onClose,
  onSelectCustomer,
  onViewHistory,
}: CustomerSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load top customers when modal opens or when searchQuery is empty
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      fetchCustomers(searchQuery);
    }, 250);

    return () => clearTimeout(timer);
  }, [isOpen, searchQuery]);

  const fetchCustomers = async (query: string) => {
    setIsLoading(true);
    try {
      const trimmed = query.trim();
      let url = '/api/customers/search';
      if (!trimmed || trimmed.length < 2) {
        url += '?top=true';
      } else {
        url += `?q=${encodeURIComponent(trimmed)}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (data.customers) {
        setCustomers(data.customers);
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Buku Kontak & Riwayat Pelanggan"
      subtitle="Cari pelanggan yang pernah servis untuk auto-fill nama & nomor handphone"
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {/* Search Input Bar */}
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ketik nama pelanggan atau nomor WhatsApp... (Contoh: Nasrul, Rahmat, 0851...)"
            className="w-full pl-11 pr-10 py-3 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status / Count Bar */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
          <span>
            {searchQuery.trim().length >= 2
              ? `Hasil pencarian "${searchQuery}"`
              : 'Pelanggan Paling Sering Servis (Top Repeat Customers)'}
          </span>
          <span className="font-semibold">{customers.length} data ditemukan</span>
        </div>

        {/* Customer List */}
        <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-1">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-sm animate-pulse">
              Mencari data pelanggan...
            </div>
          ) : customers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              Tidak ada pelanggan yang cocok dengan kata kunci &quot;{searchQuery}&quot;.
            </div>
          ) : (
            customers.map((c, idx) => (
              <div
                key={`${c.nama_customer}-${idx}`}
                className="p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-800 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-100 dark:border-blue-900 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    {c.nama_customer.replace(/^tn\/ny\.?\s*/i, '').charAt(0).toUpperCase() || 'P'}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {c.nama_customer}
                      </span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shrink-0">
                        {c.total_servis}x Servis
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                      <span className="font-mono flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                        <Phone className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        {c.no_hp || 'Tidak ada no HP'}
                      </span>
                      {c.barang_terakhir && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[220px]" title={c.barang_terakhir}>
                            Terakhir: <span className="font-medium text-slate-700 dark:text-slate-300">{c.barang_terakhir}</span>
                          </span>
                        </>
                      )}
                      {c.servis_terakhir && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-[11px]">
                            {formatDateIndo(c.servis_terakhir)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => onViewHistory(c)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-all flex items-center gap-1"
                    title="Lihat semua riwayat servis pelanggan ini"
                  >
                    <History className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Riwayat</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectCustomer(c);
                      onClose();
                    }}
                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-sm rounded-lg transition-all flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Pilih</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
