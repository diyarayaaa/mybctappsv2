import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/audit';
import { ensureWhiteLabelTablesAndSeed, parseCustomData } from '@/lib/app-config';
import { Ticket, AuditLog } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    ensureWhiteLabelTablesAndSeed(db);
    const { id } = await params;

    const stmt = db.prepare('SELECT * FROM tickets WHERE id = ? OR nomor_layanan = ?');
    const rawTicket = stmt.get(id, id) as Record<string, unknown> | undefined;

    if (!rawTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const ticket: Ticket = {
      ...(rawTicket as unknown as Ticket),
      kelengkapan: typeof rawTicket.kelengkapan === 'string'
        ? JSON.parse(rawTicket.kelengkapan || '[]')
        : (rawTicket.kelengkapan || []),
      custom_data: parseCustomData(rawTicket.custom_data)
    };

    // Get audit logs for this ticket
    const logsStmt = db.prepare(`
      SELECT * FROM audit_logs 
      WHERE ticket_id = ? OR nomor_layanan = ? 
      ORDER BY created_at DESC
    `);
    const rawLogs = logsStmt.all(ticket.id, ticket.nomor_layanan) as Record<string, unknown>[];

    const logs: AuditLog[] = rawLogs.map(l => ({
      ...(l as unknown as AuditLog),
      payload_sebelum: typeof l.payload_sebelum === 'string' ? JSON.parse(l.payload_sebelum) : l.payload_sebelum,
      payload_sesudah: typeof l.payload_sesudah === 'string' ? JSON.parse(l.payload_sesudah) : l.payload_sesudah
    }));

    return NextResponse.json({ ticket, logs });
  } catch (error) {
    console.error('Error fetching ticket detail:', error);
    return NextResponse.json({ error: 'Failed to fetch ticket' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    ensureWhiteLabelTablesAndSeed(db);
    const { id } = await params;
    const body = await request.json();

    // Ambil data sebelum diubah
    const getOldStmt = db.prepare('SELECT * FROM tickets WHERE id = ?');
    const oldRaw = getOldStmt.get(id) as Record<string, unknown> | undefined;

    if (!oldRaw) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const oldTicket: Ticket = {
      ...(oldRaw as unknown as Ticket),
      kelengkapan: typeof oldRaw.kelengkapan === 'string'
        ? JSON.parse(oldRaw.kelengkapan || '[]')
        : (oldRaw.kelengkapan || []),
      custom_data: parseCustomData(oldRaw.custom_data)
    };

    // Calculate numeric fields
    const estimasi_biaya = body.estimasi_biaya !== undefined ? Number(body.estimasi_biaya) : oldTicket.estimasi_biaya;
    const dp = body.dp !== undefined ? Number(body.dp) : oldTicket.dp;
    const sisa = estimasi_biaya - dp;
    let biaya_akhir = body.biaya_akhir !== undefined ? Number(body.biaya_akhir) : oldTicket.biaya_akhir;

    const status = body.status || oldTicket.status;
    let tgl_diambil_customer = body.tgl_diambil_customer !== undefined ? body.tgl_diambil_customer : oldTicket.tgl_diambil_customer;

    if (status === 'SELESAI & DIAMBIL' || status === 'GAGAL SERVICE/GARANSI') {
      if (!biaya_akhir && estimasi_biaya > 0) {
        biaya_akhir = estimasi_biaya;
      }
      if (!tgl_diambil_customer) {
        tgl_diambil_customer = new Date().toISOString().replace('T', ' ').slice(0, 19);
      }
    }

    const mergedCustomData =
      body.custom_data !== undefined
        ? { ...(oldTicket.custom_data || {}), ...parseCustomData(body.custom_data) }
        : (oldTicket.custom_data || {});

    const updatedData = {
      nomor_layanan: body.nomor_layanan || oldTicket.nomor_layanan,
      jenis_layanan: body.jenis_layanan || oldTicket.jenis_layanan,
      nama_customer: body.nama_customer || oldTicket.nama_customer,
      no_hp: body.no_hp !== undefined ? body.no_hp : oldTicket.no_hp,
      jenis_barang: body.jenis_barang || oldTicket.jenis_barang,
      nama_barang: body.nama_barang || oldTicket.nama_barang,
      serial_number: body.serial_number !== undefined ? body.serial_number : oldTicket.serial_number,
      keluhan: body.keluhan || oldTicket.keluhan,
      kelengkapan: JSON.stringify(body.kelengkapan !== undefined ? body.kelengkapan : oldTicket.kelengkapan),
      estimasi_selesai: body.estimasi_selesai !== undefined ? body.estimasi_selesai : oldTicket.estimasi_selesai,
      teknisi: body.teknisi || oldTicket.teknisi,
      status: status,
      catatan: body.catatan !== undefined ? body.catatan : oldTicket.catatan,
      estimasi_biaya,
      dp,
      sisa,
      biaya_akhir,
      no_surat_jalan: body.no_surat_jalan !== undefined ? body.no_surat_jalan : oldTicket.no_surat_jalan,
      distributor_vendor: body.distributor_vendor !== undefined ? body.distributor_vendor : oldTicket.distributor_vendor,
      tgl_kirim_vendor: body.tgl_kirim_vendor !== undefined ? body.tgl_kirim_vendor : oldTicket.tgl_kirim_vendor,
      tgl_datang_vendor: body.tgl_datang_vendor !== undefined ? body.tgl_datang_vendor : oldTicket.tgl_datang_vendor,
      hasil_service_garansi: body.hasil_service_garansi !== undefined ? body.hasil_service_garansi : oldTicket.hasil_service_garansi,
      sn_baru: body.sn_baru !== undefined ? body.sn_baru : oldTicket.sn_baru,
      tgl_diambil_customer,
      custom_data: JSON.stringify(mergedCustomData),
      updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
    };

    // Auto-save updated keluhan into master_keluhan
    if (updatedData.keluhan) {
      try {
        const parts = updatedData.keluhan.split(/[,;\n]+/).map((s: string) => s.trim()).filter((s: string) => s.length > 2);
        const insertKeluhan = db.prepare('INSERT OR IGNORE INTO master_keluhan (teks_keluhan) VALUES (?)');
        for (const p of parts) {
          insertKeluhan.run(p);
        }
        if (parts.length === 0) {
          insertKeluhan.run(updatedData.keluhan);
        }
      } catch (kErr) {
        console.error('Failed to auto-save keluhan to master_keluhan:', kErr);
      }
    }

    const updateStmt = db.prepare(`
      UPDATE tickets SET
        nomor_layanan = ?,
        jenis_layanan = ?,
        nama_customer = ?,
        no_hp = ?,
        jenis_barang = ?,
        nama_barang = ?,
        serial_number = ?,
        keluhan = ?,
        kelengkapan = ?,
        estimasi_selesai = ?,
        teknisi = ?,
        status = ?,
        catatan = ?,
        estimasi_biaya = ?,
        dp = ?,
        sisa = ?,
        biaya_akhir = ?,
        no_surat_jalan = ?,
        distributor_vendor = ?,
        tgl_kirim_vendor = ?,
        tgl_datang_vendor = ?,
        hasil_service_garansi = ?,
        sn_baru = ?,
        tgl_diambil_customer = ?,
        custom_data = ?,
        updated_at = ?
      WHERE id = ?
    `);

    updateStmt.run(
      updatedData.nomor_layanan,
      updatedData.jenis_layanan,
      updatedData.nama_customer,
      updatedData.no_hp,
      updatedData.jenis_barang,
      updatedData.nama_barang,
      updatedData.serial_number,
      updatedData.keluhan,
      updatedData.kelengkapan,
      updatedData.estimasi_selesai,
      updatedData.teknisi,
      updatedData.status,
      updatedData.catatan,
      updatedData.estimasi_biaya,
      updatedData.dp,
      updatedData.sisa,
      updatedData.biaya_akhir,
      updatedData.no_surat_jalan,
      updatedData.distributor_vendor,
      updatedData.tgl_kirim_vendor,
      updatedData.tgl_datang_vendor,
      updatedData.hasil_service_garansi,
      updatedData.sn_baru,
      updatedData.tgl_diambil_customer,
      updatedData.custom_data,
      updatedData.updated_at,
      id
    );

    const actor = body.actor || updatedData.teknisi || 'Teknisi';
    let action = 'UPDATE_DATA';
    let logDescription = `${actor} memperbarui data tiket [${updatedData.nomor_layanan}]`;

    if (oldTicket.status !== updatedData.status) {
      action = 'STATUS_CHANGE';
      logDescription = `${actor} mengubah status ${oldTicket.status} ➔ ${updatedData.status}`;
      if (updatedData.hasil_service_garansi === 'Diganti baru' && updatedData.sn_baru) {
        logDescription += ` (Diganti Baru: SN ${updatedData.sn_baru})`;
      }
    } else if (body.action_type === 'SURAT_JALAN_ASSIGNED') {
      action = 'SURAT_JALAN_ASSIGNED';
      logDescription = `${actor} menautkan Surat Jalan ${updatedData.no_surat_jalan} (Vendor: ${updatedData.distributor_vendor})`;
    }

    logActivity(
      id,
      updatedData.nomor_layanan,
      actor,
      action,
      logDescription,
      { status: oldTicket.status, teknisi: oldTicket.teknisi, hasil: oldTicket.hasil_service_garansi },
      { status: updatedData.status, teknisi: updatedData.teknisi, hasil: updatedData.hasil_service_garansi, sn_baru: updatedData.sn_baru }
    );

    return NextResponse.json({ success: true, message: 'Ticket updated successfully' });
  } catch (error) {
    console.error('Error updating ticket:', error);
    return NextResponse.json({ error: (error as Error).message || 'Failed to update ticket' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const stmt = db.prepare('SELECT nomor_layanan, nama_barang, teknisi FROM tickets WHERE id = ?');
    const ticket = stmt.get(id) as { nomor_layanan: string; nama_barang: string; teknisi: string } | undefined;

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const deleteStmt = db.prepare('DELETE FROM tickets WHERE id = ?');
    deleteStmt.run(id);

    logActivity(
      id,
      ticket.nomor_layanan,
      'Admin',
      'DELETE_TICKET',
      `Menghapus tiket [${ticket.nomor_layanan}] - ${ticket.nama_barang}`
    );

    return NextResponse.json({ success: true, message: 'Ticket deleted successfully' });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    return NextResponse.json({ error: 'Failed to delete ticket' }, { status: 500 });
  }
}
