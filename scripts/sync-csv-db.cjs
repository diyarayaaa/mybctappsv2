const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

function parseIndoDate(val) {
  if (!val) return null;
  val = String(val).trim();
  if (!val || val === '-' || val.toUpperCase() === 'NULL') return null;

  // Already standard format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
    return val.slice(0, 19).replace('T', ' ');
  }

  const monthNames = {
    jan: '01', januari: '01',
    feb: '02', februari: '02',
    mar: '03', maret: '03',
    apr: '04', april: '04',
    mei: '05', may: '05',
    jun: '06', juni: '06',
    jul: '07', juli: '07',
    agu: '08', agustus: '08', aug: '08',
    sep: '09', september: '09',
    okt: '10', oktober: '10', oct: '10',
    nov: '11', november: '11',
    des: '12', desember: '12', dec: '12'
  };

  // Format "Kamis, 15 Oktober 2026" or "15 Oktober 2026"
  const fullMatch = val.match(/(?:[a-zA-Z]+,\s*)?(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})/);
  if (fullMatch) {
    const day = fullMatch[1].padStart(2, '0');
    const mStr = fullMatch[2].toLowerCase();
    const month = monthNames[mStr] || monthNames[mStr.slice(0, 3)] || '01';
    const year = fullMatch[3];
    return `${year}-${month}-${day} 00:00:00`;
  }

  // Handle format "2-Jun-2026", "23-Jun-2026", "14-Okt-2026"
  const dmyMatch = val.match(/^(\d{1,2})[-/ ]([a-zA-Z]{3,})[-/ ](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const mStr = dmyMatch[2].toLowerCase();
    const month = monthNames[mStr] || monthNames[mStr.slice(0, 3)] || '01';
    const year = dmyMatch[3];
    return `${year}-${month}-${day} 00:00:00`;
  }

  // Handle format "DD/MM/YYYY" e.g. "02/06/2026"
  const slashMatch = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, '0');
    const month = slashMatch[2].padStart(2, '0');
    const year = slashMatch[3];
    return `${year}-${month}-${day} 00:00:00`;
  }

  return null;
}

function cleanNum(val) {
  if (val === null || val === undefined || val === '') return 0;
  const str = String(val).replace(/[^0-9.-]/g, '');
  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
}

function parseKelengkapan(val) {
  if (!val) return JSON.stringify([]);
  const arr = String(val)
    .split(',')
    .map(s => s.trim().replace(/^"/, '').replace(/"$/, ''))
    .filter(Boolean);
  return JSON.stringify(arr);
}

function parseCsvLine(line) {
  const row = [];
  let inQuote = false;
  let curr = '';
  for (let j = 0; j < line.length; j++) {
    const ch = line[j];
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      row.push(curr.trim());
      curr = '';
    } else {
      curr += ch;
    }
  }
  row.push(curr.trim());
  return row;
}

function cleanPhone(phone) {
  if (!phone || phone === '-') return '-';
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return '-';
  if (digits.startsWith('62')) return '0' + digits.slice(2);
  if (digits.startsWith('0')) return digits;
  return '0' + digits;
}

