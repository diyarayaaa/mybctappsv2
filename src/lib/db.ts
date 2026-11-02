import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

function getDbPath(): string {
  // Vercel filesystem is read-only except /tmp — use /tmp on Vercel
  const isVercel = !!process.env.VERCEL;
  if (isVercel) {
    const tmpDbPath = path.join('/tmp', 'bct.sqlite');
    try {
      if (!fs.existsSync(tmpDbPath)) {
        const candidatePaths = [
          path.join(process.cwd(), 'data', 'bct.sqlite'),
          path.join(__dirname, '..', '..', 'data', 'bct.sqlite'),
          path.join(__dirname, 'data', 'bct.sqlite')
        ];
        for (const candidate of candidatePaths) {
          if (fs.existsSync(candidate)) {
            fs.copyFileSync(candidate, tmpDbPath);
            break;
          }
        }
      }
    } catch (e) {
      console.warn('[db] Could not copy initial sqlite DB to /tmp:', e);
    }
    return tmpDbPath;
  }
  const dbDir = path.join(process.cwd(), 'data');
  try {
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  } catch {}
  return path.join(dbDir, 'bct.sqlite');
}

const dbPath = getDbPath();

declare global {
  // eslint-disable-next-line no-var
  var _sqliteDb: DatabaseSync | undefined;
  // eslint-disable-next-line no-var
  var _sqliteDbInitialized: boolean | undefined;
}

let dbInstance: DatabaseSync | null = null;

export function getDatabase(): DatabaseSync {
  if (global._sqliteDb) {
    return global._sqliteDb;
  }

  if (!dbInstance) {
    try {
      dbInstance = new DatabaseSync(dbPath);
    } catch (e) {
      console.error('[db] DatabaseSync failed — is Node >=22? path:', dbPath, e);
      throw new Error('Database tidak tersedia di environment ini. Pastikan Node 22+');
    }
    try {
      dbInstance.exec('PRAGMA busy_timeout = 5000;');
    } catch {
      // ignore
    }

    if (!global._sqliteDbInitialized) {
      initDatabase(dbInstance);
      global._sqliteDbInitialized = true;
    }

    global._sqliteDb = dbInstance;
  }

  return dbInstance;
}

