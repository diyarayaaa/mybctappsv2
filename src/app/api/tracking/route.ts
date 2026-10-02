import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Ticket, AuditLog } from '@/types';

export const dynamic = 'force-dynamic';

function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return '-';
  const clean = phone.replace(/[^0-9+]/g, '');
  if (clean.length < 8) return '****';
  const start = clean.slice(0, 4);
  const end = clean.slice(-4);
  return `${start}-****-${end}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const receiptNo = (
      searchParams.get('no') ||
      searchParams.get('nomor') ||
      searchParams.get('nomor_layanan') ||
      searchParams.get('q') ||
      ''
    ).trim();

    if (!receiptNo) {
      return NextResponse.json(
        { error: 'Nomor tanda terima wajib diisi.' },
        { status: 400 }
      );
    }

    // 1. Query ticket by exact nomor_layanan or id (case insensitive)
    const stmt = db.prepare(`
      SELECT * FROM tickets 
      WHERE LOWER(TRIM(nomor_layanan)) = LOWER(?) 
         OR LOWER(TRIM(id)) = LOWER(?)
      LIMIT 1
    `);
    let rawTicket = stmt.get(receiptNo, receiptNo) as Record<string, unknown> | undefined;

    // 2. Fallback: match without dashes/spaces (e.g. BCTRS260344 vs BCTRS26-0344)
    if (!rawTicket) {
      const strippedInput = receiptNo.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (strippedInput.length >= 4) {
        const stmtStripped = db.prepare(`
          SELECT * FROM tickets 
          WHERE REPLACE(REPLACE(LOWER(nomor_layanan), '-', ''), ' ', '') = ?
             OR REPLACE(REPLACE(LOWER(id), '-', ''), ' ', '') = ?
          LIMIT 1
        `);
        rawTicket = stmtStripped.get(strippedInput, strippedInput) as Record<string, unknown> | undefined;
      }
    }

    // 3. Fallback: if user typed numeric digits like "0344" or "344"
    if (!rawTicket) {
      const digitsOnly = receiptNo.replace(/[^0-9]/g, '');
      if (digitsOnly.length >= 3) {
        const stmtDigits = db.prepare(`
          SELECT * FROM tickets 
          WHERE nomor_layanan LIKE ? 
          ORDER BY created_at DESC 
          LIMIT 1
        `);
        rawTicket = stmtDigits.get(`%${digitsOnly}%`) as Record<string, unknown> | undefined;
      }
    }

    if (!rawTicket) {
      return NextResponse.json(
        { 
          error: `Nomor tanda terima "${receiptNo}" tidak ditemukan. Pastikan nomor yang Anda masukkan sesuai dengan yang tercantum pada lembar nota atau pesan WhatsApp.` 
        },
        { status: 404 }
      );
    }

    const ticket: Ticket = {
      ...(rawTicket as unknown as Ticket),
      kelengkapan: typeof rawTicket.kelengkapan === 'string'
        ? JSON.parse(rawTicket.kelengkapan || '[]')
        : (rawTicket.kelengkapan || [])
    };

    // Calculate progression step (1 to 5)
    let currentStep = 1;
    let stepTitle = 'Penerimaan Unit';
    let stepDescription = 'Perangkat telah terdaftar dan menunggu proses antrean pemeriksaan.';
    let isPending = false;
    let isFailed = false;
    let isReadyForPickup = false;
    let isDoneTaken = false;

    switch (ticket.status) {
      case 'PROSES SERVICE':
        currentStep = 3;
        stepTitle = 'Proses Pengerjaan Servis';
        stepDescription = `Perangkat sedang ditangani oleh teknisi kami (${ticket.teknisi || 'Teknisi BCT'}).`;
        break;
      case 'PROSES GARANSI':
        currentStep = 3;
        stepTitle = 'Proses Klaim Garansi Vendor';
        stepDescription = ticket.distributor_vendor
          ? `Perangkat sedang dalam alur proses klaim distributor/vendor: ${ticket.distributor_vendor}.`
          : 'Perangkat sedang dalam proses klaim garansi distributor.';
        break;
      case 'ALIH SERVICE':
        currentStep = 3;
        stepTitle = 'Alih Pengerjaan Servis';
        stepDescription = 'Perangkat sedang dalam penanganan teknisi rekanan spesialis.';
        break;
      case 'PENDING SERVICE':
        currentStep = 2;
        isPending = true;
        stepTitle = 'Pengerjaan Pending';
        stepDescription = 'Menunggu konfirmasi biaya, persetujuan tindakan, atau ketersediaan suku cadang.';
        break;
      case 'SELESAI BELUM DIAMBIL':
        currentStep = 4;
        isReadyForPickup = true;
        stepTitle = 'Selesai & Siap Diambil';
        stepDescription = 'Pengerjaan telah selesai dan lolos Quality Control. Silakan datang ke toko untuk pengambilan unit.';
        break;
      case 'SELESAI & DIAMBIL':
        currentStep = 5;
        isDoneTaken = true;
        stepTitle = 'Selesai & Sudah Diambil';
        stepDescription = `Perangkat telah diserahkan kembali kepada pelanggan pada ${ticket.tgl_diambil_customer || 'waktu sebelumnya'}.`;
        break;
      case 'GAGAL SERVICE/GARANSI':
        currentStep = 3;
        isFailed = true;
        stepTitle = 'Gagal Servis / Garansi Ditolak';
        stepDescription = 'Perangkat tidak dapat diperbaiki atau klaim garansi tidak lolos syarat distributor.';
        break;
      default:
        currentStep = 2;
        stepTitle = 'Pemeriksaan Unit';
        stepDescription = 'Unit sedang dalam antrean pemeriksaan teknisi.';
        break;
    }

    // Fetch related audit logs for tracking timeline
    const logsStmt = db.prepare(`
      SELECT action, keterangan, created_at 
      FROM audit_logs 
      WHERE ticket_id = ? OR nomor_layanan = ? 
      ORDER BY created_at DESC
      LIMIT 8
    `);
    const rawLogs = logsStmt.all(ticket.id, ticket.nomor_layanan) as Array<{
      action: string;
      keterangan: string;
      created_at: string;
    }>;

    // Build timeline milestones
    const timeline = [];

    // Latest audit log steps
    for (const log of rawLogs) {
      timeline.push({
        action: log.action,
        description: log.keterangan,
        time: log.created_at
      });
    }

    // Always include entry milestone at bottom if not already represented
    const hasInitial = timeline.some(t => t.description.toLowerCase().includes('masuk') || t.description.toLowerCase().includes('buat'));
    if (!hasInitial && ticket.tanggal_masuk) {
      timeline.push({
        action: 'PENERIMAAN',
        description: `Perangkat masuk dan terdaftar dengan No. Tanda Terima ${ticket.nomor_layanan}`,
        time: ticket.tanggal_masuk
      });
    }

    // Public sanitized ticket response
    const sanitizedData = {
      nomor_layanan: ticket.nomor_layanan,
      tanggal_masuk: ticket.tanggal_masuk,
      jenis_layanan: ticket.jenis_layanan,
      nama_customer: ticket.nama_customer,
      no_hp_masked: maskPhoneNumber(ticket.no_hp),
      jenis_barang: ticket.jenis_barang,
      nama_barang: ticket.nama_barang,
      serial_number: ticket.serial_number || '-',
      keluhan: ticket.keluhan,
      kelengkapan: Array.isArray(ticket.kelengkapan) ? ticket.kelengkapan : [],
      estimasi_selesai: ticket.estimasi_selesai || null,
      teknisi: ticket.teknisi,
      status: ticket.status,
      catatan: ticket.catatan || null,
      estimasi_biaya: ticket.estimasi_biaya || 0,
      dp: ticket.dp || 0,
      sisa: ticket.sisa || 0,
      biaya_akhir: ticket.biaya_akhir || ticket.estimasi_biaya || 0,
      hasil_service_garansi: ticket.hasil_service_garansi || null,
      sn_baru: ticket.sn_baru || null,
      tgl_diambil_customer: ticket.tgl_diambil_customer || null,
      updated_at: ticket.updated_at,
      // Computed workflow progress
      progress: {
        current_step: currentStep,
        step_title: stepTitle,
        step_description: stepDescription,
        is_pending: isPending,
        is_failed: isFailed,
        is_ready_for_pickup: isReadyForPickup,
        is_done_taken: isDoneTaken
      },
      timeline
    };

    return NextResponse.json({
      success: true,
      ticket: sanitizedData
    });
  } catch (error) {
    console.error('[tracking_api] Error processing tracking query:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem saat memuat data tracking.' },
      { status: 500 }
    );
  }
}
