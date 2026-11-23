export type JenisLayanan = 'SERVICE' | 'GARANSI' | string;

export type JenisBarang =
  | 'Laptop'
  | 'PC'
  | 'Printer'
  | 'Projector'
  | 'Aksesoris'
  | 'Sparepart'
  | 'Other'
  | string;

export type StatusTiket =
  | 'PROSES SERVICE'
  | 'PENDING SERVICE'
  | 'SELESAI BELUM DIAMBIL'
  | 'SELESAI & DIAMBIL'
  | 'GAGAL SERVICE/GARANSI'
  | 'PROSES GARANSI'
  | 'ALIH SERVICE'
  | string;

export type Teknisi = 'Wandi' | 'Satryo' | 'Derida' | 'Anzar' | string;

export type HasilServiceGaransi = 'Diservice' | 'Diganti baru' | string;

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

  // Dynamic Custom Fields JSON
  custom_data?: Record<string, string | number | null>;

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

// ==========================================
// WHITE-LABEL / MULTI-CLIENT CONFIG TYPES
// ==========================================

export type ColorSchemeKey =
  | 'blue'
  | 'amber'
  | 'emerald'
  | 'purple'
  | 'orange'
  | 'rose'
  | 'teal'
  | 'indigo'
  | 'sky';

export interface BrandingConfig {
  appName: string;
  appSubtitle: string;
  logoUrl: string;
  primaryColor: string; // Hex color e.g. #2563eb
  companyAddress: string;
  companyPhone: string;
  companyHours: string;
  receiptFooterNotes: string[];
}

export interface FeatureToggleItem {
  feature_key: string;
  default_label: string;
  custom_label: string;
  href: string;
  group_name: string;
  icon: string;
  is_enabled: boolean;
  admin_only: boolean;
  sort_order: number;
}

export interface KpiConfigItem {
  id: string;
  kpi_key: string;
  label: string;
  icon: string;
  color_scheme: ColorSchemeKey;
  is_visible: boolean;
  sort_order: number;
}

export type CustomFieldType = 'text' | 'number' | 'select' | 'date' | 'textarea';

export interface CustomFieldConfig {
  id: string;
  field_key: string;
  label: string;
  field_type: CustomFieldType;
  options: string[];
  placeholder: string;
  section: 'basic' | 'customer' | 'device' | 'status' | 'vendor' | 'finance' | 'custom';
  is_builtin: boolean;
  is_visible_in_form: boolean;
  is_required: boolean;
  show_in_table: boolean;
  show_in_compact: boolean;
  sort_order: number;
}

export interface FormPresetsConfig {
  jenisBarang: string[];
  jenisLayanan: string[];
  kelengkapanUmum: string[];
  statusService: string[];
  statusGaransi: string[];
  teknisi: string[];
}

export interface AppConfig {
  branding: BrandingConfig;
  features: FeatureToggleItem[];
  kpis: KpiConfigItem[];
  fields: CustomFieldConfig[];
  presets: FormPresetsConfig;
}
