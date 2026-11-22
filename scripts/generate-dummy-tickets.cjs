const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'bct.sqlite');
const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON;');

// Vendors from DB
const vendorsRows = db.prepare('SELECT nama_vendor FROM master_vendors').all();
const VENDORS = vendorsRows.length > 0
  ? vendorsRows.map(v => v.nama_vendor)
  : ['CV. PRISMA MITRA BUANA', 'PT. ASIA GLOBAL SUKSESINDO (AGS)', 'ELITE KOMPUTER (PAK AMIN)', 'ATAKINDO BDG', 'AGRES ID BDG', 'DTG BDG', 'CCK BDG', 'NOVUS BDG'];

// Keluhan list from DB
const keluhanRows = db.prepare('SELECT teks_keluhan FROM master_keluhan').all();
const KELUHAN_LIST = keluhanRows.length > 0
  ? keluhanRows.map(k => k.teks_keluhan)
  : [
      'Mati Total (No Power / Tidak Bisa Dicas)',
      'No Display / Layar Blank Gelap / Tampilan Intermiten',
      'Instal Ulang Windows 10 / 11 (OS + Software)',
      'Keyboard Error / Tombol Tidak Berfungsi / Ganti Baru',
      'Upgrade SSD (Pemasangan + Kloning / OS)',
      'Upgrade RAM / Tambah Kapasitas Memori',
      'Overheat / Suhu Panas & Mati Sendiri',
      'Kipas / Fan Berisik / Macet (Fan Error)',
      'Sistem Lambat / Lemot / Sering Not Responding',
      'Baterai Drop / Not Charging / Ganti Baterai Baru'
    ];

const TEKNISI_LIST = ['Wandi', 'Satryo', 'Derida', 'Anzar'];

const FIRST_NAMES = [
  'Ahmad', 'Budi', 'Dedi', 'Eko', 'Fajar', 'Gunawan', 'Hendra', 'Indra', 'Joko', 'Kurniawan',
  'Lukman', 'Maulana', 'Nugroho', 'Oki', 'Pratama', 'Rizky', 'Surya', 'Teguh', 'Utomo', 'Wahyu',
  'Yusuf', 'Zainal', 'Agus', 'Bambang', 'Cecep', 'Diki', 'Enjang', 'Fitri', 'Gita', 'Hani',
  'Intan', 'Kartika', 'Lestari', 'Maya', 'Nita', 'Putri', 'Ratna', 'Sari', 'Tiara', 'Wulan'
];

const LAST_NAMES = [
  'Saputra', 'Hidayat', 'Kusuma', 'Santoso', 'Pranata', 'Wibowo', 'Siregar', 'Lubis', 'Nasution',
  'Subagyo', 'Mahendra', 'Suryadi', 'Permana', 'Gunadi', 'Wijaya', 'Kurnia', 'Setiawan', 'Ramadhan'
];

const ORGS = [
  'PT LKM GARUT', 'SMPN 1 TAROGONG', 'SMPN 2 TAROGONG', 'SMAN 1 GARUT', 'SMAN 2 GARUT',
  'PUSKESMAS MEKARWANGI', 'PUSKESMAS TAROGONG', 'KANTOR DESA JAYARAGA', 'CV BERKAH MANDIRI',
  'BANK BJB GARUT', 'DINAS PENDIDIKAN GARUT', 'KLINIK MEDIKA', 'TOKO ANUGRAH KOMPUTER'
];

