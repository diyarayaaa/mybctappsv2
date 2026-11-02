import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

function getAdminUser(request: NextRequest) {
  const userCookie = request.cookies.get('bct_auth_user');
  if (!userCookie?.value) return null;
  try {
    let cookieVal = userCookie.value;
    try {
      cookieVal = decodeURIComponent(cookieVal);
    } catch {}
    const parsed = JSON.parse(cookieVal);
    const id = parsed.id || parsed.username || '';
    const username = parsed.username || parsed.id || '';
    if (!id && !username) return null;
    const stmt = db.prepare('SELECT id, username, email, nama_lengkap, role, status FROM users WHERE id = ? OR username = ?');
    const user = stmt.get(id, username) as { id: string; username: string; email: string; nama_lengkap: string; role: string; status: string } | undefined;
    if (user && user.role === 'ADMIN' && user.status === 'active') {
      return user;
    }
  } catch (err) {
    console.error('Error verifying admin user in analytics:', err);
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const adminUser = getAdminUser(request);
    if (!adminUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'Akses ditolak. Fitur Dashboard Statistik hanya dapat diakses oleh Administrator.'
        },
        { status: 403 }
      );
    }
    const { searchParams } = new URL(request.url);
    const rawPeriod = (searchParams.get('period') || searchParams.get('range') || 'all').trim();
    const rawYear = (searchParams.get('year') || '').trim();
    const rawMonth = (searchParams.get('month') || '').trim();
    const startDate = (searchParams.get('startDate') || '').trim();
    const endDate = (searchParams.get('endDate') || '').trim();
    const service = (searchParams.get('service') || 'ALL').trim();
    const technician = (searchParams.get('technician') || 'ALL').trim();

    // Base WHERE conditions
    const conditions: string[] = ['tanggal_masuk IS NOT NULL', "tanggal_masuk != ''"];
    const params: unknown[] = [];

    if (service !== 'ALL') {
      conditions.push('jenis_layanan = ?');
      params.push(service);
    }

    if (technician !== 'ALL') {
      conditions.push('teknisi = ?');
      params.push(technician);
    }

    // Determine period filter mode
    let filterMode = 'all';
    let isDailyTrend = false;
    let periodTitle = 'Semua Waktu';
    let selectedMonth = '';
    let selectedYear = '';

    if (rawPeriod.startsWith('month:') || rawMonth) {
      filterMode = 'month';
      selectedMonth = rawPeriod.startsWith('month:') ? rawPeriod.replace('month:', '').trim() : rawMonth;
    } else if (rawPeriod.startsWith('year:') || rawYear) {
      filterMode = 'year';
      selectedYear = rawPeriod.startsWith('year:') ? rawPeriod.replace('year:', '').trim() : rawYear;
    } else {
      filterMode = rawPeriod;
    }

    // Apply period conditions
    if (filterMode === 'month' && selectedMonth) {
      conditions.push('tanggal_masuk LIKE ?');
      params.push(`${selectedMonth}%`);
      isDailyTrend = true;
      const [yr, mo] = selectedMonth.split('-');
      const moName = MONTH_NAMES[parseInt(mo, 10) - 1] || mo;
      periodTitle = `Bulan ${moName} ${yr}`;
    } else if (filterMode === 'year' && selectedYear) {
      conditions.push('tanggal_masuk LIKE ?');
      params.push(`${selectedYear}%`);
      isDailyTrend = false;
      periodTitle = `Tahun ${selectedYear}`;
    } else if (filterMode === '2026') {
      conditions.push("tanggal_masuk LIKE '2026%'");
      isDailyTrend = false;
      periodTitle = 'Tahun 2026';
    } else if (filterMode === '2027') {
      conditions.push("tanggal_masuk LIKE '2027%'");
      isDailyTrend = false;
      periodTitle = 'Tahun 2027';
    } else if (filterMode === 'today') {
      conditions.push("DATE(tanggal_masuk) = DATE('now', 'localtime')");
      isDailyTrend = true;
      periodTitle = 'Hari Ini';
    } else if (filterMode === '7d') {
      conditions.push("tanggal_masuk >= date('now', 'localtime', '-7 days')");
      isDailyTrend = true;
      periodTitle = '7 Hari Terakhir';
    } else if (filterMode === '30d') {
      conditions.push("tanggal_masuk >= date('now', 'localtime', '-30 days')");
      isDailyTrend = true;
      periodTitle = '30 Hari Terakhir';
    } else if (filterMode === '6m') {
      conditions.push("tanggal_masuk >= date('now', 'localtime', '-6 months')");
      isDailyTrend = false;
      periodTitle = '6 Bulan Terakhir';
    } else if (filterMode === '3m') {
      conditions.push("tanggal_masuk >= date('now', 'localtime', '-3 months')");
      isDailyTrend = false;
      periodTitle = '3 Bulan Terakhir';
    } else if (filterMode === 'custom' && startDate && endDate) {
      conditions.push('tanggal_masuk >= ? AND tanggal_masuk <= ?');
      params.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
      isDailyTrend = true;
      periodTitle = `${startDate} s/d ${endDate}`;
    } else {
      isDailyTrend = false;
      periodTitle = 'Semua Waktu';
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 1. KPI Summary
    const summaryStmt = db.prepare(`
      SELECT 
        COUNT(*) as total_tickets,
        SUM(CASE WHEN status LIKE '%SELESAI%' THEN 1 ELSE 0 END) as total_completed,
        SUM(CASE WHEN status LIKE '%PROSES%' OR status LIKE '%PENDING%' OR status LIKE '%ALIH%' THEN 1 ELSE 0 END) as total_in_progress,
        SUM(CASE WHEN status LIKE '%GAGAL%' THEN 1 ELSE 0 END) as total_failed,
        SUM(COALESCE(biaya_akhir, 0)) as total_revenue,
        AVG(CASE WHEN status LIKE '%SELESAI%' AND biaya_akhir > 0 THEN biaya_akhir ELSE NULL END) as avg_revenue,
        SUM(CASE WHEN jenis_layanan = 'GARANSI' AND (status LIKE '%PROSES%' OR status LIKE '%VENDOR%') THEN 1 ELSE 0 END) as active_warranty_rma,
        SUM(CASE WHEN jenis_layanan = 'SERVICE' AND (status LIKE '%PROSES%' OR status LIKE '%PENDING%') THEN 1 ELSE 0 END) as active_regular_service
      FROM tickets
      ${whereClause}
    `);
    const summary = summaryStmt.get(...params) as Record<string, number | null>;

    const totalTickets = Number(summary.total_tickets || 0);
    const totalCompleted = Number(summary.total_completed || 0);
    const totalInProgress = Number(summary.total_in_progress || 0);
    const totalFailed = Number(summary.total_failed || 0);
    const totalRevenue = Number(summary.total_revenue || 0);
    const avgRevenue = Math.round(Number(summary.avg_revenue || 0));
    const activeWarrantyRMA = Number(summary.active_warranty_rma || 0);
    const activeRegularService = Number(summary.active_regular_service || 0);

    const completionRate = totalTickets > 0 ? Number(((totalCompleted / totalTickets) * 100).toFixed(1)) : 0;
    const successRate = (totalCompleted + totalFailed) > 0 
      ? Number(((totalCompleted / (totalCompleted + totalFailed)) * 100).toFixed(1)) 
      : 100;

    // 2. Trend Data (Daily if single month / 7d / today / custom, Monthly if year / multi-month)
    let monthlyTrend = [];

    if (isDailyTrend) {
      const dailyStmt = db.prepare(`
        SELECT 
          substr(tanggal_masuk, 1, 10) as time_key,
          COUNT(*) as masuk,
          SUM(CASE WHEN status LIKE '%SELESAI%' THEN 1 ELSE 0 END) as selesai,
          SUM(CASE WHEN status LIKE '%GAGAL%' THEN 1 ELSE 0 END) as gagal,
          SUM(COALESCE(biaya_akhir, 0)) as omset
        FROM tickets
        ${whereClause}
        GROUP BY time_key
        ORDER BY time_key ASC
      `);
      const rawDaily = dailyStmt.all(...params) as Array<{
        time_key: string;
        masuk: number;
        selesai: number;
        gagal: number;
        omset: number;
      }>;

      monthlyTrend = rawDaily.map((d, idx, arr) => {
        const [year, month, day] = d.time_key.split('-');
        const mIdx = parseInt(month, 10) - 1;
        const monthShort = MONTH_SHORT[mIdx] || month;
        const dayNum = parseInt(day, 10);
        const label = `${dayNum} ${MONTH_NAMES[mIdx] || month} ${year}`;
        const shortLabel = `${dayNum} ${monthShort}`;

        let growth = 0;
        if (idx > 0 && arr[idx - 1].masuk > 0) {
          growth = Number((((d.masuk - arr[idx - 1].masuk) / arr[idx - 1].masuk) * 100).toFixed(1));
        }

        const rate = d.masuk > 0 ? Number(((d.selesai / d.masuk) * 100).toFixed(1)) : 0;

        return {
          month: d.time_key,
          label,
          shortLabel,
          year,
          masuk: d.masuk,
          selesai: d.selesai,
          gagal: d.gagal,
          omset: d.omset,
          growth,
          successRate: rate
        };
      });
    } else {
      const monthlyStmt = db.prepare(`
        SELECT 
          substr(tanggal_masuk, 1, 7) as month_key,
          COUNT(*) as masuk,
          SUM(CASE WHEN status LIKE '%SELESAI%' THEN 1 ELSE 0 END) as selesai,
          SUM(CASE WHEN status LIKE '%GAGAL%' THEN 1 ELSE 0 END) as gagal,
          SUM(COALESCE(biaya_akhir, 0)) as omset
        FROM tickets
        ${whereClause}
        GROUP BY month_key
        ORDER BY month_key ASC
      `);
      const rawMonthly = monthlyStmt.all(...params) as Array<{
        month_key: string;
        masuk: number;
        selesai: number;
        gagal: number;
        omset: number;
      }>;

      monthlyTrend = rawMonthly.map((m, idx, arr) => {
        const [year, month] = m.month_key.split('-');
        const mIdx = parseInt(month, 10) - 1;
        const monthName = MONTH_NAMES[mIdx] || month;
        const shortName = MONTH_SHORT[mIdx] || month;
        const label = `${monthName} ${year}`;
        const shortLabel = shortName;

        let growth = 0;
        if (idx > 0 && arr[idx - 1].masuk > 0) {
          growth = Number((((m.masuk - arr[idx - 1].masuk) / arr[idx - 1].masuk) * 100).toFixed(1));
        }

        const rate = m.masuk > 0 ? Number(((m.selesai / m.masuk) * 100).toFixed(1)) : 0;

        return {
          month: m.month_key,
          label,
          shortLabel,
          year,
          masuk: m.masuk,
          selesai: m.selesai,
          gagal: m.gagal,
          omset: m.omset,
          growth,
          successRate: rate
        };
      });
    }

    // 3. Status Breakdown
    const statusStmt = db.prepare(`
      SELECT 
        status, 
        COUNT(*) as count 
      FROM tickets 
      ${whereClause}
      GROUP BY status 
      ORDER BY count DESC
    `);
    const rawStatus = statusStmt.all(...params) as Array<{ status: string; count: number }>;

    const STATUS_COLORS: Record<string, { bg: string; fill: string; border: string }> = {
      'SELESAI & DIAMBIL': { bg: 'bg-emerald-500', fill: '#10b981', border: 'border-emerald-500' },
      'SELESAI BELUM DIAMBIL': { bg: 'bg-teal-500', fill: '#14b8a6', border: 'border-teal-500' },
      'PROSES SERVICE': { bg: 'bg-blue-500', fill: '#3b82f6', border: 'border-blue-500' },
      'PROSES GARANSI': { bg: 'bg-amber-500', fill: '#f59e0b', border: 'border-amber-500' },
      'ALIH SERVICE': { bg: 'bg-indigo-500', fill: '#6366f1', border: 'border-indigo-500' },
      'PENDING SERVICE': { bg: 'bg-purple-500', fill: '#a855f7', border: 'border-purple-500' },
      'GAGAL SERVICE/GARANSI': { bg: 'bg-rose-500', fill: '#f43f5e', border: 'border-rose-500' },
    };

    const statusBreakdown = rawStatus.map(s => {
      const color = STATUS_COLORS[s.status] || { bg: 'bg-slate-400', fill: '#94a3b8', border: 'border-slate-400' };
      const percentage = totalTickets > 0 ? Number(((s.count / totalTickets) * 100).toFixed(1)) : 0;
      return {
        status: s.status || 'BELUM DITENTUKAN',
        count: s.count,
        percentage,
        colorBg: color.bg,
        colorFill: color.fill,
        colorBorder: color.border
      };
    });

    // 4. Category / Jenis Barang Breakdown
    const categoryStmt = db.prepare(`
      SELECT 
        COALESCE(NULLIF(TRIM(jenis_barang), ''), 'OTHER') as category,
        COUNT(*) as count,
        SUM(CASE WHEN jenis_layanan = 'SERVICE' THEN 1 ELSE 0 END) as service_count,
        SUM(CASE WHEN jenis_layanan = 'GARANSI' THEN 1 ELSE 0 END) as garansi_count,
        SUM(CASE WHEN status LIKE '%SELESAI%' THEN 1 ELSE 0 END) as selesai_count,
        SUM(COALESCE(biaya_akhir, 0)) as omset
      FROM tickets
      ${whereClause}
      GROUP BY category
      ORDER BY count DESC
    `);
    const rawCategories = categoryStmt.all(...params) as Array<{
      category: string;
      count: number;
      service_count: number;
      garansi_count: number;
      selesai_count: number;
      omset: number;
    }>;

    const categoryBreakdown = rawCategories.map(c => ({
      category: c.category,
      count: c.count,
      percentage: totalTickets > 0 ? Number(((c.count / totalTickets) * 100).toFixed(1)) : 0,
      serviceCount: c.service_count,
      garansiCount: c.garansi_count,
      selesaiCount: c.selesai_count,
      omset: c.omset
    }));

    // 5. Technician Performance Table & Bar Breakdown
    const technicianStmt = db.prepare(`
      SELECT 
        COALESCE(NULLIF(TRIM(teknisi), ''), 'Belum Ditugaskan') as name,
        COUNT(*) as total,
        SUM(CASE WHEN status LIKE '%SELESAI%' THEN 1 ELSE 0 END) as selesai,
        SUM(CASE WHEN status LIKE '%PROSES%' OR status LIKE '%PENDING%' OR status LIKE '%ALIH%' THEN 1 ELSE 0 END) as proses,
        SUM(CASE WHEN status LIKE '%GAGAL%' THEN 1 ELSE 0 END) as gagal,
        SUM(COALESCE(biaya_akhir, 0)) as omset,
        AVG(CASE WHEN status LIKE '%SELESAI%' AND biaya_akhir > 0 THEN biaya_akhir ELSE NULL END) as avg_biaya
      FROM tickets
      ${whereClause}
      GROUP BY name
      ORDER BY total DESC
    `);
    const rawTechnicians = technicianStmt.all(...params) as Array<{
      name: string;
      total: number;
      selesai: number;
      proses: number;
      gagal: number;
      omset: number;
      avg_biaya: number | null;
    }>;

    const technicianStats = rawTechnicians.map((t, idx) => {
      const completed = t.selesai;
      const rate = t.total > 0 ? Number(((completed / t.total) * 100).toFixed(1)) : 0;
      return {
        rank: idx + 1,
        name: t.name,
        total: t.total,
        selesai: t.selesai,
        proses: t.proses,
        gagal: t.gagal,
        omset: t.omset,
        avgBiaya: Math.round(Number(t.avg_biaya || 0)),
        successRate: rate
      };
    });

    // 6. Vendor RMA Breakdown
    const vendorStmt = db.prepare(`
      SELECT 
        COALESCE(NULLIF(TRIM(distributor_vendor), ''), 'Lainnya / Belum Tercatat') as vendor,
        COUNT(*) as total,
        SUM(CASE WHEN status LIKE '%SELESAI%' THEN 1 ELSE 0 END) as selesai,
        SUM(CASE WHEN status LIKE '%PROSES%' OR status LIKE '%VENDOR%' THEN 1 ELSE 0 END) as proses,
        SUM(CASE WHEN status LIKE '%GAGAL%' THEN 1 ELSE 0 END) as gagal
      FROM tickets
      ${whereClause ? `${whereClause} AND jenis_layanan = 'GARANSI'` : "WHERE jenis_layanan = 'GARANSI'"}
        AND distributor_vendor IS NOT NULL 
        AND TRIM(distributor_vendor) != ''
      GROUP BY vendor
      ORDER BY total DESC
      LIMIT 12
    `);
    const rawVendors = vendorStmt.all(...params) as Array<{
      vendor: string;
      total: number;
      selesai: number;
      proses: number;
      gagal: number;
    }>;

    const vendorStats = rawVendors.map(v => ({
      vendor: v.vendor,
      total: v.total,
      selesai: v.selesai,
      proses: v.proses,
      gagal: v.gagal,
      successRate: v.total > 0 ? Number(((v.selesai / v.total) * 100).toFixed(1)) : 0
    }));

    // 7. Service Type Ratio
    const serviceTypeStmt = db.prepare(`
      SELECT 
        jenis_layanan, 
        COUNT(*) as count 
      FROM tickets 
      ${whereClause}
      GROUP BY jenis_layanan
    `);
    const rawServiceType = serviceTypeStmt.all(...params) as Array<{ jenis_layanan: string; count: number }>;
    const serviceCount = rawServiceType.find(s => s.jenis_layanan === 'SERVICE')?.count || 0;
    const garansiCount = rawServiceType.find(s => s.jenis_layanan === 'GARANSI')?.count || 0;

    // 8. Available Periods Metadata for Frontend Select / Listbox
    const availableMonthsRaw = db.prepare(`
      SELECT DISTINCT substr(tanggal_masuk, 1, 7) as bln 
      FROM tickets 
      WHERE tanggal_masuk IS NOT NULL AND tanggal_masuk != ''
      ORDER BY bln DESC
    `).all() as Array<{ bln: string }>;

    const availableMonths = availableMonthsRaw.map(r => {
      const [yr, mo] = r.bln.split('-');
      const name = MONTH_NAMES[parseInt(mo, 10) - 1] || mo;
      return { key: r.bln, label: `${name} ${yr}`, year: yr, monthNum: mo };
    });

    const availableYearsRaw = db.prepare(`
      SELECT DISTINCT substr(tanggal_masuk, 1, 4) as thn 
      FROM tickets 
      WHERE tanggal_masuk IS NOT NULL AND tanggal_masuk != ''
      ORDER BY thn DESC
    `).all() as Array<{ thn: string }>;

    const dbYears = availableYearsRaw.map(r => r.thn);
    const availableYears = Array.from(new Set(['2027', '2026', ...dbYears])).sort().reverse();

    return NextResponse.json({
      success: true,
      data: {
        periodInfo: {
          title: periodTitle,
          isDaily: isDailyTrend,
          mode: filterMode,
          selectedMonth,
          selectedYear
        },
        availableMonths,
        availableYears,
        summary: {
          totalTickets,
          totalCompleted,
          totalInProgress,
          totalFailed,
          completionRate,
          successRate,
          totalRevenue,
          avgRevenue,
          activeWarrantyRMA,
          activeRegularService,
          serviceCount,
          garansiCount
        },
        monthlyTrend,
        statusBreakdown,
        categoryBreakdown,
        technicianStats,
        vendorStats
      }
    });
  } catch (error) {
    console.error('[analytics_api] Error querying analytics data:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data statistik analitik.' },
      { status: 500 }
    );
  }
}
