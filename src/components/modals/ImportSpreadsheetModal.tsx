'use client';

import React, { useState, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  FileText,
  X,
  Trash2
} from 'lucide-react';

interface ImportSpreadsheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportSpreadsheetModal({
  isOpen,
  onClose,
  onSuccess
}: ImportSpreadsheetModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [resetBeforeImport, setResetBeforeImport] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    detectedFormat?: string;
    importedCount?: number;
    skippedCount?: number;
    totalInDb?: number;
    message?: string;
    error?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileFormatLabel = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'xlsx':
        return { label: 'Microsoft Excel (.xlsx)', type: 'excel', badge: 'Excel 2007+' };
      case 'xls':
        return { label: 'Microsoft Excel 97-2003 (.xls)', type: 'excel', badge: 'Excel Lama' };
      case 'csv':
        return { label: 'CSV (Comma / Semicolon Delimited)', type: 'csv', badge: 'File CSV' };
      case 'tsv':
        return { label: 'TSV (Tab-Separated Values)', type: 'tsv', badge: 'File TSV' };
      default:
        return { label: 'Spreadsheet File', type: 'spreadsheet', badge: 'Spreadsheet' };
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setResult({ error: 'Silakan pilih file spreadsheet (CSV atau Excel) terlebih dahulu' });
      return;
    }

    setIsUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (resetBeforeImport) {
        formData.append('resetBeforeImport', 'true');
      }

      const res = await fetch('/api/tickets/import', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Gagal mengimpor data spreadsheet');
      }

      setResult({
        success: true,
        detectedFormat: data.detectedFormat || getFileFormatLabel(file.name).label,
        importedCount: data.importedCount,
        skippedCount: data.skippedCount,
        totalInDb: data.totalInDb,
        message: data.message
      });

      onSuccess();
    } catch (err: any) {
      setResult({
        error: err.message || 'Terjadi kesalahan saat mengimpor data'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setResult(null);
    setResetBeforeImport(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const fileInfo = file ? getFileFormatLabel(file.name) : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Data Tiket dari Spreadsheet"
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Info Box */}
        <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200/80 dark:border-blue-900/50 flex items-start gap-3">
          <FileSpreadsheet className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
            Sistem secara otomatis mendeteksi format file <strong>.xlsx</strong>, <strong>.xls</strong>, dan <strong>.csv</strong> (pemisah koma atau titik-koma), memetakan nama kolom, tanggal, serta nomor RMA secara cerdas.
          </div>
        </div>

        {/* Drag & Drop Area */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => {
            if (!file) fileInputRef.current?.click();
          }}
          className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all ${
            file
              ? 'border-blue-400 bg-blue-50/30 dark:bg-blue-950/20'
              : 'border-slate-300 dark:border-slate-700 hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,.tsv,.txt"
            onChange={handleFileChange}
            className="hidden"
          />

          {!file ? (
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="p-3.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <UploadCloud className="w-7 h-7" />
              </div>
              <div>
                <p className="font-bold text-sm text-slate-800 dark:text-slate-100">
                  Klik untuk pilih file atau seret file ke sini
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Format otomatis terdeteksi: <strong>.xlsx</strong>, <strong>.xls</strong>, atau <strong>.csv</strong>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-2 text-left">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-3 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20 shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {file.name}
                    </p>
                    {fileInfo && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {fileInfo.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Ukuran: {(file.size / 1024).toFixed(1)} KB • Siap diproses
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                >
                  Ganti File
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    resetState();
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  title="Hapus pilihan"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Reset Database Option Toggle */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={resetBeforeImport}
              onChange={(e) => setResetBeforeImport(e.target.checked)}
              className="w-4 h-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 cursor-pointer"
            />
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Kosongkan data lama sebelum import
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                Jika dicentang, tiket lama akan dihapus dan digantikan seluruhnya oleh data dari file ini.
              </span>
            </div>
          </label>
        </div>

        {/* Result Message */}
        {result?.error && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{result.error}</span>
          </div>
        )}

        {result?.success && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs space-y-1.5 animate-in fade-in">
            <div className="flex items-center gap-2 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{result.message}</span>
            </div>
            <div className="pl-7 space-y-0.5 text-xs text-emerald-700 dark:text-emerald-300">
              <p>Format Terdeteksi: <strong>{result.detectedFormat}</strong></p>
              <p>Data Diproses: <strong>{result.importedCount}</strong> baris</p>
              <p>Total Tiket di Database Sekarang: <strong>{result.totalInDb}</strong> data</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {result?.success ? 'Tutup & Selesai' : 'Batal'}
          </button>

          <button
            type="button"
            disabled={!file || isUploading}
            onClick={handleImport}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-md shadow-blue-500/20 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Mendeteksi Format & Memproses...</span>
              </>
            ) : (
              <>
                <span>Mulai Proses Import</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