function initDatabase(db: DatabaseSync) {
  try {
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA foreign_keys = ON;');
  } catch {
    // Ignore PRAGMA lock if already set
  }

  try {
    // 0. Table users
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        nama_lengkap TEXT NOT NULL,
        role TEXT NOT NULL,
        spesialisasi TEXT,
        avatar_color TEXT,
        email TEXT,
        status TEXT DEFAULT 'active',
        provider TEXT DEFAULT 'credentials',
        avatar_url TEXT,
        last_login TEXT,
        created_at TEXT DEFAULT (datetime('now', 'localtime'))
      );
    `);

    // Migration for existing users table
    try { db.exec("ALTER TABLE users ADD COLUMN email TEXT;"); } catch {}
    try { db.exec("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active';"); } catch {}
    try { db.exec("ALTER TABLE users ADD COLUMN provider TEXT DEFAULT 'credentials';"); } catch {}
    try { db.exec("ALTER TABLE users ADD COLUMN avatar_url TEXT;"); } catch {}
    try { db.exec("ALTER TABLE users ADD COLUMN last_login TEXT;"); } catch {}
    try { db.exec("UPDATE users SET status = 'active' WHERE status IS NULL;"); } catch {}
    try { db.exec("UPDATE users SET provider = 'credentials' WHERE provider IS NULL;"); } catch {}

    // Table auth_otps (for Gmail OTP authentication)
    db.exec(`
      CREATE TABLE IF NOT EXISTS auth_otps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        code TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        used INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now', 'localtime'))
      );
      CREATE INDEX IF NOT EXISTS idx_otps_email ON auth_otps (email);
    `);

    // Table app_settings (for SMTP and system configuration)
    db.exec(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now', 'localtime'))
      );
    `);

    // 1. Table tickets
    db.exec(`
      CREATE TABLE IF NOT EXISTS tickets (
        id TEXT PRIMARY KEY,
        nomor_layanan TEXT UNIQUE NOT NULL,
        tanggal_masuk TEXT DEFAULT (datetime('now', 'localtime')) NOT NULL,
        jenis_layanan TEXT NOT NULL,
        nama_customer TEXT NOT NULL,
        no_hp TEXT NOT NULL,
        jenis_barang TEXT NOT NULL,
        nama_barang TEXT NOT NULL,
        serial_number TEXT NOT NULL,
        keluhan TEXT NOT NULL,
        kelengkapan TEXT NOT NULL DEFAULT '[]',
        estimasi_selesai TEXT,
        teknisi TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PROSES SERVICE',
        catatan TEXT,
        estimasi_biaya REAL DEFAULT 0,
        dp REAL DEFAULT 0,
        sisa REAL DEFAULT 0,
        biaya_akhir REAL DEFAULT 0,
        no_surat_jalan TEXT,
        distributor_vendor TEXT,
        tgl_kirim_vendor TEXT,
        tgl_datang_vendor TEXT,
        hasil_service_garansi TEXT,
        sn_baru TEXT,
        tgl_diambil_customer TEXT,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT DEFAULT (datetime('now', 'localtime'))
      );
    `);

    // 2. Table surat_jalan
    db.exec(`
      CREATE TABLE IF NOT EXISTS surat_jalan (
        id TEXT PRIMARY KEY,
        no_surat_jalan TEXT UNIQUE NOT NULL,
        distributor_vendor TEXT NOT NULL,
        tgl_kirim TEXT NOT NULL,
        ekspedisi TEXT,
        no_resi TEXT,
        catatan TEXT,
        created_by TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now', 'localtime'))
      );
    `);

    // 3. Table master_vendors
    db.exec(`
      CREATE TABLE IF NOT EXISTS master_vendors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nama_vendor TEXT UNIQUE NOT NULL,
        wilayah TEXT NOT NULL,
        alamat_lengkap TEXT,
        kontak_wa TEXT,
        is_active INTEGER DEFAULT 1
      );
    `);

    // 4. Table master_keluhan
    db.exec(`
      CREATE TABLE IF NOT EXISTS master_keluhan (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teks_keluhan TEXT UNIQUE NOT NULL
      );
    `);

    // 5. Table audit_logs
    db.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id TEXT,
        nomor_layanan TEXT,
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        keterangan TEXT NOT NULL,
        payload_sebelum TEXT,
        payload_sesudah TEXT,
        created_at TEXT DEFAULT (datetime('now', 'localtime'))
      );
    `);

    // Performance Indexes for 5,000+ records
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets (status);
      CREATE INDEX IF NOT EXISTS idx_tickets_teknisi ON tickets (teknisi);
      CREATE INDEX IF NOT EXISTS idx_tickets_customer ON tickets (nama_customer);
      CREATE INDEX IF NOT EXISTS idx_tickets_surat_jalan ON tickets (no_surat_jalan);
      CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets (created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_ticket_id ON audit_logs (ticket_id);
      CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs (created_at DESC);
    `);

    seedInitialData(db);
  } catch (err) {
    console.error('Database initialization warning:', err);
  }
}

