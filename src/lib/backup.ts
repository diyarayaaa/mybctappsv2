import { db } from '@/lib/db';
import { logActivity } from '@/lib/audit';
import * as XLSX from 'xlsx';
import fs from 'node:fs';
import path from 'node:path';

export interface BackupHistoryItem {
  id: string;
  timestamp: string;
  type: 'AUTO' | 'MANUAL';
  status: 'SUCCESS' | 'ERROR';
  message: string;
  counts?: {
    tickets: number;
    suratJalan: number;
    vendors: number;
    keluhan: number;
  };
}

export interface BackupConfig {
  enabled: boolean;
  webhookUrl: string;
  spreadsheetUrl: string;
  scheduleTime: string; // HH:mm in WIB, e.g. "17:00"
  lastBackupDate: string | null; // YYYY-MM-DD
  lastBackupAt: string | null;
  lastBackupStatus: 'SUCCESS' | 'ERROR' | null;
  lastBackupMessage: string | null;
  history: BackupHistoryItem[];
}

const SETTING_KEY = 'google_sheets_backup_config';

const DEFAULT_CONFIG: BackupConfig = {
  enabled: false,
  webhookUrl: '',
  spreadsheetUrl: '',
  scheduleTime: '17:00',
  lastBackupDate: null,
  lastBackupAt: null,
  lastBackupStatus: null,
  lastBackupMessage: null,
  history: []
};

declare global {
  // eslint-disable-next-line no-var
  var _isRunningAutoBackup: boolean | undefined;
}

export function getJakartaNow() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '00';
  const dateStr = `${get('year')}-${get('month')}-${get('day')}`;
  const timeStr = `${get('hour')}:${get('minute')}`;
  const fullStr = `${dateStr} ${timeStr}:${get('second')} WIB`;
  return { dateStr, timeStr, fullStr };
}

export function getBackupConfig(): BackupConfig {
  try {
    const stmt = db.prepare('SELECT value FROM app_settings WHERE key = ?');
    const row = stmt.get(SETTING_KEY) as { value: string } | undefined;
    if (!row || !row.value) return { ...DEFAULT_CONFIG };
    const parsed = JSON.parse(row.value);
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      history: Array.isArray(parsed.history) ? parsed.history : []
    };
  } catch (err) {
    console.error('[backup] Failed to read backup config:', err);
    return { ...DEFAULT_CONFIG };
  }
}

