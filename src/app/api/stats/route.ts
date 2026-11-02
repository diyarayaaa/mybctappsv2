import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { DashboardStats } from '@/types';
import { checkAndRunDailyAutoBackup } from '@/lib/backup';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Non-blocking daily auto-backup check
    checkAndRunDailyAutoBackup().catch((err) =>
      console.error('[stats] Auto-backup background check failed:', err)
    );

    // 1. BARANG MASUK HARI INI: IN(JENIS RMA, {"SERVICE", "GARANSI"}) AND TGL MASUK = TODAY()
    const q1 = db.prepare(`
      SELECT COUNT(*) as count FROM tickets 
      WHERE jenis_layanan IN ('SERVICE', 'GARANSI') 
        AND DATE(tanggal_masuk) = DATE('now', 'localtime')
    `).get() as { count: number };

    // 2. SERVICE ON PROGRES: JENIS RMA = "SERVICE" AND (ISBLANK(STATUS) OR STATUS = "PROSES SERVICE" OR STATUS = "PENDING SERVICE")
    const q2 = db.prepare(`
      SELECT COUNT(*) as count FROM tickets 
      WHERE jenis_layanan = 'SERVICE' 
        AND (status IS NULL OR TRIM(status) = '' OR status = 'PROSES SERVICE' OR status = 'PENDING SERVICE')
    `).get() as { count: number };

    // 3. BARANG DI VENDOR: (GARANSI AND PROSES GARANSI) OR (SERVICE AND ALIH SERVICE)
    const q3 = db.prepare(`
      SELECT COUNT(*) as count FROM tickets 
      WHERE (jenis_layanan = 'GARANSI' AND status = 'PROSES GARANSI')
         OR (jenis_layanan = 'SERVICE' AND status = 'ALIH SERVICE')
    `).get() as { count: number };

    // 4. GARANSI MASUK MINGGU INI: JENIS RMA = "GARANSI" AND WEEKNUM(TGL MASUK) = WEEKNUM(TODAY()) AND YEAR(TGL MASUK) = YEAR(TODAY())
    const q4 = db.prepare(`
      SELECT COUNT(*) as count FROM tickets 
      WHERE jenis_layanan = 'GARANSI' 
        AND strftime('%W', tanggal_masuk) = strftime('%W', 'now', 'localtime') 
        AND strftime('%Y', tanggal_masuk) = strftime('%Y', 'now', 'localtime')
    `).get() as { count: number };

    // 5. GARANSI BELUM DIKIRIM: JENIS RMA = "GARANSI" AND ISBLANK(STATUS)
    const q5 = db.prepare(`
      SELECT COUNT(*) as count FROM tickets 
      WHERE jenis_layanan = 'GARANSI' 
        AND (status IS NULL OR TRIM(status) = '' OR status = 'BELUM DIKIRIM' OR status = 'PROSES MASUK')
    `).get() as { count: number };

    // 6. BARANG BELUM DIAMBIL: STATUS = "SELESAI NUNGGU DIAMBIL"
    const q6 = db.prepare(`
      SELECT COUNT(*) as count FROM tickets 
      WHERE status = 'SELESAI NUNGGU DIAMBIL' 
         OR status = 'SELESAI BELUM DIAMBIL' 
         OR status LIKE '%NUNGGU DIAMBIL%'
    `).get() as { count: number };

    // 7. GARANSI SELESAI: JENIS RMA = "GARANSI" AND STATUS = "SELESAI & DIAMBIL"
    const q7 = db.prepare(`
      SELECT COUNT(*) as count FROM tickets 
      WHERE jenis_layanan = 'GARANSI' 
        AND status = 'SELESAI & DIAMBIL'
    `).get() as { count: number };

    // 8. SERVICE SELESAI: JENIS RMA = "SERVICE" AND STATUS = "SELESAI & DIAMBIL"
    const q8 = db.prepare(`
      SELECT COUNT(*) as count FROM tickets 
      WHERE jenis_layanan = 'SERVICE' 
        AND status = 'SELESAI & DIAMBIL'
    `).get() as { count: number };

    // Total Tiket
    const totalStmt = db.prepare(`SELECT COUNT(*) as count FROM tickets`);
    const totalTiket = (totalStmt.get() as { count: number }).count;

    const stats: DashboardStats = {
      barangMasukHariIni: q1.count,
      serviceOnProgress: q2.count,
      barangDiVendor: q3.count,
      garansiMasukMingguIni: q4.count,
      garansiBelumDikirim: q5.count,
      barangBelumDiambil: q6.count,
      garansiSelesai: q7.count,
      serviceSelesai: q8.count,
      totalTiket,
      // Backward compatibility
      totalServiceAktif: q2.count,
      pendingService: 0,
      garansiDiVendor: q3.count,
      stokTokoReady: 0,
      serviceSelesaiBulanIni: q8.count
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}
