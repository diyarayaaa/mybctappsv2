import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import * as XLSX from 'xlsx';

function parseIndoDate(val: any): string | null {
  if (val === null || val === undefined || val === '') return null;

  // If already a Date object
  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d} 00:00:00`;
  }

  const str = String(val).trim();
  if (!str || str === '-' || str === 'undefined' || str === 'null') return null;

  // Excel serial number (e.g. 46272 or '46272')
  const numVal = Number(str);
  if (!isNaN(numVal) && numVal > 30000 && numVal < 70000) {
    const date = new Date(Math.round((numVal - 25569) * 86400 * 1000));
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d} 00:00:00`;
  }

  // Standard ISO format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 19).replace('T', ' ');
  }

  const monthNames: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', mei: '05', may: '05', jun: '06',
    jul: '07', agu: '08', aug: '08', sep: '09', okt: '10', oct: '10', nov: '11', des: '12', dec: '12'
  };

  // Format "2-Jun-2026", "02-Juni-2026", "10-Jul-2026", "8-Sep-2026"
  const dmyMatch = str.match(/^(\d{1,2})[-/ ]([a-zA-Z]{3,10})[-/ ](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const mStr = dmyMatch[2].slice(0, 3).toLowerCase();
    const month = monthNames[mStr] || '01';
    const year = dmyMatch[3];
    return `${year}-${month}-${day} 00:00:00`;
  }

  // Format "Thursday, 04 June 2026" or "Kamis, 04 Juli 2026"
  const longMatch = str.match(/[a-zA-Z]+,\s*(\d{1,2})\s*([a-zA-Z]+)\s*(\d{4})/);
  if (longMatch) {
    const day = longMatch[1].padStart(2, '0');
    const mStr = longMatch[2].slice(0, 3).toLowerCase();
    const month = monthNames[mStr] || '01';
    const year = longMatch[3];
    return `${year}-${month}-${day} 00:00:00`;
  }

  // Format standard Indonesia: DD/MM/YYYY or DD-MM-YYYY
  const slashMatch = str.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})/);
  if (slashMatch) {
    let p1 = parseInt(slashMatch[1], 10);
    let p2 = parseInt(slashMatch[2], 10);
    let year = slashMatch[3];
    if (year.length === 2) year = '20' + year;
    let day = p1;
    let month = p2;
    if (p1 <= 12 && p2 > 12) {
      day = p2;
      month = p1;
    }
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} 00:00:00`;
  }

  return null;
}

function cleanNum(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  const s = String(val).replace(/[^0-9.-]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function parseKelengkapan(val: any): string {
  if (!val) return JSON.stringify([]);
  const arr = String(val).split(',').map(s => s.trim()).filter(Boolean);
  return JSON.stringify(arr);
}

export async function POST(req: NextRequest) {
  try {
    let rows: any[][] = [];
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const resetBeforeImport = formData.get('resetBeforeImport') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'Tidak ada file yang diunggah. Silakan pilih file CSV atau Excel.' }, { status: 400 });
    }

    const fileName = file.name || 'data.xlsx';
    const ext = fileName.split('.').pop()?.toLowerCase();
    let detectedFormat = 'Spreadsheet';
    if (ext === 'csv') detectedFormat = 'CSV (Comma / Semicolon Delimited)';
    else if (ext === 'xlsx') detectedFormat = 'Microsoft Excel (.xlsx)';
    else if (ext === 'xls') detectedFormat = 'Microsoft Excel 97-2003 (.xls)';
    else if (ext === 'tsv') detectedFormat = 'TSV (Tab-Separated Values)';

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Read with SheetJS - auto-detects XLSX, XLS, CSV, TSV, etc.
    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });
    let maxRows = 0;
    for (const name of wb.SheetNames) {
      const s = wb.Sheets[name];
      const testRows = XLSX.utils.sheet_to_json(s, { header: 1, raw: true }) as any[][];
      if (testRows && testRows.length > maxRows) {
        maxRows = testRows.length;
        rows = testRows;
      }
    }

    if (!rows || rows.length < 2) {
      return NextResponse.json({ error: 'Data spreadsheet kosong atau tidak memiliki baris data' }, { status: 400 });
    }

    // 1. Find Header Row dynamically (scan first 15 rows for known header keywords)
    let headerRowIndex = 0;
    let maxMatchCount = 0;
    const headerKeywords = ['RMA', 'NO', 'CUSTOMER', 'CUST', 'NAMA', 'BARANG', 'TANGGAL', 'TGL', 'STATUS', 'TEKNISI', 'KELUHAN'];

    for (let r = 0; r < Math.min(rows.length, 15); r++) {
      const candidateRow = rows[r];
      if (!candidateRow || !Array.isArray(candidateRow) || candidateRow.length === 0) continue;

      let matchCount = 0;
      for (let c = 0; c < candidateRow.length; c++) {
        const cell = candidateRow[c];
        if (cell !== undefined && cell !== null) {
          const str = String(cell).trim().toUpperCase();
          if (str && headerKeywords.some(kw => str.includes(kw))) {
            matchCount++;
          }
        }
      }

      if (matchCount > maxMatchCount) {
        maxMatchCount = matchCount;
        headerRowIndex = r;
      }
    }

    const headerRow = rows[headerRowIndex].map(h => String(h || '').trim().toUpperCase());

    const findCol = (...synonyms: string[]) => {
      for (const syn of synonyms) {
        const synUpper = syn.toUpperCase();
        // Exact match first
        const exact = headerRow.findIndex(h => h === synUpper);
        if (exact !== -1) return exact;
        // Contains match
        const found = headerRow.findIndex(h => h.includes(synUpper));
        if (found !== -1) return found;
      }
      return -1;
    };

    const idxRma = findCol('NO RMA', 'NOMOR RMA', 'NO LAYANAN', 'RMA', 'NOMOR', 'NO.');
    const idxTglMasuk = findCol('TGL MASUK', 'TANGGAL MASUK', 'TGL DAFTAR', 'MASUK', 'TANGGAL');
    const idxJenis = findCol('JENIS RMA', 'JENIS LAYANAN', 'JENIS', 'TIPE');
    const idxNamaCust = findCol('NAMA CUST', 'NAMA CUSTOMER', 'NAMA PELANGGAN', 'CUSTOMER', 'NAMA');
    const idxNoHp = findCol('NO HP', 'NO TELEPON', 'NO TELP', 'HP', 'WHATSAPP', 'WA', 'TELP');
    const idxJenisBarang = findCol('JENIS BARANG', 'KATEGORI BARANG', 'KATEGORI');
    const idxNamaBarang = findCol('NAMA BARANG', 'PERANGKAT', 'TYPE BARANG', 'TIPE BARANG', 'BARANG');
    const idxSn = findCol('SERIAL NUMBER', 'SN', 'NO SERI', 'SERIAL');
    const idxKeluhan = findCol('KELUHAN', 'KERUSAKAN', 'KENDALA', 'PROBLEM');
    const idxKelengkapan = findCol('KELENGKAPAN', 'AKSESORIS');
    const idxEstimasi = findCol('ESTIMASI SELESAI', 'ESTIMASI', 'TARGET SELESAI');
    const idxTeknisi = findCol('TEKNISI', 'PIC', 'HANDLE BY');
    const idxStatus = findCol('STATUS', 'STATUS SERVIS', 'STATUS TIKET');
    const idxEstimasiBiaya = findCol('ESTIMASI BIAYA', 'BIAYA ESTIMASI', 'TARIF');
    const idxDp = findCol('DP', 'UANG MUKA');
    const idxSisa = findCol('SISA', 'SISA PEMBAYARAN');
    const idxVendor = findCol('DISTRIBUTOR', 'VENDOR', 'SUPLIER', 'DISTRI');
    const idxTglKirim = findCol('TGL KIRIM KE DISTRI', 'TGL KIRIM VENDOR', 'TGL KIRIM');
    const idxTglDatang = findCol('TGL DATANG DARI DISTRI', 'TGL DATANG VENDOR', 'TGL DATANG');
    const idxTglAmbil = findCol('TGL DIAMBIL CUST', 'TGL DIAMBIL', 'TGL AMBIL');
    const idxHasil = findCol('HASIL GARANSI', 'HASIL');
    const idxSnBaru = findCol('SN BARU');
    const idxCatatan = findCol('CATATAN', 'KETERANGAN');
    const idxBiayaAkhir = findCol('TOTAL BIAYA AKHIR', 'BIAYA AKHIR', 'TOTAL BIAYA');
    const idxNoSj = findCol('NO SURAT JALAN', 'SURAT JALAN', 'NO SJ');

    const db = getDatabase();
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // If reset before import is selected, wipe existing tickets & history clean
    if (resetBeforeImport) {
      db.exec('DELETE FROM tickets;');
      db.exec('DELETE FROM surat_jalan;');
      db.exec('DELETE FROM audit_logs;');
    }

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

    let importedCount = 0;
    let skippedCount = 0;

    db.exec('BEGIN TRANSACTION');

    try {
      for (let i = headerRowIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !Array.isArray(row) || row.length === 0) continue;

        const val = (idx: number) => {
          if (idx < 0 || idx >= row.length) return '';
          const cell = row[idx];
          return cell !== undefined && cell !== null ? String(cell).trim() : '';
        };

        const getRaw = (idx: number) => {
          if (idx < 0 || idx >= row.length) return null;
          const cell = row[idx];
          return cell !== undefined ? cell : null;
        };

        let noRma = val(idxRma !== -1 ? idxRma : 0);
        const namaCust = val(idxNamaCust) || 'Pelanggan';
        const namaBarang = val(idxNamaBarang) || '-';

        // Check if row is purely blank or header repeated
        if (!noRma && namaCust === 'Pelanggan' && namaBarang === '-') {
          skippedCount++;
          continue;
        }

        if (noRma.toUpperCase() === 'NO RMA' || noRma.toUpperCase() === 'RMA' || noRma.toUpperCase() === 'NOMOR') {
          skippedCount++;
          continue;
        }

        // If noRma is empty but there's customer or barang, generate fallback RMA
        if (!noRma) {
          noRma = `BCTRS26-${String(importedCount + 1).padStart(4, '0')}`;
        }

        const tglMasuk = parseIndoDate(getRaw(idxTglMasuk)) || now;
        const rawJenis = val(idxJenis).toUpperCase();
        const jenisLayanan = rawJenis.includes('GARANSI') ? 'GARANSI' : 'SERVICE';
        const noHp = val(idxNoHp) || '-';
        const jenisBarang = val(idxJenisBarang) || 'Other';
        const sn = val(idxSn) || '-';
        const keluhan = val(idxKeluhan) || 'Pengecekan unit';
        const kelengkapan = parseKelengkapan(val(idxKelengkapan));
        const estimasiSelesai = parseIndoDate(getRaw(idxEstimasi));

        let rawTeknisi = val(idxTeknisi).toLowerCase();
        let teknisi = 'Wandi';
        if (rawTeknisi.includes('satryo')) teknisi = 'Satryo';
        else if (rawTeknisi.includes('derida')) teknisi = 'Derida';
        else if (rawTeknisi.includes('anzar')) teknisi = 'Anzar';
        else if (rawTeknisi.includes('wandi')) teknisi = 'Wandi';
        else if (rawTeknisi.includes('admin')) teknisi = 'Admin';
        else if (rawTeknisi.includes('sales')) teknisi = 'Sales';
        else if (val(idxTeknisi)) teknisi = val(idxTeknisi);

        const rawStatus = val(idxStatus).toUpperCase();
        let status = 'PROSES SERVICE';
        if (rawStatus.includes('SELESAI') && (rawStatus.includes('BELUM') || rawStatus.includes('SIAP'))) {
          status = 'SELESAI BELUM DIAMBIL';
        } else if (rawStatus.includes('SELESAI') && rawStatus.includes('DIAMBIL')) {
          status = 'SELESAI & DIAMBIL';
        } else if (rawStatus.includes('GAGAL') || rawStatus.includes('CANCEL') || rawStatus.includes('BATAL')) {
          status = 'GAGAL SERVICE/GARANSI';
        } else if (rawStatus.includes('PENDING') || rawStatus.includes('TUNGGU') || rawStatus.includes('WAITING')) {
          status = 'PENDING SERVICE';
        } else if (rawStatus.includes('ALIH')) {
          status = 'ALIH SERVICE';
        } else if (rawStatus.includes('GARANSI') || rawStatus.includes('DISTRI') || rawStatus.includes('VENDOR')) {
          status = 'PROSES GARANSI';
        } else if (jenisLayanan === 'GARANSI') {
          status = 'PROSES GARANSI';
        }

        const estimasiBiaya = cleanNum(val(idxEstimasiBiaya));
        const dp = cleanNum(val(idxDp));
        const sisa = cleanNum(val(idxSisa)) || Math.max(0, estimasiBiaya - dp);

        const distributor = val(idxVendor) || null;
        const tglKirimVendor = parseIndoDate(getRaw(idxTglKirim));
        const tglDatangVendor = parseIndoDate(getRaw(idxTglDatang));
        const tglDiambilCust = parseIndoDate(getRaw(idxTglAmbil));
        const hasilGaransi = val(idxHasil) || null;
        const snBaru = val(idxSnBaru) || null;
        const catatan = val(idxCatatan) || null;
        const totalBiayaAkhir = cleanNum(val(idxBiayaAkhir));
        const noSuratJalan = val(idxNoSj) || null;

        const ticketId = 'imp-' + noRma.replace(/[^a-zA-Z0-9_-]/g, '_');

        insertStmt.run(
          ticketId, noRma, tglMasuk, jenisLayanan, namaCust, noHp,
          jenisBarang, namaBarang, sn, keluhan, kelengkapan, estimasiSelesai,
          teknisi, status, catatan, estimasiBiaya, dp, sisa, totalBiayaAkhir,
          noSuratJalan, distributor, tglKirimVendor, tglDatangVendor,
          hasilGaransi, snBaru, tglDiambilCust, now, now
        );

        importedCount++;
      }

      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    const totalInDb = (db.prepare('SELECT COUNT(*) as c FROM tickets').get() as any)?.c || 0;

    return NextResponse.json({
      success: true,
      detectedFormat,
      importedCount,
      skippedCount,
      totalInDb,
      message: `Berhasil mengimpor ${importedCount} data tiket dari file ${fileName} (${detectedFormat}).`
    });
  } catch (error: any) {
    console.error('API Import Error:', error);
    return NextResponse.json({ error: error.message || 'Gagal mengimpor file' }, { status: 500 });
  }
}