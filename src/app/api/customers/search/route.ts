import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const isTop = searchParams.get('top') === 'true';
    const isHistory = searchParams.get('history') === 'true';
    const nama = searchParams.get('nama');
    const noHp = searchParams.get('no_hp');

    // 1. History mode: fetch all past tickets for a specific customer
    if (isHistory && (nama || noHp)) {
      const cleanNama = (nama || '').trim().toLowerCase();
      const cleanHp = (noHp || '').trim();

      let historyQuery = `
        SELECT 
          id,
          nomor_layanan,
          tanggal_masuk,
          jenis_layanan,
          jenis_barang,
          nama_barang,
          keluhan,
          status,
          estimasi_biaya,
          biaya_akhir,
          teknisi,
          catatan
        FROM tickets
        WHERE 1=1
      `;
      const params: unknown[] = [];

      if (cleanNama && cleanHp && cleanHp !== '-') {
        historyQuery += ` AND (LOWER(TRIM(nama_customer)) = ? OR no_hp = ?)`;
        params.push(cleanNama, cleanHp);
      } else if (cleanNama) {
        historyQuery += ` AND LOWER(TRIM(nama_customer)) = ?`;
        params.push(cleanNama);
      } else if (cleanHp && cleanHp !== '-') {
        historyQuery += ` AND no_hp = ?`;
        params.push(cleanHp);
      }

      historyQuery += ` ORDER BY tanggal_masuk DESC, id DESC`;

      const tickets = db.prepare(historyQuery).all(...params);

      return NextResponse.json({
        success: true,
        customer: {
          nama: nama || '',
          no_hp: noHp || '',
        },
        total: tickets.length,
        tickets,
      });
    }

    // 2. Search mode or Top customers mode
    const rawSearch = (q || '').trim();
    // Normalize search query: remove "tn/ny." or "tn/ny" prefix if user typed it
    const searchParamVal = rawSearch.replace(/^tn\/ny\.?\s*/i, '').trim();

    if (!isTop && (!searchParamVal || searchParamVal.length < 2)) {
      return NextResponse.json({ customers: [] });
    }

    let sql = `
      SELECT 
        TRIM(nama_customer) as nama_customer,
        (
          SELECT TRIM(no_hp) 
          FROM tickets t3 
          WHERE LOWER(TRIM(t3.nama_customer)) = LOWER(TRIM(t1.nama_customer)) 
            AND no_hp IS NOT NULL AND TRIM(no_hp) != '' AND TRIM(no_hp) != '-'
          ORDER BY tanggal_masuk DESC, id DESC 
          LIMIT 1
        ) as no_hp,
        COUNT(*) as total_servis,
        MAX(tanggal_masuk) as servis_terakhir,
        (
          SELECT nama_barang 
          FROM tickets t2 
          WHERE LOWER(TRIM(t2.nama_customer)) = LOWER(TRIM(t1.nama_customer))
          ORDER BY tanggal_masuk DESC, id DESC 
          LIMIT 1
        ) as barang_terakhir,
        (
          SELECT jenis_barang 
          FROM tickets t2 
          WHERE LOWER(TRIM(t2.nama_customer)) = LOWER(TRIM(t1.nama_customer))
          ORDER BY tanggal_masuk DESC, id DESC 
          LIMIT 1
        ) as jenis_barang_terakhir
      FROM tickets t1
      WHERE nama_customer IS NOT NULL 
        AND TRIM(nama_customer) != ''
        AND LOWER(TRIM(nama_customer)) != 'tn/ny.'
        AND LOWER(TRIM(nama_customer)) != 'tn/ny. '
    `;

    const sqlParams: unknown[] = [];

    if (!isTop && searchParamVal) {
      const wild = `%${searchParamVal.toLowerCase()}%`;
      // Also match full raw search in case user searches "08..." or specific format
      const rawWild = `%${rawSearch.toLowerCase()}%`;
      sql += ` AND (LOWER(nama_customer) LIKE ? OR no_hp LIKE ? OR LOWER(nama_customer) LIKE ?)`;
      sqlParams.push(wild, rawWild, rawWild);
    }

    sql += `
      GROUP BY LOWER(TRIM(nama_customer))
      ORDER BY total_servis DESC, servis_terakhir DESC
      LIMIT ?
    `;
    sqlParams.push(isTop ? 20 : 15);

    const customers = db.prepare(sql).all(...sqlParams);

    return NextResponse.json({
      success: true,
      customers: customers.map((c: any) => ({
        nama_customer: c.nama_customer,
        no_hp: c.no_hp || '',
        total_servis: Number(c.total_servis || 1),
        servis_terakhir: c.servis_terakhir,
        barang_terakhir: c.barang_terakhir || '',
        jenis_barang_terakhir: c.jenis_barang_terakhir || '',
      })),
    });
  } catch (error) {
    console.error('Customer search error:', error);
    return NextResponse.json(
      { error: 'Failed to search customers', details: String(error) },
      { status: 500 }
    );
  }
}