export function saveBackupConfig(partial: Partial<BackupConfig>): BackupConfig {
  const current = getBackupConfig();
  const updated: BackupConfig = {
    ...current,
    ...partial,
    history: partial.history !== undefined ? partial.history : current.history
  };

  const stmt = db.prepare(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (?, ?, datetime('now', 'localtime'))
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = datetime('now', 'localtime')
  `);
  stmt.run(SETTING_KEY, JSON.stringify(updated));
  return updated;
}

export function collectDatabaseSnapshot() {
  const tickets = db.prepare('SELECT * FROM tickets ORDER BY created_at DESC').all() as Record<string, unknown>[];
  const suratJalan = db.prepare('SELECT * FROM surat_jalan ORDER BY created_at DESC').all() as Record<string, unknown>[];
  const vendors = db.prepare('SELECT * FROM master_vendors ORDER BY nama_vendor ASC').all() as Record<string, unknown>[];
  const keluhan = db.prepare('SELECT * FROM master_keluhan ORDER BY id ASC').all() as Record<string, unknown>[];

  return {
    tickets,
    suratJalan,
    vendors,
    keluhan,
    counts: {
      tickets: tickets.length,
      suratJalan: suratJalan.length,
      vendors: vendors.length,
      keluhan: keluhan.length
    }
  };
}

export function generateBackupExcelBuffer(): Buffer {
  const snapshot = collectDatabaseSnapshot();
  const { fullStr } = getJakartaNow();
  const wb = XLSX.utils.book_new();

  // 1. Sheet Tiket Servis
  const ticketRows = snapshot.tickets.map((t, idx) => {
    let kelengkapanText = '';
    try {
      const parsed = JSON.parse(String(t.kelengkapan || '[]'));
      kelengkapanText = Array.isArray(parsed) ? parsed.join(', ') : String(t.kelengkapan || '');
    } catch {
      kelengkapanText = String(t.kelengkapan || '');
    }
    return {
      No: idx + 1,
      'Nomor Layanan': t.nomor_layanan || '',
      'Tanggal Masuk': t.tanggal_masuk || '',
      'Jenis Layanan': t.jenis_layanan || '',
      'Nama Customer': t.nama_customer || '',
      'No HP': t.no_hp || '',
      'Jenis Barang': t.jenis_barang || '',
      'Nama Barang / Tipe': t.nama_barang || '',
      'Serial Number': t.serial_number || '',
      Keluhan: t.keluhan || '',
      Kelengkapan: kelengkapanText,
      Teknisi: t.teknisi || '',
      Status: t.status || '',
      'Catatan Teknisi': t.catatan || '',
      'Estimasi Biaya': Number(t.estimasi_biaya || 0),
      DP: Number(t.dp || 0),
      Sisa: Number(t.sisa || 0),
      'Biaya Akhir': Number(t.biaya_akhir || 0),
      'No Surat Jalan': t.no_surat_jalan || '',
      'Distributor / Vendor': t.distributor_vendor || '',
      'Tgl Kirim Vendor': t.tgl_kirim_vendor || '',
      'Tgl Datang Vendor': t.tgl_datang_vendor || '',
      'Hasil Service Garansi': t.hasil_service_garansi || '',
      'SN Baru': t.sn_baru || '',
      'Tgl Diambil Customer': t.tgl_diambil_customer || '',
      'Diupdate Pada': t.updated_at || ''
    };
  });
  const wsTickets = XLSX.utils.json_to_sheet(
    ticketRows.length > 0 ? ticketRows : [{ Info: 'Belum ada data tiket servis' }]
  );
  XLSX.utils.book_append_sheet(wb, wsTickets, 'Tiket_Servis');

  // 2. Sheet Surat Jalan
  const sjRows = snapshot.suratJalan.map((s, idx) => ({
    No: idx + 1,
    'No Surat Jalan': s.no_surat_jalan || '',
    'Distributor / Vendor': s.distributor_vendor || '',
    'Tanggal Kirim': s.tgl_kirim || '',
    Ekspedisi: s.ekspedisi || '',
    'No Resi': s.no_resi || '',
    Catatan: s.catatan || '',
    'Dibuat Oleh': s.created_by || '',
    'Waktu Dibuat': s.created_at || ''
  }));
  const wsSj = XLSX.utils.json_to_sheet(
    sjRows.length > 0 ? sjRows : [{ Info: 'Belum ada data surat jalan' }]
  );
  XLSX.utils.book_append_sheet(wb, wsSj, 'Surat_Jalan');

  // 3. Sheet Master Vendor
  const vendorRows = snapshot.vendors.map((v, idx) => ({
    No: idx + 1,
    'Nama Vendor': v.nama_vendor || '',
    Wilayah: v.wilayah || '',
    'Alamat Lengkap': v.alamat_lengkap || '',
    'Kontak WA': v.kontak_wa || ''
  }));
  const wsVendors = XLSX.utils.json_to_sheet(
    vendorRows.length > 0 ? vendorRows : [{ Info: 'Belum ada data vendor' }]
  );
  XLSX.utils.book_append_sheet(wb, wsVendors, 'Master_Vendor');

  // 4. Sheet Master Keluhan
  const keluhanRows = snapshot.keluhan.map((k, idx) => ({
    No: idx + 1,
    'Teks Keluhan': k.teks_keluhan || ''
  }));
  const wsKeluhan = XLSX.utils.json_to_sheet(
    keluhanRows.length > 0 ? keluhanRows : [{ Info: 'Belum ada data keluhan' }]
  );
  XLSX.utils.book_append_sheet(wb, wsKeluhan, 'Master_Keluhan');

  // 5. Sheet Info Backup
  const wsInfo = XLSX.utils.json_to_sheet([
    {
      'Waktu Backup': fullStr,
      'Total Tiket Servis': snapshot.counts.tickets,
      'Total Surat Jalan': snapshot.counts.suratJalan,
      'Total Master Vendor': snapshot.counts.vendors,
      'Total Preset Keluhan': snapshot.counts.keluhan
    }
  ]);
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Info_Backup');

  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

export async function runGoogleSheetsBackup(
  type: 'AUTO' | 'MANUAL',
  overrideWebhookUrl?: string
): Promise<{ ok: boolean; message: string; config: BackupConfig }> {
  const config = getBackupConfig();
  const targetUrl = (overrideWebhookUrl ?? config.webhookUrl).trim();
  const { dateStr, fullStr } = getJakartaNow();

  if (!targetUrl) {
    return {
      ok: false,
      message: 'URL Google Apps Script Web App belum diisi.',
      config
    };
  }

  const snapshot = collectDatabaseSnapshot();

  // Save a local daily Excel copy in data/backups/ as well (if writable)
  try {
    if (!process.env.VERCEL) {
      const backupDir = path.join(process.cwd(), 'data', 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      const buffer = generateBackupExcelBuffer();
      fs.writeFileSync(path.join(backupDir, `Backup_BCT_${dateStr}.xlsx`), buffer);
    }
  } catch (e) {
    console.warn('[backup] Local xlsx snapshot skipped:', e);
  }

  try {
    const payload = {
      source: 'MyBCTApps_v2',
      backupType: type,
      backupDate: dateStr,
      backupTimestamp: fullStr,
      counts: snapshot.counts,
      tickets: snapshot.tickets,
      suratJalan: snapshot.suratJalan,
      vendors: snapshot.vendors,
      keluhan: snapshot.keluhan
    };

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });

    const responseText = await response.text();
    let parsedRes: { status?: string; message?: string; error?: string } = {};
    try {
      parsedRes = JSON.parse(responseText);
    } catch {
      // Apps script might return HTML if permission isn't set to "Anyone"
    }

    if (!response.ok || parsedRes.status === 'error' || parsedRes.error) {
      const errDetail =
        parsedRes.error ||
        parsedRes.message ||
        (responseText.includes('<!DOCTYPE html>') || responseText.includes('Google Accounts')
          ? 'Akses ditolak oleh Google. Pastikan saat Deploy Web App dipilih "Who has access: Anyone / Siapa saja".'
          : `HTTP ${response.status}`);
      throw new Error(errDetail);
    }

    const successMsg =
      parsedRes.message ||
      `Berhasil backup ke Google Spreadsheet (${snapshot.counts.tickets} tiket, ${snapshot.counts.suratJalan} surat jalan, ${snapshot.counts.vendors} vendor).`;

    const historyItem: BackupHistoryItem = {
      id: `bkp-${Date.now()}`,
      timestamp: fullStr,
      type,
      status: 'SUCCESS',
      message: successMsg,
      counts: snapshot.counts
    };

    const updatedConfig = saveBackupConfig({
      webhookUrl: targetUrl,
      lastBackupDate: dateStr,
      lastBackupAt: fullStr,
      lastBackupStatus: 'SUCCESS',
      lastBackupMessage: successMsg,
      history: [historyItem, ...config.history].slice(0, 30)
    });

    logActivity(
      null,
      null,
      type === 'AUTO' ? 'SYSTEM (Auto-Backup)' : 'Admin',
      'BACKUP_SPREADSHEET',
      `[${type}] ${successMsg}`
    );

    return {
      ok: true,
      message: successMsg,
      config: updatedConfig
    };
  } catch (err: unknown) {
    const errMsg = `Gagal backup ke Google Spreadsheet: ${(err as Error).message || 'Kesalahan jaringan'}`;
    const historyItem: BackupHistoryItem = {
      id: `bkp-${Date.now()}`,
      timestamp: fullStr,
      type,
      status: 'ERROR',
      message: errMsg,
      counts: snapshot.counts
    };

    const updatedConfig = saveBackupConfig({
      lastBackupAt: fullStr,
      lastBackupStatus: 'ERROR',
      lastBackupMessage: errMsg,
      history: [historyItem, ...config.history].slice(0, 30)
    });

    return {
      ok: false,
      message: errMsg,
      config: updatedConfig
    };
  }
}

export async function checkAndRunDailyAutoBackup(): Promise<{ triggered: boolean; message?: string }> {
  if (global._isRunningAutoBackup) {
    return { triggered: false, message: 'Backup sedang berjalan' };
  }

  const config = getBackupConfig();
  if (!config.enabled || !config.webhookUrl.trim()) {
    return { triggered: false };
  }

  const { dateStr, timeStr } = getJakartaNow();

  // Already backed up today
  if (config.lastBackupDate === dateStr && config.lastBackupStatus === 'SUCCESS') {
    return { triggered: false };
  }

  // Check if current time >= scheduled time (HH:mm string comparison works for 24-hour format)
  const targetSchedule = config.scheduleTime || '17:00';
  if (timeStr < targetSchedule) {
    return { triggered: false };
  }

  try {
    global._isRunningAutoBackup = true;
    const res = await runGoogleSheetsBackup('AUTO');
    return { triggered: true, message: res.message };
  } finally {
    global._isRunningAutoBackup = false;
  }
}

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * SCRIPT BACKUP OTOMATIS MYBCTAPPS V2 -> GOOGLE SPREADSHEET
 * Cara Pakai:
 * 1. Buka Google Spreadsheet baru di Google Drive Anda
 * 2. Klik menu Ekstensi (Extensions) > Apps Script
 * 3. Hapus semua kode yang ada, lalu Paste kode ini & tekan Ctrl+S (Simpan)
 * 4. Klik tombol biru "Terapkan" (Deploy) > "Deployment baru" (New deployment)
 * 5. Pilih jenis: "Aplikasi Web" (Web app)
 *    - Jalankan sebagai (Execute as): "Saya" (Me)
 *    - Siapa yang memiliki akses (Who has access): "Siapa saja" (Anyone)
 * 6. Klik Terapkan (Deploy), berikan izin akses (Authorize), lalu salin URL Aplikasi Web-nya.
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Sheet Tiket_Servis
    var ticketHeaders = [
      "No", "Nomor Layanan", "Tanggal Masuk", "Jenis Layanan", "Nama Customer",
      "No HP", "Jenis Barang", "Nama Barang / Tipe", "Serial Number", "Keluhan",
      "Kelengkapan", "Teknisi", "Status", "Catatan Teknisi", "Estimasi Biaya",
      "DP", "Sisa", "Biaya Akhir", "No Surat Jalan", "Distributor / Vendor",
      "Tgl Kirim Vendor", "Tgl Datang Vendor", "Hasil Service Garansi", "SN Baru",
      "Tgl Diambil Customer", "Terakhir Diupdate"
    ];
    var ticketRows = (data.tickets || []).map(function(t, i) {
      var kelengkapan = t.kelengkapan || "";
      try {
        var parsed = JSON.parse(kelengkapan);
        if (Array.isArray(parsed)) kelengkapan = parsed.join(", ");
      } catch (err) {}
      return [
        i + 1, t.nomor_layanan || "", t.tanggal_masuk || "", t.jenis_layanan || "",
        t.nama_customer || "", "'" + (t.no_hp || ""), t.jenis_barang || "",
        t.nama_barang || "", "'" + (t.serial_number || ""), t.keluhan || "",
        kelengkapan, t.teknisi || "", t.status || "", t.catatan || "",
        Number(t.estimasi_biaya || 0), Number(t.dp || 0), Number(t.sisa || 0),
        Number(t.biaya_akhir || 0), t.no_surat_jalan || "", t.distributor_vendor || "",
        t.tgl_kirim_vendor || "", t.tgl_datang_vendor || "", t.hasil_service_garansi || "",
        t.sn_baru || "", t.tgl_diambil_customer || "", t.updated_at || ""
      ];
    });
    writeSheetData(ss, "Tiket_Servis", ticketHeaders, ticketRows);

    // 2. Sheet Surat_Jalan
    var sjHeaders = [
      "No", "No Surat Jalan", "Distributor / Vendor", "Tanggal Kirim",
      "Ekspedisi", "No Resi", "Catatan", "Dibuat Oleh", "Waktu Dibuat"
    ];
    var sjRows = (data.suratJalan || []).map(function(s, i) {
      return [
        i + 1, s.no_surat_jalan || "", s.distributor_vendor || "", s.tgl_kirim || "",
        s.ekspedisi || "", "'" + (s.no_resi || ""), s.catatan || "",
        s.created_by || "", s.created_at || ""
      ];
    });
    writeSheetData(ss, "Surat_Jalan", sjHeaders, sjRows);

    // 3. Sheet Master_Vendor
    var vendorHeaders = ["No", "Nama Vendor", "Wilayah", "Alamat Lengkap", "Kontak WA"];
    var vendorRows = (data.vendors || []).map(function(v, i) {
      return [
        i + 1, v.nama_vendor || "", v.wilayah || "",
        v.alamat_lengkap || "", "'" + (v.kontak_wa || "")
      ];
    });
    writeSheetData(ss, "Master_Vendor", vendorHeaders, vendorRows);

    // 4. Sheet Master_Keluhan
    var keluhanHeaders = ["No", "Teks Keluhan"];
    var keluhanRows = (data.keluhan || []).map(function(k, i) {
      return [i + 1, k.teks_keluhan || ""];
    });
    writeSheetData(ss, "Master_Keluhan", keluhanHeaders, keluhanRows);

    // 5. Sheet Log_Backup (Riwayat Harian)
    var logSheet = ss.getSheetByName("Log_Backup");
    if (!logSheet) {
      logSheet = ss.insertSheet("Log_Backup");
      logSheet.appendRow(["Waktu Backup", "Tipe Backup", "Total Tiket", "Total Surat Jalan", "Total Vendor", "Status"]);
      logSheet.getRange(1, 1, 1, 6).setBackground("#1e3a8a").setFontColor("#ffffff").setFontWeight("bold");
      logSheet.setFrozenRows(1);
    }
    logSheet.appendRow([
      data.backupTimestamp || new Date().toLocaleString("id-ID"),
      data.backupType || "AUTO",
      ticketRows.length,
      sjRows.length,
      vendorRows.length,
      "BERHASIL"
    ]);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Backup ke Google Spreadsheet berhasil (" + ticketRows.length + " Tiket, " + sjRows.length + " Surat Jalan, " + vendorRows.length + " Vendor)"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function writeSheetData(ss, sheetName, headers, rows) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  } else {
    sheet.clearContents();
  }
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setBackground("#1e3a8a")
    .setFontColor("#ffffff")
    .setFontWeight("bold");
  sheet.setFrozenRows(1);

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}
`;
