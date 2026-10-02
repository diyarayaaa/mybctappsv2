export type JenisLayanan = 'SERVICE' | 'GARANSI';

export type JenisBarang = 
  | 'Laptop' 
  | 'PC' 
  | 'Printer' 
  | 'Projector' 
  | 'Aksesoris' 
  | 'Sparepart' 
  | 'Other';

export type StatusTiket =
  | 'PROSES SERVICE'
  | 'PENDING SERVICE'
  | 'SELESAI BELUM DIAMBIL'
  | 'SELESAI & DIAMBIL'
  | 'GAGAL SERVICE/GARANSI'
  | 'PROSES GARANSI'
  | 'ALIH SERVICE';

export type Teknisi = 'Wandi' | 'Satryo' | 'Derida' | 'Anzar' | string;

export type HasilServiceGaransi = 'Diservice' | 'Diganti baru';

export type UserRole = 'ADMIN' | 'TEKNISI' | 'SALES' | 'VIEWER';

export type UserStatus = 'active' | 'pending' | 'suspended';

export interface User {
  id: string;
  username: string;
  email?: string | null;
  nama_lengkap: string;
  role: UserRole;
  status?: UserStatus;
  provider?: 'credentials' | 'google';
  spesialisasi?: string | null;
  avatar_color?: string | null;
  avatar_url?: string | null;
  created_at?: string;
  last_login?: string | null;
}

export interface Ticket {
  id: string;
  nomor_layanan: string;
  tanggal_masuk: string;
  jenis_layanan: JenisLayanan;
  
  // Info Pelanggan
  nama_customer: string;
  no_hp: string;
  
  // Info Perangkat
  jenis_barang: JenisBarang;
  nama_barang: string;
  serial_number: string;
  keluhan: string;
  kelengkapan: string[]; // parsed from JSON or array
  estimasi_selesai?: string | null;
  
  // Penugasan & Status
  teknisi: Teknisi;
  status: StatusTiket;
  catatan?: string | null;
  
  // Keuangan
  estimasi_biaya: number;
  dp: number;
  sisa: number;
  biaya_akhir?: number;
  
  // Alur Vendor & Garansi
  no_surat_jalan?: string | null;
  distributor_vendor?: string | null;
  tgl_kirim_vendor?: string | null;
  tgl_datang_vendor?: string | null;
  hasil_service_garansi?: HasilServiceGaransi | null;
  sn_baru?: string | null;
  tgl_diambil_customer?: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface SuratJalan {
  id: string;
  no_surat_jalan: string;
  distributor_vendor: string;
  tgl_kirim: string;
  ekspedisi?: string | null;
  no_resi?: string | null;
  catatan?: string | null;
  created_by: string;
  created_at: string;
  ticket_count?: number;
  tickets?: Ticket[];
}

export interface MasterVendor {
  id: number;
  nama_vendor: string;
  wilayah: 'BDG' | 'JKT' | 'OTHER';
  alamat_lengkap?: string | null;
  kontak_wa?: string | null;
  is_active: boolean;
}

export interface MasterKeluhan {
  id: number;
  teks_keluhan: string;
}

export interface AuditLog {
  id: number;
  ticket_id?: string | null;
  nomor_layanan?: string | null;
  actor: string;
  action: string;
  keterangan: string;
  payload_sebelum?: Record<string, unknown> | null;
  payload_sesudah?: Record<string, unknown> | null;
  created_at: string;
}

export interface DashboardStats {
  barangMasukHariIni: number;
  serviceOnProgress: number;
  barangDiVendor: number;
  garansiMasukMingguIni: number;
  garansiBelumDikirim: number;
  barangBelumDiambil: number;
  garansiSelesai: number;
  serviceSelesai: number;
  totalTiket?: number;
  // Backward compatibility fields
  totalServiceAktif?: number;
  pendingService?: number;
  garansiDiVendor?: number;
  stokTokoReady?: number;
  serviceSelesaiBulanIni?: number;
}