function sync() {
  const localCsv = path.join(process.cwd(), 'data', 'database.csv');
  const desktopCsv = 'C:/Users/I\'m Not Diyarayaa/Desktop/GITHUB/DB/db_151026.csv';
  const csvPath = fs.existsSync(localCsv) ? localCsv : desktopCsv;
  console.log('📂 Membaca CSV dari:', csvPath);
  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);

  const dbPath = path.join(process.cwd(), 'data', 'bct.sqlite');
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');

  const insertStmt = db.prepare(`
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
    ON CONFLICT(nomor_layanan) DO UPDATE SET
      tanggal_masuk=excluded.tanggal_masuk,
      jenis_layanan=excluded.jenis_layanan,
      nama_customer=excluded.nama_customer,
      no_hp=excluded.no_hp,
      jenis_barang=excluded.jenis_barang,
      nama_barang=excluded.nama_barang,
      serial_number=excluded.serial_number,
      keluhan=excluded.keluhan,
      kelengkapan=excluded.kelengkapan,
      estimasi_selesai=excluded.estimasi_selesai,
      teknisi=excluded.teknisi,
      status=excluded.status,
      catatan=excluded.catatan,
      estimasi_biaya=excluded.estimasi_biaya,
      dp=excluded.dp,
      sisa=excluded.sisa,
      biaya_akhir=excluded.biaya_akhir,
      no_surat_jalan=excluded.no_surat_jalan,
      distributor_vendor=excluded.distributor_vendor,
      tgl_kirim_vendor=excluded.tgl_kirim_vendor,
      tgl_datang_vendor=excluded.tgl_datang_vendor,
      hasil_service_garansi=excluded.hasil_service_garansi,
      sn_baru=excluded.sn_baru,
      tgl_diambil_customer=excluded.tgl_diambil_customer,
      updated_at=datetime('now', 'localtime')
  `);

  db.exec('BEGIN TRANSACTION');

  let imported = 0;
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  try {
    for (let i = 1; i < lines.length; i++) {
      const row = parseCsvLine(lines[i]);
      const noRma = row[0];
      if (!noRma || !noRma.startsWith('BCTRS')) continue;

      const tglMasuk = parseIndoDate(row[1]) || now;
      const jenisLayanan = (row[2] && row[2].toUpperCase() === 'GARANSI') ? 'GARANSI' : 'SERVICE';
      const namaCust = row[3] || 'Pelanggan';
      const noHp = cleanPhone(row[4]);
      const jenisBarang = row[5] || 'Other';
      const namaBarang = row[6] || '-';
      const sn = row[7] || '-';
      const keluhan = row[8] || '-';
      const kelengkapan = parseKelengkapan(row[9]);
      const estimasiSelesai = parseIndoDate(row[10]);
      const estimasiBiaya = cleanNum(row[11]);
      const dp = cleanNum(row[12]);
      const sisa = cleanNum(row[13]);
      const teknisi = row[14] || 'Wandi';

      // Status mapping:
      // - SELESAI NUNGGU DIAMBIL -> SELESAI BELUM DIAMBIL (atau tetap SELESAI BELUM DIAMBIL)
      // - GAGAL SERVICE/RMA -> GAGAL SERVICE/GARANSI
      // - Empty -> ''
      let status = (row[15] || '').trim();
      if (status === 'SELESAI NUNGGU DIAMBIL') {
        status = 'SELESAI BELUM DIAMBIL';
      } else if (status === 'GAGAL SERVICE/RMA') {
        status = 'GAGAL SERVICE/GARANSI';
      }

      const distributor = row[16] || null;
      const tglKirimVendor = parseIndoDate(row[17]);
      const tglDatangVendor = parseIndoDate(row[18]);
      const tglDiambilCust = parseIndoDate(row[19]);
      const hasilGaransi = row[20] || null;
      const snBaru = row[21] || null;
      const catatan = row[22] || null;
      const totalBiayaAkhir = cleanNum(row[23]);
      const noSuratJalan = row[24] || null;

      const ticketId = 'imp-' + noRma;

      insertStmt.run(
        ticketId, noRma, tglMasuk, jenisLayanan, namaCust, noHp,
        jenisBarang, namaBarang, sn, keluhan, kelengkapan, estimasiSelesai,
        teknisi, status, catatan, estimasiBiaya, dp, sisa, totalBiayaAkhir,
        noSuratJalan, distributor, tglKirimVendor, tglDatangVendor,
        hasilGaransi, snBaru, tglDiambilCust, now, now
      );

      imported++;
    }

    db.exec('COMMIT');
    console.log(`✅ Berhasil menyelaraskan ${imported} tiket dengan data CSV laptop!`);
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('❌ Gagal sinkronisasi tiket:', err);
  }

  // Sekarang sinkronisasi Master Vendor
  console.log('🔄 Memperbarui Master Vendor...');
  const existingVendors = new Set(
    db.prepare('SELECT nama_vendor FROM master_vendors').all().map(v => v.nama_vendor.toUpperCase())
  );

  const insertVendor = db.prepare(`
    INSERT OR REPLACE INTO master_vendors (nama_vendor, wilayah, alamat_lengkap, kontak_wa, is_active)
    VALUES (?, ?, ?, ?, 1)
  `);

  // Jalankan seed vendors script jika master_vendors masih sedikit
  const defaultVendors = [
    // --- BDG ---
    ['CV. PRISMA MITRA BUANA', 'BDG', 'Ruko Harco Mangga 2 Selatan Blok i-47, Kel. Mangga 2 selatan, Kec. Sawah Besar, Jakarta Pusat 10730', '0821-1922-8869'],
    ['PT. ASIA GLOBAL SUKSESINDO (AGS)', 'BDG', 'Ruko Harco Mangga 2 Selatan Blok F-8, Kel. Mangga 2 selatan, Jakarta Pusat 10730', '0817-1777-7002'],
    ['ELITE KOMPUTER (PAK AMIN)', 'BDG', 'Jl. Cagak Kp. Picung Gede No.32 RT 02/RW 05, Ds. Cipatik, Kec. Cihampelas, Bandung Barat 40562', '081223495909'],
    ['JETE PASKAL 23 BANDUNG', 'BDG', 'Paskal 23 Bandung, Jl. Pasir Kaliki No.25-27 Lantai 2 Unit No.39, Kb. Jeruk, Kec. Andir, Kota Bandung 40241', '0857-3378-4023'],
    ['PT. ASTRINDO SENTOSA (ASUS SC)', 'BDG', 'Ruko Segitiga Mas Kosambi, JL. Jend A. Yani No.221-223 Bl C/13, Merdeka, Sumurbandung, Bandung 40113', '0812-2156-0599'],
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
    ['Q-CHOX COMPUTER', 'BDG', 'Jalan Raya Cilauteureun KM.00 Pameungpeuk - Garut 44175 (dekat Alun-Alun Pameungpeuk)', '0821-2222-7280'],
    ['PAK TONI GREEN NET', 'BDG', 'Ciawi - Cibalong, depan Garasi AL', '0812-2258-0770'],
    ['DADAN KOMPUTER', 'BDG', 'Jalan Raya Siliwangi No.2 Gang Al-Falah, Cikaret, Cianjur', '0856-2191-507'],
    ['ARIA COMPUTER', 'BDG', 'Ruko Cimenteng samping Baso Mojok Jalan Arwinda, Cianjur 43215', '0856-5949-4246'],
    ['TN.GANJAR LESMANA', 'BDG', 'Kp. Cikoer - Kec. Cikelet', '0821-2017-8492'],
    ['PT. METRO PEARL INDONESIA', 'BDG', 'Jl. Pramuka Raya Km 0.99 No.18, Desa Bunder, Kec. Jatiluhur, Purwakarta', '0877-7975-5416'],
    ['ATAKINDO BDG', 'BDG', 'Atakindo Bandung', '-'],
    ['GMP BDG', 'BDG', 'GMP Bandung', '-'],
    ['GIGA SECURITY BDG', 'BDG', 'Giga Security Bandung', '-'],
    ['SISTECH BANDUNG BDG', 'BDG', 'Sistech Bandung', '-'],
    ['GATE KOMP BDG', 'BDG', 'Gate Komputer Bandung', '-'],
    ['FS BDG', 'BDG', 'FS Bandung', '-'],
    ['DCS / DAYA PUTRA MANDIRI', 'BDG', 'DCS Bandung', '-'],

    // --- JKT ---
    ['AGRES INFO TEKNOLOGI (AGRES JKT)', 'JKT', 'AGRES (Gudang Abdad) Mangga Dua Abdad No.44-45, RW.12 Mangga Dua Selatan, Jakarta 10730', '0813-5566-7788'],
    ['CV. GOLDEN TECHNOLOGY INDO', 'JKT', 'Ruko Sedayu Square Blok J26, Cengkareng Barat, Jakarta Barat 11730', '0811-1903-2716'],
    ['ABACUS KOMPUTER', 'JKT', 'Mall Mangga Dua Blok A Lantai 4 No.51, Jakarta Pusat 10730', '0858-8031-2805'],
    ['PT NANO SOLUSI TECHNOLOGY (SC COMPUTER)', 'JKT', 'Grand Boutique Center Blok E10, Jl. Mangga Dua Raya, Ancol, Jakarta Utara 14430', '0815-1013-5638'],
    ['PT. SURYA ARTHA KOMPUTAMA (SAK)', 'JKT', 'Ruko Mangga 2 Mas D25, Jalan Mangga Dua Abdad, Jakarta Pusat 10730', '0877-8810-1990'],
    ['FM KOMPUTER', 'JKT', 'Green Sedayu Bizpark Blok DM3 no 11G, Kalideres, Jakarta Barat 11840', '0878-8004-5463'],
    ['KC JAKARTA GROUP (ROG X MOG)', 'JKT', 'WTC Manggadua Lantai UG Blok C No 58, Jakarta Utara 14430', '0858-8848-2918'],
    ['Surya Kencana 30', 'JKT', 'Jl. Buncit Raya No.30, Kalibata, Pancoran, Jakarta Selatan 12740', '0858-6063-2297'],
    ['AGRES JAKARTA', 'JKT', 'AGRES (Gudang Abdad) Mangga Dua Abdad No.44-45, Jakarta 10730', '0813-5566-7788'],
    ['Cahaya Distribusi Nusantara', 'JKT', 'Mangga Dua Mall Ruko Blok A10, Jakarta', '0855-147-8985'],
    ['INNOVATION', 'JKT', 'Ruko Bahan Bangunan (RBB) Blok H1 No.9 Jl. Mangga 2 Dalam, Jakarta Pusat 10730', '0812-9898-0909'],
    ['INTERAKSI CIPTA', 'JKT', 'Ruko Harco Mangga Dua Blok J no.26, Jakarta Pusat', '0813-1135-5564'],
    ['ASIA RAYA JKT', 'JKT', 'PT. Asia Raya, Jakarta', '-'],
    ['MSA JKT', 'JKT', 'MSA Jakarta', '-'],
    ['PT. ASIA GLOBAL SUKSESINDO (AGS) JKT', 'JKT', 'PT. Asia Global Suksesindo Jakarta', '-'],
    ['CV. PRISMA MITRA BUANA (JKT)', 'JKT', 'Ruko Harco Mangga 2 Selatan Blok i-47, Jakarta Pusat', '0821-1922-8869'],
    ['SC COMP JAKARTA', 'JKT', 'SC Computer Jakarta', '-'],
    ['KC KOMPUTER JKT', 'JKT', 'KC Komputer Jakarta', '-'],

    // --- OTHER ---
    ['Suyantou / Kayun', 'OTHER', 'Blanten Rejo RT 02 RW 05 Sukorejo, Kec. Musuk, Boyolali, Jateng 57361', '0856-0248-3047']
  ];

  let vCount = 0;
  for (const [nama, wil, alm, wa] of defaultVendors) {
    insertVendor.run(nama, wil, alm, wa);
    vCount++;
  }

  // Tambahkan juga vendor unik dari CSV jika belum terdaftar
  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]);
    const vName = (row[16] || '').trim();
    if (!vName) continue;
    const upper = vName.toUpperCase();
    const exists = db.prepare('SELECT id FROM master_vendors WHERE UPPER(nama_vendor) = ?').get(upper);
    if (!exists) {
      const wil = upper.includes('JKT') || upper.includes('JAKARTA') ? 'JKT' : 'BDG';
      insertVendor.run(vName, wil, `Vendor ${vName}`, '-');
      vCount++;
    }
  }

  const totalVendors = db.prepare('SELECT COUNT(*) as c FROM master_vendors').get().c;
  console.log(`✅ Master Vendor tersinkronisasi: total ${totalVendors} vendor aktif.`);

  const statsAfter = {
    totalTickets: db.prepare('SELECT COUNT(*) as c FROM tickets').get().c,
    siapAmbil: db.prepare("SELECT COUNT(*) as c FROM tickets WHERE status IN ('SELESAI BELUM DIAMBIL', 'SELESAI NUNGGU DIAMBIL')").get().c,
    selesaiDiambil: db.prepare("SELECT COUNT(*) as c FROM tickets WHERE status = 'SELESAI & DIAMBIL'").get().c,
    prosesService: db.prepare("SELECT COUNT(*) as c FROM tickets WHERE status = 'PROSES SERVICE'").get().c,
    prosesGaransi: db.prepare("SELECT COUNT(*) as c FROM tickets WHERE status = 'PROSES GARANSI'").get().c,
    pendingService: db.prepare("SELECT COUNT(*) as c FROM tickets WHERE status = 'PENDING SERVICE'").get().c,
    gagal: db.prepare("SELECT COUNT(*) as c FROM tickets WHERE status = 'GAGAL SERVICE/GARANSI'").get().c,
    garansiBelumKirim: db.prepare("SELECT COUNT(*) as c FROM tickets WHERE jenis_layanan = 'GARANSI' AND (status IS NULL OR TRIM(status) = '' OR status = 'BELUM DIKIRIM')").get().c
  };
  console.log('📊 Ringkasan Statistik Tiket Terkini:', JSON.stringify(statsAfter, null, 2));
}

sync();