function seedInitialData(db: DatabaseSync) {
  try {
    // Seed Users
    const userCountStmt = db.prepare('SELECT COUNT(*) as count FROM users');
    const userCount = userCountStmt.get() as { count: number };

    if (userCount.count === 0) {
      const insertUser = db.prepare(`
        INSERT INTO users (id, username, password_hash, nama_lengkap, role, spesialisasi, avatar_color)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const defaultUsers = [
        ['usr-wandi', 'wandi', 'bct123', 'Wandi', 'TEKNISI', 'Teknisi Utama & Garansi', 'orange'],
        ['usr-satryo', 'satryo', 'bct123', 'Satryo', 'TEKNISI', 'Teknisi Servis Reguler', 'blue'],
        ['usr-derida', 'derida', 'bct123', 'Derida', 'TEKNISI', 'Teknisi Servis', 'emerald'],
        ['usr-anzar', 'anzar', 'bct123', 'Anzar', 'TEKNISI', 'Teknisi Servis', 'indigo'],
        ['usr-admin', 'admin', 'bct123', 'Admin Kasir', 'ADMIN', 'Administrasi, Kasir & Logistik', 'purple'],
        ['usr-sales', 'sales', 'bct123', 'Sales Toko', 'SALES', 'Sales & Stok BCT / GHITP', 'pink']
      ];

      for (const u of defaultUsers) {
        insertUser.run(...u);
      }
    }

    // Seed Master Keluhan (Standardized & Non-Redundant)
    const insertKeluhan = db.prepare(`
      INSERT OR IGNORE INTO master_keluhan (teks_keluhan)
      VALUES (?)
    `);

    const keluhanList = [
      // 1. Daya & Mesin (Power & Motherboard)
      'Mati Total (No Power / Tidak Bisa Dicas)',
      'Nyala Mati / Restart Sendiri / Suka Mati Mendadak',
      'Konslet / Bau Hangus / Komponen Terbakar',
      'Kena Tumpahan Cairan / Korosi / Serangga',
      'Pin Processor Bengkok / Socket Rusak',
      'Slot RAM Tidak Berfungsi / Error',
      'Settingan BIOS Reset / Baterai CMOS Habis',
      'Tombol Power Tidak Berfungsi',
      'Klaim Garansi Servis Mesin / Motherboard',

      // 2. Layar & Grafis (Display & GPU)
      'No Display / Layar Blank Gelap / Tampilan Intermiten',
      'Layar Pecah / Retak (Ganti LCD)',
      'Layar Bergaris / Kedip / Vignette / White Spot',
      'Tampilan Artefak / Glitch Grafis VGA',
      'Cek Display & Benchmark VGA',
      'Klaim Garansi Layar / LCD',

      // 3. Penyimpanan (Storage)
      'SSD / HDD Tidak Terdeteksi (No Disk Detected)',
      'SSD / HDD Bad Sector / Health Turun / Sering Freeze',
      'Storage Corrupt / RAW / Gagal Format / Partisi Error',
      'Drive / Partisi Penuh (Cleanup Storage)',

      // 4. Sistem Operasi & Software
      'Instal Ulang Windows 10 / 11 (OS + Software)',
      'Instal Microsoft Office & Software Tambahan',
      'Update OS / Perbaikan Gagal Windows Update',
      'BSOD (Blue Screen of Death)',
      'Gagal Booting / Masuk BIOS Terus / No Bootable Device',
      'Stuck di Automatic Repair / Bootloop',
      'Sistem Lambat / Lemot / Sering Not Responding',
      'Unlock BitLocker / Reset Password Windows',
      'Cek & Scan Virus / Malware',

      // 5. Input Device (Keyboard & Touchpad)
      'Keyboard Error / Tombol Tidak Berfungsi / Ganti Baru',
      'Touchpad / Trackpad Mati / Tidak Responsif',

      // 6. Baterai & Charger
      'Baterai Drop / Not Charging / Ganti Baterai Baru',
      'Adaptor / Charger Lemah / Rusak',

      // 7. Thermal & Pendingin
      'Overheat / Suhu Panas & Mati Sendiri',
      'Repasta Processor & Cleaning Debu Total',
      'Kipas / Fan Berisik / Macet (Fan Error)',

      // 8. Audio, Jaringan & Port
      'Speaker Rusak (Mati / Suara Pecah / Sembrang)',
      'Port Audio Jack 3.5mm Tidak Berfungsi',
      'Mikrofon / Webcam Tidak Berfungsi',
      'Wi-Fi Tidak Terdeteksi / Suka Putus (Luplep)',
      'Port LAN (Ethernet) Tidak Berfungsi',
      'Port USB Rusak / Tidak Mendeteksi Perangkat',
      'Port HDMI / Type-C Display Tidak Berfungsi',

      // 9. Upgrade & Rakit PC
      'Upgrade SSD (Pemasangan + Kloning / OS)',
      'Upgrade RAM / Tambah Kapasitas Memori',
      'Rakit PC Baru + Cable Management + Instal OS',
      'Ganti Power Supply (PSU)',
      'Ganti Casing PC + Manajemen Fan',

      // 10. General Check-up
      'General Check-up & Diagnostik (Hardware / Software)'
    ];

    for (const k of keluhanList) {
      insertKeluhan.run(k);
    }

    // Seed Master Vendors
    const vendorCountStmt = db.prepare('SELECT COUNT(*) as count FROM master_vendors');
    const vendorCount = (vendorCountStmt.get() as { count: number }).count;
    if (vendorCount === 0) {
      const insertVendor = db.prepare(`
        INSERT OR IGNORE INTO master_vendors (nama_vendor, wilayah, alamat_lengkap, kontak_wa, is_active)
        VALUES (?, ?, ?, ?, 1)
      `);
      const defaultVendors = [
        ['CV. PRISMA MITRA BUANA', 'BDG', 'Ruko Harco Mangga 2 Selatan Blok i-47, Jakarta Pusat 10730', '0821-1922-8869'],
        ['PT. ASIA GLOBAL SUKSESINDO (AGS)', 'BDG', 'Ruko Harco Mangga 2 Selatan Blok F-8, Jakarta Pusat 10730', '0817-1777-7002'],
        ['ELITE KOMPUTER (PAK AMIN)', 'BDG', 'Jl. Cagak Kp. Picung Gede No.32 RT 02/RW 05, Cihampelas, Bandung Barat', '081223495909'],
        ['JETE PASKAL 23 BANDUNG', 'BDG', 'Paskal 23 Bandung, Jl. Pasir Kaliki No.25-27 Lantai 2 Unit No.39, Bandung', '0857-3378-4023'],
        ['PT. ASTRINDO SENTOSA (ASUS SC)', 'BDG', 'Ruko Segitiga Mas Kosambi, JL. Jend A. Yani No.221-223 Bl C/13, Bandung', '0812-2156-0599'],
        ['AGRES ID BDG', 'BDG', 'AGRES Info Teknologi, Bandung', '0812-3456-7890'],
        ['ASUS SERVICE CENTER BDG', 'BDG', 'Service Center ASUS Bandung', '-'],
        ['ACER SERVICE CENTER BDG', 'BDG', 'Service Center Acer Bandung', '-'],
        ['CCK BDG', 'BDG', 'CCK Bandung', '-'],
        ['GPL BDG', 'BDG', 'GPL Bandung', '-'],
        ['DTG BDG', 'BDG', 'DTG Bandung', '-'],
        ['NOVUS BDG', 'BDG', 'Novus Bandung', '-'],
        ['NSN BDG', 'BDG', 'NSN Bandung', '-'],
        ['ANYAR KOMPUTER BDG', 'BDG', 'Anyar Komputer Bandung', '-'],
        ['NE BANDUNG', 'BDG', 'NE Bandung', '-'],
        ['MEGA KOMPUTER BDG', 'BDG', 'Mega Komputer Bandung', '-'],
        ['Q-CHOX COMPUTER', 'BDG', 'Jalan Raya Cilauteureun KM.00 Pameungpeuk - Garut 44175', '0821-2222-7280'],
        ['PAK TONI GREEN NET', 'BDG', 'Ciawi - Cibalong, depan Garasi AL', '0812-2258-0770'],
        ['DADAN KOMPUTER', 'BDG', 'Jalan Raya Siliwangi No.2 Gang Al-Falah, Cikaret, Cianjur', '0856-2191-507'],
        ['ARIA COMPUTER', 'BDG', 'Ruko Cimenteng samping Baso Mojok Jalan Arwinda, Cianjur', '0856-5949-4246'],
        ['TN.GANJAR LESMANA', 'BDG', 'Kp. Cikoer - Kec. Cikelet', '0821-2017-8492'],
        ['PT. METRO PEARL INDONESIA', 'BDG', 'Jl. Pramuka Raya Km 0.99 No.18, Purwakarta', '0877-7975-5416'],
        ['ATAKINDO BDG', 'BDG', 'Atakindo Bandung', '-'],
        ['AGRES INFO TEKNOLOGI (AGRES JKT)', 'JKT', 'AGRES (Gudang Abdad) Mangga Dua Abdad No.44-45, Jakarta 10730', '0813-5566-7788'],
        ['CV. GOLDEN TECHNOLOGY INDO', 'JKT', 'Ruko Sedayu Square Blok J26, Cengkareng Barat, Jakarta Barat', '0811-1903-2716'],
        ['ABACUS KOMPUTER', 'JKT', 'Mall Mangga Dua Blok A Lantai 4 No.51, Jakarta Pusat', '0858-8031-2805'],
        ['PT NANO SOLUSI TECHNOLOGY (SC COMPUTER)', 'JKT', 'Grand Boutique Center Blok E10, Mangga Dua, Jakarta Utara', '0815-1013-5638'],
        ['PT. SURYA ARTHA KOMPUTAMA (SAK)', 'JKT', 'Ruko Mangga 2 Mas D25, Jakarta Pusat', '0877-8810-1990'],
        ['FM KOMPUTER', 'JKT', 'Green Sedayu Bizpark Blok DM3 no 11G, Kalideres, Jakarta Barat', '0878-8004-5463'],
        ['KC JAKARTA GROUP (ROG X MOG)', 'JKT', 'WTC Manggadua Lantai UG Blok C No 58, Jakarta Utara', '0858-8848-2918'],
        ['Surya Kencana 30', 'JKT', 'Jl. Buncit Raya No.30, Kalibata, Pancoran, Jakarta Selatan', '0858-6063-2297'],
        ['AGRES JAKARTA', 'JKT', 'AGRES Mangga Dua Abdad No.44-45, Jakarta 10730', '0813-5566-7788'],
        ['Cahaya Distribusi Nusantara', 'JKT', 'Mangga Dua Mall Ruko Blok A10, Jakarta', '0855-147-8985'],
        ['INNOVATION', 'JKT', 'Ruko Bahan Bangunan (RBB) Blok H1 No.9 Jl. Mangga 2 Dalam, Jakarta Pusat', '0812-9898-0909'],
        ['INTERAKSI CIPTA', 'JKT', 'Ruko Harco Mangga Dua Blok J no.26, Jakarta Pusat', '0813-1135-5564'],
        ['ASIA RAYA JKT', 'JKT', 'PT. Asia Raya, Jakarta', '-'],
        ['MSA JKT', 'JKT', 'MSA Jakarta', '-'],
        ['PT. ASIA GLOBAL SUKSESINDO (AGS) JKT', 'JKT', 'PT. Asia Global Suksesindo Jakarta', '-'],
        ['Suyantou / Kayun', 'OTHER', 'Blanten Rejo RT 02 RW 05 Sukorejo, Boyolali, Jateng', '0856-0248-3047']
      ];
      for (const v of defaultVendors) {
        insertVendor.run(...v);
      }
    }
  } catch (err) {
    console.error('Seed error ignored:', err);
  }
}

export const db: DatabaseSync = new Proxy({} as DatabaseSync, {
  get(_target, prop) {
    const real = getDatabase() as unknown as Record<string | symbol, unknown>;
    const val = real[prop];
    return typeof val === 'function' ? (val as (...a: unknown[]) => unknown).bind(real) : val;
  },
}) as DatabaseSync;
