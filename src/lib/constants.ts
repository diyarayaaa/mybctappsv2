import { JenisBarang, StatusTiket } from '@/types';

export const TEKNISI_LIST = [
  'Wandi',
  'Satryo',
  'Derida',
  'Anzar'
] as const;

export const JENIS_BARANG_LIST: JenisBarang[] = [
  'Laptop',
  'PC',
  'Printer',
  'Projector',
  'Aksesoris',
  'Sparepart',
  'Other'
];

export const KELENGKAPAN_MAP: Record<string, string[]> = {
  Laptop: ['Unit', 'Charger', 'Tas', 'Unit saja', 'RAM', 'SSD', 'BATERAI'],
  PC: ['Tutup case 1', 'Tutup case full', 'Dus', 'RAM', 'SSD', 'HDD', 'VGA', 'PSU'],
  Printer: ['Fulldus', 'Unit Saja', 'Adaptor', 'Kabel', 'Cartridge'],
  Projector: ['Fulldus', 'Unit Saja', 'Adaptor', 'Kabel', 'Remote'],
  Aksesoris: ['Fulldus', 'Unit Saja', 'Adaptor', 'Kabel'],
  Sparepart: ['Fulldus', 'Unit Saja', 'Adaptor', 'Kabel'],
  Other: ['Fulldus', 'Unit Saja', 'Adaptor', 'Kabel']
};

export const STATUS_LIST_GARANSI: StatusTiket[] = [
  'PROSES GARANSI',
  'SELESAI & DIAMBIL',
  'SELESAI BELUM DIAMBIL',
  'GAGAL SERVICE/GARANSI'
];

export const STATUS_LIST_SERVICE: StatusTiket[] = [
  'PROSES SERVICE',
  'PENDING SERVICE',
  'SELESAI BELUM DIAMBIL',
  'SELESAI & DIAMBIL',
  'GAGAL SERVICE/GARANSI',
  'ALIH SERVICE'
];

export const STATUS_LIST: StatusTiket[] = [
  'PROSES SERVICE',
  'PENDING SERVICE',
  'SELESAI BELUM DIAMBIL',
  'SELESAI & DIAMBIL',
  'GAGAL SERVICE/GARANSI',
  'PROSES GARANSI',
  'ALIH SERVICE'
];

export const STATUS_CONFIG: Record<
  StatusTiket,
  { label: string; badgeClass: string; borderClass: string; bgClass: string; textClass: string }
> = {
  'PROSES SERVICE': {
    label: 'Proses Service',
    badgeClass: 'bg-blue-100 text-blue-700 border-blue-200',
    borderClass: 'border-blue-500',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700'
  },
  'PENDING SERVICE': {
    label: 'Pending Service',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    borderClass: 'border-amber-500',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700'
  },
  'SELESAI BELUM DIAMBIL': {
    label: 'Siap Ambil',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    borderClass: 'border-emerald-500',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-700'
  },
  'SELESAI & DIAMBIL': {
    label: 'Selesai & Diambil',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    borderClass: 'border-slate-400',
    bgClass: 'bg-slate-50',
    textClass: 'text-slate-600'
  },
  'GAGAL SERVICE/GARANSI': {
    label: 'Gagal Service/Garansi',
    badgeClass: 'bg-rose-100 text-rose-700 border-rose-200',
    borderClass: 'border-rose-500',
    bgClass: 'bg-rose-50',
    textClass: 'text-rose-700'
  },
  'PROSES GARANSI': {
    label: 'Proses Garansi',
    badgeClass: 'bg-purple-100 text-purple-700 border-purple-200',
    borderClass: 'border-purple-500',
    bgClass: 'bg-purple-50',
    textClass: 'text-purple-700'
  },
  'ALIH SERVICE': {
    label: 'Alih Service',
    badgeClass: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    borderClass: 'border-indigo-500',
    bgClass: 'bg-indigo-50',
    textClass: 'text-indigo-700'
  }
};

export const SALES_WA_NUMBER = '6282120081484';
export const SALES_WA_DISPLAY = '0821-2008-1484';

export const COMPANY_INFO = {
  name: 'Best Computel Garut (BCT Garut)',
  subName: 'Service & RMA Center',
  address: 'Jl. Terusan Pembangunan No.9C, Tarkid - Garut',
  phone: '0895-2665-5777',
  hours: {
    weekdays: 'Senin - Jumat : 09.00 - 17.00',
    saturday: 'Sabtu : 09.00 - 15.00',
    sunday: 'Minggu dan Tanggal Merah : Libur'
  }
};
