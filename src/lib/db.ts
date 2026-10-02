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

    // Seed Master Vendors
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM master_vendors');
    const result = countStmt.get() as { count: number };

    if (result.count === 0) {
      const insertVendor = db.prepare(`
        INSERT INTO master_vendors (nama_vendor, wilayah, alamat_lengkap, kontak_wa, is_active)
        VALUES (?, ?, ?, ?, 1)
      `);

      const vendors = [
        ['CV. PRISMA MITRA BUANA (ZIMLINK X PON)', 'JKT', 'Ruko Harco Mangga 2 Selatan Blok I-47, Kel. Mangga Dua Selatan, Kec. Sawah Besar, Jakarta Pusat, DKI Jakarta 10730', 'UP Bpk. Faris (0821-1922-8869)'],
        ['PT. ASIA GLOBAL SUKSESINDO (AGS)', 'JKT', 'Ruko Harco Mangga 2 Selatan Blok F-8, Kel. Mangga Dua Selatan, Kec. Sawah Besar, Jakarta Pusat, DKI Jakarta 10730', 'UP Yuni - Adm Service AGS (0817-1777-7002)'],
        ['Q-CHOX COMPUTER (Q CHOCK)', 'OTHER', 'Jl. Raya Cilauteureun KM.00, Pameungpeuk, Garut 44175 (Dekat Alun-Alun Pameungpeuk)', 'UP Andi Q Chock (0821-2222-7280)'],
        ['PAK TONI GREEN NET (GREEN NET)', 'OTHER', 'Ciawi - Cibalong (Depan Garasi AL)', 'UP Pak Toni Green Net (0812-2258-0770)'],
        ['CV. GOLDEN TECHNOLOGY INDO (FANTECH)', 'JKT', 'Ruko Sedayu Square Blok J26, RT.1/RW.12, Cengkareng Barat, Kec. Cengkareng, Kota Jakarta Barat, DKI Jakarta 11730', 'UP Ilham / Hasna (0811-1903-2716)'],
        ['ABACUS KOMPUTER (ABACUS)', 'JKT', 'Mall Mangga Dua Blok A Lantai 4 No. 51, Jl. Mangga Dua Raya, Mangga Dua Selatan, Kec. Sawah Besar, Jakarta Pusat, DKI Jakarta 10730', 'UP Bu Elis (0858-8031-2805)'],
        ['ELITE KOMPUTER (PAK AMIN)', 'BDG', 'Jl. Cagak Kp. Picung Gede No.32 RT 02/RW 05, Ds. Cipatik, Kec. Cihampelas, Bandung Barat 40562', 'UP Roni Amin Resmana (0812-2349-5909)'],
        ['PT NANO SOLUSI TECHNOLOGY / SC COMPUTER (SC KOM)', 'JKT', 'Grand Boutique Center Blok E10, Jl. Mangga Dua Raya, Ancol, Kec. Pademangan, Jakarta Utara, DKI Jakarta 14430', 'UP Adm SC Computer (0815-1013-5638)'],
        ['JETE PASKAL 23 BANDUNG (JETE)', 'BDG', '23 Paskal Shopping Center, Jl. Pasir Kaliki No.25-27 Lantai 2 Unit No.39, Kebon Jeruk, Kec. Andir, Kota Bandung, Jawa Barat 40241', 'UP Bpk. Rosi Doran (0857-3378-4023)'],
        ['DADAN KOMPUTER (Dadan Cianjur)', 'OTHER', 'Jl. Raya Siliwangi No.2 Gang Al-Falah RT.01/RW.02, Cikaret, Desa Sukamaju, Kec. Cianjur, Kab. Cianjur', 'UP Dadan Ramdani (0856-2191-507)'],
        ['ARIA COMPUTER', 'OTHER', 'Ruko Cimenteng (Samping Baso Mojok), Jl. Arwinda, Muka, Kec. Cianjur, Kab. Cianjur, Jawa Barat 43215', 'UP Mr. Panji (0856-5949-4246)'],
        ['Suyantou / Kayun', 'OTHER', 'Blanten Rejo RT 02/RW 05, Sukorejo, Kec. Musuk, Boyolali, Jawa Tengah 57361', 'UP Suyantou / Kayun (0856-0248-3047)'],
        ['PT. SURYA ARTHA KOMPUTAMA / SAK (PT. SAK)', 'JKT', 'Ruko Mangga Dua Mas D25, Jl. Mangga Dua Abdad, Sawah Besar, Jakarta Pusat, DKI Jakarta 10730', 'UP Adm PT. SAK (0877-8810-1990)'],
        ['FM KOMPUTER (FM KOMPUTER / EZPRO)', 'JKT', 'Green Sedayu Bizpark Blok DM3 No. 11G, Kalideres, Jakarta Barat 11840', 'UP Adm FM Komputer (0878-8004-5463)'],
        ['KC JAKARTA GROUP / ROG X MOG (KC)', 'JKT', 'WTC Mangga Dua Lantai UG Blok C No. 58, Jakarta Utara 14430', 'UP Adm KC (0858-8848-2918)'],
        ['Surya Kencana 30', 'JKT', 'Jl. Buncit Raya No.30, RT.4/RW.5, Kalibata, Kec. Pancoran, Jakarta Selatan, DKI Jakarta 12740', 'UP Ibu Rina (0858-6063-2297)'],
        ['PT. ASTRINDO SENOSA (SERVICE CENTER ASUS ASTRINDO)', 'BDG', 'Ruko Segitiga Mas Kosambi, Jl. Jend. A. Yani No.221-223 Blok C/13, Merdeka, Sumur Bandung, Kota Bandung, Jawa Barat 40113', 'UP Bpk. Reza (0812-2156-0599)'],
        ['TN. GANJAR LESMANA (TN. GANJAR)', 'OTHER', 'Kp. Cikoer, Kec. Cikelet, Kab. Garut', 'UP Pak Ganjar (0821-2017-8492)'],
        ['PT. Metro Pearl Indonesia', 'OTHER', 'Jl. Pramuka Raya Km 0.99 No. 18, Desa Bunder, Kec. Jatiluhur, Kab. Purwakarta', 'UP Pak Warta / Pak Dodi IT (0877-7975-5416)'],
        ['AGRES INFO TEKNOLOGI (AGRES JAKARTA)', 'JKT', 'Gudang Abdad, Jl. Mangga Dua Abdad No.44-45, RW.12, Mangga Dua Selatan, Kec. Sawah Besar, Jakarta Pusat, DKI Jakarta 10730', 'UP Tiara / Daus'],
        ['Cahaya Distribusi Nusantara (CDN)', 'JKT', 'Mall Mangga Dua Ruko Blok A10, Jakarta Pusat', 'UP Budi - Div. RMA (0855-1478-985)'],
        ['INNOVATION', 'JKT', 'Ruko Bahan Bangunan (RBB) Blok H1 No. 9, Jl. Mangga Dua Dalam, Kel. Mangga Dua Selatan, Kec. Sawah Besar, Jakarta Pusat 10730', 'UP Bpk. Elwi Widodo (0812-9898-0909)'],
        ['INTERAKSI CIPTA', 'JKT', 'Ruko Harco Mangga Dua Blok J No. 26, Sawah Besar, Jakarta Pusat', 'UP Bpk. Aris (0813-1135-5564)'],
        ['MSA KOMPUTER (MSA)', 'OTHER', 'Villa Tangerang Indah Blok BE1 No. 17, Sangiang, Kec. Periuk, Kota Tangerang, Banten (Sebelah Omah Vaksin)', 'UP Adm MSA Komputer (0813-1579-3335)']
      ];

      for (const v of vendors) {
        insertVendor.run(v[0], v[1], v[2], v[3]);
      }
    }

    // Seed Master Keluhan
    const insertKeluhan = db.prepare(`
      INSERT OR IGNORE INTO master_keluhan (teks_keluhan)
      VALUES (?)
    `);

    const keluhanList = [
      'Mati Total (No Power)',
      'Mati Total / Tidak Bisa Dicas',
      'Nyala Mati / Restart Sendiri / Suka Mati Mendadak',
      'Mati Setelah Lama Tidak Digunakan',
      'Kena Tumpahan Cairan / Korosi / Serangga',
      'Konslet / Bau Hangus / Keluar Asap',
      'Komponen Mesin Terbakar / Elko Pecah',
      'Pin Processor Bengkok / Socket Rusak',
      'Slot RAM Tidak Berfungsi / Error',
      'Settingan BIOS Reset / Baterai CMOS Habis',
      'Pas Booting Langsung Mati',
      'Klaim Garansi Servis Mesin',
      'No Display / Layar Blank Gelap',
      'Layar Pecah / Retak (Ganti LCD)',
      'Layar Bergaris / Layar Kedip',
      'Layar Vignette / Bintik / White Spot',
      'Display Intermiten / Kadang Nyala Kadang Mati',
      'Tampilan Artefak / Glitch Grafis',
      'Cek Display & Benchmark VGA',
      'Klaim Garansi Layar / LCD',
      'SSD / HDD Tidak Terdeteksi (No Disk Detected)',
      'SSD / HDD Rusak / Bad Sector / Health 0%',
      'SSD / HDD Health Turun / Sering Freeze',
      'Storage Corrupt / Tidak Bisa Dipartisi',
      'Tidak Bisa Format / Gagal Resize Partisi',
      'Kapasitas Terbaca 0 MB / Storage RAW',
      'Drive / Partisi Penuh (Cleanup Storage)',
      'Instal Ulang Windows (Standar + Aplikasi)',
      'Instal Windows 10 (Aktivasi + Software)',
      'Instal Windows 11 (Aktivasi + Software)',
      'Instal Microsoft Office & Software Tambahan',
      'Update OS / Perbaikan Gagal Windows Update',
      'BSOD (Blue Screen of Death)',
      'Gagal Booting / Masuk BIOS Terus / No Bootable Device',
      'Stuck di Automatic Repair / Bootloop',
      'Sistem Lambat / Lemot / Sering Not Responding',
      'Unlock BitLocker / Reset Password Windows',
      'Cek & Scan Virus / Malware',
      'Keyboard Error / Tombol Tidak Berfungsi / Mengetik Sendiri',
      'Ganti Keyboard Baru',
      'Touchpad / Trackpad Mati / Tidak Responsif',
      'Tombol Power Tidak Berfungsi',
      'Baterai Drop / Tidak Tahan Lama',
      'Baterai Not Charging / Dicas Tidak Nambah',
      'Ganti Baterai Baru',
      'Adaptor / Charger Lemah / Rusak',
      'Overheat / Suhu Panas & Mati Sendiri',
      'Repasta Processor & Cleaning Debu Total',
      'Kipas / Fan Berisik / Bunyi Kasar',
      'Kipas / Fan Mati / Macet (Fan Error)',
      'Speaker Mati Total / Suara Hilang',
      'Speaker Pecah / Sembrang / Noise',
      'Port Audio Jack 3.5mm Tidak Berfungsi',
      'Mikrofon / Webcam Tidak Berfungsi',
      'Wi-Fi Tidak Terdeteksi / Suka Putus (Luplep)',
      'Port LAN (Ethernet) Tidak Berfungsi / Lampu Indikator Mati',
      'Port USB Rusak / Tidak Mendeteksi Perangkat',
      'Port HDMI / Type-C Display Tidak Berfungsi',
      'Upgrade SSD (Pemasangan + Kloning / OS)',
      'Upgrade RAM / Tambah Kapasitas Memori',
      'Rakit PC Baru + Cable Management + Instal OS',
      'Ganti Power Supply (PSU)',
      'Ganti Casing PC + Manajemen Fan',
      'General Check-up Hardware & Performa',
      'General Check-up Software & Sistem'
    ];

    for (const k of keluhanList) {
      insertKeluhan.run(k);
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
