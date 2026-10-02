'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Plus, X, Search, Sparkles } from 'lucide-react';
import { MasterKeluhan } from '@/types';

interface AppSheetEnumListProps {
  label: string;
  selectedValues: string[];
  options: MasterKeluhan[];
  onChange: (values: string[]) => void;
  onAddNewOption: (newText: string) => Promise<void>;
  required?: boolean;
  placeholder?: string;
}

export function AppSheetEnumList({
  label,
  selectedValues,
  options,
  onChange,
  onAddNewOption,
  required = false,
  placeholder = 'Pilih keluhan kerusakan...'
}: AppSheetEnumListProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus search input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  const filteredOptions = options.filter((opt) =>
    opt.teks_keluhan.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  const isExactMatch = options.some(
    (opt) => opt.teks_keluhan.toLowerCase() === searchTerm.toLowerCase().trim()
  );

  const toggleOption = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter((v) => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const handleAddNew = async () => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return;

    setIsAddingNew(true);
    try {
      await onAddNewOption(trimmed);
      if (!selectedValues.includes(trimmed)) {
        onChange([...selectedValues, trimmed]);
      }
      setSearchTerm('');
    } catch (err) {
      console.error('Failed to add new enum item:', err);
    } finally {
      setIsAddingNew(false);
    }
  };

  const removeValue = (val: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedValues.filter((v) => v !== val));
  };

  return (
    <div className="relative space-y-1.5" ref={containerRef}>
      {/* Label */}
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          {label} {required && '*'}
        </label>
        {selectedValues.length > 0 && (
          <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
            {selectedValues.length} item dipilih
          </span>
        )}
      </div>

      {/* Main Select Trigger (AppSheet Dropdown Style) */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full min-h-[42px] px-3.5 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 select-none ${
          isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/20 bg-white dark:bg-slate-800'
            : 'border-slate-300 dark:border-slate-700'
        }`}
      >
        {selectedValues.length === 0 ? (
          <span className="text-slate-400 dark:text-slate-500 text-xs sm:text-sm">
            {placeholder}
          </span>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5 flex-1 max-w-[calc(100%-28px)]">
            {selectedValues.map((val) => (
              <span
                key={val}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 text-xs font-bold border border-blue-200 dark:border-blue-800/60 shadow-2xs"
              >
                <span className="truncate max-w-[180px] sm:max-w-[280px]">{val}</span>
                <button
                  type="button"
                  onClick={(e) => removeValue(val, e)}
                  className="hover:text-rose-600 dark:hover:text-rose-400 rounded p-0.5 transition-colors cursor-pointer"
                  title="Hapus"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${
            isOpen ? 'rotate-180 text-blue-500' : ''
          }`}
        />
      </div>

      {/* Dropdown Menu (AppSheet Style with Search & Add New) */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Search Box Header */}
          <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (!isExactMatch && searchTerm.trim()) {
                    handleAddNew();
                  }
                }
              }}
              placeholder="Cari atau ketik keluhan baru..."
              className="w-full text-xs sm:text-sm bg-transparent border-none focus:outline-hidden text-slate-900 dark:text-white placeholder-slate-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Add New Item Button (AppSheet Style 'Allow Other Values') */}
          {searchTerm.trim() && !isExactMatch && (
            <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-blue-50/50 dark:bg-blue-950/30">
              <button
                type="button"
                onClick={handleAddNew}
                disabled={isAddingNew}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Plus className="w-4 h-4 shrink-0" />
                  <span className="truncate">
                    + Tambah & Simpan: <strong className="underline">&quot;{searchTerm.trim()}&quot;</strong>
                  </span>
                </div>
                <span className="text-[10px] bg-blue-600 px-1.5 py-0.5 rounded text-blue-100 font-semibold shrink-0">
                  {isAddingNew ? 'Menyimpan...' : 'Enter ↵'}
                </span>
              </button>
            </div>
          )}

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800/60 p-1">
            {filteredOptions.length === 0 && !searchTerm.trim() ? (
              <div className="p-4 text-center text-xs text-slate-400">
                Belum ada data opsi keluhan
              </div>
            ) : filteredOptions.length === 0 && searchTerm.trim() ? (
              <div className="p-4 text-center text-xs text-slate-400">
                Tidak ada keluhan yang cocok dengan &quot;{searchTerm}&quot;.
                <br />
                <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                  Gunakan tombol &quot;+ Tambah & Simpan&quot; di atas untuk menjadikannya opsi baru.
                </span>
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selectedValues.includes(opt.teks_keluhan);
                return (
                  <div
                    key={opt.id}
                    onClick={() => toggleOption(opt.teks_keluhan)}
                    className={`flex items-center justify-between px-3 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer select-none ${
                      isSelected
                        ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-900 dark:text-sky-200 font-bold'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span className="truncate">{opt.teks_keluhan}</span>
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                        isSelected
                          ? 'bg-sky-600 border-sky-600 text-white shadow-2xs'
                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Stats / Info */}
          <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-[11px] text-slate-400">
            <span>{filteredOptions.length} opsi tersedia</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Selesai Memilih
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