const DEVICES = [
  { jenis: 'LAPTOP', models: ['ASUS Vivobook 14 A416', 'Lenovo IdeaPad Slim 3', 'Acer Aspire 3 A314', 'HP 14s-dq', 'Dell Inspiron 15', 'ASUS TUF Gaming F15', 'MacBook Air M1', 'Lenovo ThinkPad L14', 'Axioo MyBook Hype 5', 'ASUS Zenbook 14 UM425'] },
  { jenis: 'PC', models: ['PC Desktop Core i5-10400', 'PC Rakitan Ryzen 5 5600G', 'PC AIO HP 24-df', 'PC Office Core i3-10105', 'PC Gaming RTX 3060 Core i5', 'PC AIO ASUS Vivo V241', 'PC Desktop Lenovo ThinkCentre'] },
  { jenis: 'PRINTER', models: ['Epson L3110', 'Epson L3210', 'Canon Pixma G2010', 'HP Ink Tank 315', 'Brother DCP-T420W', 'Epson EcoTank L121'] },
  { jenis: 'PROJECTOR', models: ['Epson EB-X400', 'InFocus IN112x', 'BenQ MS506', 'ViewSonic PA503W'] },
  { jenis: 'SPAREPART', models: ['RAM DDR4 8GB Kingston', 'SSD NVMe 512GB ADATA', 'PSU Segotep 550W', 'Motherboard H510M Asrock', 'Casing PC Paradox Gaming', 'Fan Case Segotep 12cm RGB'] },
  { jenis: 'OTHER', models: ['Monitor LG 24MP400', 'UPS APC 650VA', 'Keyboard Mechanical Rexus', 'Speaker Simbadda CST 1000N', 'Adaptor Laptop Universal 65W'] }
];

const KELENGKAPAN_OPTS = [
  ['UNIT', 'CHARGER'],
  ['UNIT', 'CHARGER', 'TAS'],
  ['UNIT SAJA'],
  ['UNIT', 'ADAPTOR'],
  ['PROCESSOR', 'RAM', 'HDD', 'SSD', 'PSU', 'TUTUP CASING FULL'],
  ['FULLDUS'],
  ['KABEL POWER', 'DUS']
];

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRandomPhone() {
  const prefixes = ['0812', '0813', '0821', '0852', '0853', '0877', '0878', '0895', '0896', '0857'];
  const prefix = rand(prefixes);
  const suffix = String(randInt(10000000, 99999999));
  return prefix + suffix;
}

