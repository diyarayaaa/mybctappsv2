import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import * as XLSX from 'xlsx';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const resetBeforeImport = formData.get('resetBeforeImport') === 'true';

    if (!file) {
      return NextResponse.json(
        { error: 'Tidak ada file yang diunggah. Silakan pilih file CSV atau Excel.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });
    let rows: any[][] = [];
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
      return NextResponse.json(
        { error: 'File kosong atau tidak memiliki baris data vendor.' },
        { status: 400 }
      );
    }

    // 1. Cari baris header secara fleksibel
    let headerRowIndex = 0;
    const headerKeywords = ['VENDOR', 'DISTRIBUTOR', 'NAMA', 'WILAYAH', 'ALAMAT', 'KONTAK', 'WA', 'TELP', 'PIC'];
    let maxMatch = 0;

    for (let r = 0; r < Math.min(rows.length, 10); r++) {
      const candidate = rows[r];
      if (!Array.isArray(candidate)) continue;
      let count = 0;
      for (const cell of candidate) {
        const str = String(cell || '').toUpperCase();
        if (headerKeywords.some(kw => str.includes(kw))) count++;
      }
      if (count > maxMatch) {
        maxMatch = count;
        headerRowIndex = r;
      }
    }

    const header = rows[headerRowIndex].map(h => String(h || '').trim().toUpperCase());

    // Petakan indeks kolom
    let idxNama = -1;
    let idxWilayah = -1;
    let idxAlamat = -1;
    let idxKontak = -1;

    header.forEach((h, i) => {
      if (idxNama === -1 && (h.includes('NAMA VENDOR') || h.includes('VENDOR') || h.includes('DISTRIBUTOR') || h === 'NAMA')) {
        idxNama = i;
      } else if (idxWilayah === -1 && (h.includes('WILAYAH') || h.includes('KOTA') || h.includes('AREA') || h.includes('REGION'))) {
        idxWilayah = i;
      } else if (idxAlamat === -1 && (h.includes('ALAMAT') || h.includes('LOKASI') || h.includes('ADDRESS'))) {
        idxAlamat = i;
      } else if (idxKontak === -1 && (h.includes('KONTAK') || h.includes('WA') || h.includes('TELP') || h.includes('HP') || h.includes('PIC') || h.includes('TELEPON'))) {
        idxKontak = i;
      }
    });

    if (idxNama === -1) {
      idxNama = 0; // Fallback ke kolom pertama
    }

    const db = getDatabase();

    if (resetBeforeImport) {
      db.exec('DELETE FROM master_vendors;');
    }

    const insertStmt = db.prepare(`
      INSERT INTO master_vendors (nama_vendor, wilayah, alamat_lengkap, kontak_wa, is_active)
      VALUES (?, ?, ?, ?, 1)
      ON CONFLICT(nama_vendor) DO UPDATE SET
        wilayah = excluded.wilayah,
        alamat_lengkap = excluded.alamat_lengkap,
        kontak_wa = excluded.kontak_wa,
        is_active = 1
    `);

    let importedCount = 0;
    let skippedCount = 0;

    for (let r = headerRowIndex + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || !Array.isArray(row)) continue;

      const rawNama = String(row[idxNama] || '').trim();
      if (!rawNama || rawNama === '-' || rawNama.toLowerCase() === 'undefined') {
        skippedCount++;
        continue;
      }

      let rawWilayah = idxWilayah !== -1 ? String(row[idxWilayah] || '').trim().toUpperCase() : 'OTHER';
      if (rawWilayah.includes('JKT') || rawWilayah.includes('JAKARTA')) {
        rawWilayah = 'JKT';
      } else if (rawWilayah.includes('BDG') || rawWilayah.includes('BANDUNG')) {
        rawWilayah = 'BDG';
      } else if (!rawWilayah || rawWilayah === '-') {
        rawWilayah = 'OTHER';
      }

      const alamat = idxAlamat !== -1 ? String(row[idxAlamat] || '').trim() : '';
      const kontak = idxKontak !== -1 ? String(row[idxKontak] || '').trim() : '';

      try {
        insertStmt.run(rawNama, rawWilayah, alamat || null, kontak || null);
        importedCount++;
      } catch {
        skippedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil mengimpor ${importedCount} data vendor/distributor.`,
      importedCount,
      skippedCount
    });
  } catch (err: unknown) {
    console.error('Import vendors error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Gagal memproses import file vendor' },
      { status: 500 }
    );
  }
}