function generateRandomDate(startDaysAgo, endDaysAgo) {
  const now = new Date();
  const daysAgo = randInt(endDaysAgo, startDaysAgo);
  const d = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(randInt(9, 16)).padStart(2, '0');
  const min = String(randInt(0, 59)).padStart(2, '0');
  const ss = String(randInt(0, 59)).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

function generateDummy(count = 2000) {
  console.log(`🚀 Mulai membuat ${count} data dummy realistis...`);

  // Cari nomor urut terakhir di DB saat ini
  const rows = db.prepare("SELECT nomor_layanan FROM tickets WHERE nomor_layanan LIKE 'BCTRS26-%'").all();
  let maxSeq = 491;
  for (const r of rows) {
    const m = r.nomor_layanan.match(/^BCTRS26-(\d+)/);
    if (m) {
      const num = parseInt(m[1], 10);
      if (num > maxSeq) maxSeq = num;
    }
  }

  console.log(`📌 Nomor layanan terakhir di database: BCTRS26-${String(maxSeq).padStart(4, '0')}`);
  console.log(`📌 Nomor layanan dummy akan dibuat: BCTRS26-${String(maxSeq + 1).padStart(4, '0')} s/d BCTRS26-${String(maxSeq + count).padStart(4, '0')}`);

  const insert = db.prepare(`
    INSERT INTO tickets (
      id, nomor_layanan, tanggal_masuk, jenis_layanan, nama_customer, no_hp,
      jenis_barang, nama_barang, serial_number, keluhan, kelengkapan, estimasi_selesai,
      teknisi, status, catatan, estimasi_biaya, dp, sisa, biaya_akhir,
      no_surat_jalan, distributor_vendor, tgl_kirim_vendor, tgl_datang_vendor,
      hasil_service_garansi, sn_baru, tgl_diambil_customer, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?
    )
  `);

  const startTime = Date.now();
  db.exec('BEGIN TRANSACTION');

  try {
    for (let i = 1; i <= count; i++) {
      const seq = maxSeq + i;
      const noRma = `BCTRS26-${String(seq).padStart(4, '0')}`;
      const ticketId = `dummy-${noRma}`;

      // 70% Service, 30% Garansi
      const isGaransi = Math.random() < 0.3;
      const jenisLayanan = isGaransi ? 'GARANSI' : 'SERVICE';

      // Nama Customer
      let namaCustomer = '';
      const custType = Math.random();
      if (isGaransi && custType < 0.25) {
        namaCustomer = Math.random() < 0.7 ? 'STOCK BCT' : 'GHITP';
      } else if (custType < 0.15) {
        namaCustomer = `TN/NY. ${rand(ORGS)}`;
      } else {
        namaCustomer = `TN/NY. ${rand(FIRST_NAMES)} ${rand(LAST_NAMES)}`.toUpperCase();
      }

      const noHp = (namaCustomer === 'STOCK BCT' || namaCustomer === 'GHITP')
        ? '-'
        : generateRandomPhone();

      // Device & Keluhan
      const devCategory = rand(DEVICES);
      const jenisBarang = devCategory.jenis;
      const namaBarang = rand(devCategory.models);
      const serialNumber = Math.random() < 0.2 ? '-' : 'SN' + randInt(100000, 999999).toString() + rand(['A', 'B', 'X', 'Z']);
      const keluhan = rand(KELUHAN_LIST);
      const kelengkapan = JSON.stringify(rand(KELENGKAPAN_OPTS));

      // Teknisi
      const teknisi = isGaransi ? (Math.random() < 0.75 ? 'Wandi' : rand(TEKNISI_LIST)) : rand(TEKNISI_LIST);

      // Tanggal Masuk (sebagian hari ini, sebagian minggu ini, sebagian beberapa bulan lalu)
      let tglMasuk = '';
      const dateRoll = Math.random();
      if (dateRoll < 0.03) {
        // Hari ini (15 Okt)
        tglMasuk = '2026-10-15 ' + String(randInt(8, 17)).padStart(2, '0') + ':' + String(randInt(0, 59)).padStart(2, '0') + ':00';
      } else if (dateRoll < 0.15) {
        // Minggu ini (1-7 hari lalu)
        tglMasuk = generateRandomDate(7, 1);
      } else {
        // 8 s/d 120 hari lalu
        tglMasuk = generateRandomDate(120, 8);
      }

      // Status Distribusi Realistis
      let status = 'PROSES SERVICE';
      let estimasiBiaya = 0;
      let dp = 0;
      let sisa = 0;
      let biayaAkhir = 0;
      let distributorVendor = null;
      let tglKirimVendor = null;
      let tglDatangVendor = null;
      let tglDiambilCust = null;
      let hasilGaransi = null;
      let snBaru = null;
      let noSuratJalan = null;
      let estimasiSelesai = null;
      let catatan = null;

      if (isGaransi) {
        distributorVendor = rand(VENDORS);
        const garansiRoll = Math.random();
        if (garansiRoll < 0.50) {
          // Garansi Selesai & Diambil
          status = 'SELESAI & DIAMBIL';
          tglKirimVendor = generateRandomDate(30, 20);
          tglDatangVendor = generateRandomDate(15, 7);
          tglDiambilCust = generateRandomDate(5, 1);
          hasilGaransi = Math.random() < 0.4 ? 'Diganti baru' : 'Diservice';
          if (hasilGaransi === 'Diganti baru') snBaru = 'SN-NEW-' + randInt(100000, 999999);
          noSuratJalan = `SJ-BCTR-2600${randInt(10, 99)}`;
        } else if (garansiRoll < 0.75) {
          // Masih di Vendor
          status = 'PROSES GARANSI';
          tglKirimVendor = generateRandomDate(14, 2);
          noSuratJalan = `SJ-BCTR-2600${randInt(10, 99)}`;
        } else if (garansiRoll < 0.88) {
          // Siap Ambil di Toko
          status = 'SELESAI BELUM DIAMBIL';
          tglKirimVendor = generateRandomDate(25, 10);
          tglDatangVendor = generateRandomDate(5, 1);
          hasilGaransi = 'Diservice';
          noSuratJalan = `SJ-BCTR-2600${randInt(10, 99)}`;
        } else if (garansiRoll < 0.94) {
          // Garansi Belum Dikirim (status kosong)
          status = '';
          noSuratJalan = null;
        } else {
          // Gagal
          status = 'GAGAL SERVICE/GARANSI';
          tglKirimVendor = generateRandomDate(20, 10);
          tglDatangVendor = generateRandomDate(7, 2);
          catatan = 'Ditolak vendor: indikasi korosi/segel rusak';
        }
      } else {
        // Regular Service
        const feeTiers = [50000, 75000, 100000, 150000, 200000, 250000, 350000, 450000, 600000, 850000, 1200000];
        estimasiBiaya = rand(feeTiers);
        dp = Math.random() < 0.3 ? rand([50000, 100000, 150000]) : 0;
        if (dp > estimasiBiaya) dp = estimasiBiaya;
        sisa = estimasiBiaya - dp;

        const srvRoll = Math.random();
        if (srvRoll < 0.65) {
          // Selesai & Diambil
          status = 'SELESAI & DIAMBIL';
          biayaAkhir = estimasiBiaya;
          sisa = 0;
          tglDiambilCust = generateRandomDate(20, 1);
          estimasiSelesai = tglDiambilCust;
        } else if (srvRoll < 0.78) {
          // Proses Service
          status = 'PROSES SERVICE';
          estimasiSelesai = generateRandomDate(0, -3); // 1-3 hari ke depan
        } else if (srvRoll < 0.86) {
          // Selesai Belum Diambil (Siap Ambil)
          status = 'SELESAI BELUM DIAMBIL';
          estimasiSelesai = generateRandomDate(4, 1);
          catatan = 'Unit siap diambil, sudah dikonfirmasi WA';
        } else if (srvRoll < 0.92) {
          // Pending Service
          status = 'PENDING SERVICE';
          catatan = 'Menunggu konfirmasi biaya pergantian part dari customer';
        } else if (srvRoll < 0.96) {
          // Alih Service ke Vendor
          status = 'ALIH SERVICE';
          distributorVendor = rand(VENDORS);
          tglKirimVendor = generateRandomDate(10, 2);
          noSuratJalan = `SJ-BCTR-2600${randInt(10, 99)}`;
        } else {
          // Gagal Service
          status = 'GAGAL SERVICE/GARANSI';
          catatan = 'Jalur PCB putus banyak, tidak bisa diperbaiki';
        }
      }

      insert.run(
        ticketId, noRma, tglMasuk, jenisLayanan, namaCustomer, noHp,
        jenisBarang, namaBarang, serialNumber, keluhan, kelengkapan, estimasiSelesai,
        teknisi, status, catatan, estimasiBiaya, dp, sisa, biayaAkhir,
        noSuratJalan, distributorVendor, tglKirimVendor, tglDatangVendor,
        hasilGaransi, snBaru, tglDiambilCust, tglMasuk, tglMasuk
      );
    }

    db.exec('COMMIT');
    const elapsed = Date.now() - startTime;
    console.log(`✨ Berhasil menambahkan ${count} tiket dummy ke database dalam waktu ${elapsed} ms!`);
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('❌ Terjadi kesalahan saat insert data dummy:', err);
    process.exit(1);
  }

  // Ringkasan Jumlah Tiket
  const total = db.prepare('SELECT COUNT(*) as c FROM tickets').get().c;
  const dummyCount = db.prepare("SELECT COUNT(*) as c FROM tickets WHERE id LIKE 'dummy-%'").get().c;
  const realCount = total - dummyCount;

  console.log(`--------------------------------------------------`);
  console.log(`📊 STATUS DATABASE SAAT INI:`);
  console.log(`   • Tiket Asli (Real):  ${realCount} unit`);
  console.log(`   • Tiket Dummy Baru:   ${dummyCount} unit`);
  console.log(`   • TOTAL DATA AKTIF:   ${total} unit`);
  console.log(`--------------------------------------------------`);

  // Ringkasan per Status
  const statusStats = db.prepare(`
    SELECT 
      CASE 
        WHEN status IS NULL OR TRIM(status) = '' THEN '(KOSONG / BELUM DIKIRIM)'
        ELSE status 
      END as st, 
      COUNT(*) as c 
    FROM tickets 
    GROUP BY st 
    ORDER BY c DESC
  `).all();

  console.log(`📈 DISTRIBUSI STATUS DI SELURUH TIKET (${total} TIKET):`);
  statusStats.forEach(s => {
    console.log(`   - ${s.st.padEnd(30, ' ')}: ${s.c} unit`);
  });
}

generateDummy(2000);
