import { Ticket } from '@/types';
import { SALES_WA_NUMBER } from './constants';

/**
 * Membersihkan suffix wilayah (BDG / JKT / Lainnya) dari nama vendor
 * Contoh: "PT. ASIA RAYA COM BDG" -> "PT. ASIA RAYA COM"
 */
export function cleanVendorName(vendorName: string): string {
  if (!vendorName) return 'VENDOR';
  return vendorName
    .replace(/\s+(BDG|JKT|BANDUNG|JAKARTA)$/i, '')
    .trim();
}

/**
 * Format nomor HP Indonesia ke format internasional (e.g. 081234 -> 6281234)
 */
export function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (!cleaned.startsWith('62') && cleaned.length > 0) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

/**
 * Format tanggal ke format Indonesia DD/MM/YYYY
 */
export function formatDateIndo(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

/**
 * Format datetime ke format Indonesia DD/MM/YYYY HH:mm
 */
export function formatDateTimeIndo(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return dateStr;
  }
}

/**
 * Template A: Notifikasi Tanda Terima Masuk (Tiket Baru)
 */
export function formatCustomerReceiptMessage(ticket: Ticket): string {
  const kelengkapanStr = Array.isArray(ticket.kelengkapan) && ticket.kelengkapan.length > 0
    ? ticket.kelengkapan.join(', ')
    : 'Tidak ada';

  return `Hallo ${ticket.nama_customer}
Kami telah menerima perangkat Anda untuk proses ${ticket.jenis_layanan} dengan rincian berikut:
━━━━━━━━━━━━━━━
No RMA : ${ticket.nomor_layanan}
Tanggal Masuk : ${formatDateTimeIndo(ticket.tanggal_masuk)}
Jenis Barang : ${ticket.jenis_barang}
Nama Barang : ${ticket.nama_barang}
Serial Number : ${ticket.serial_number}
Keluhan : ${ticket.keluhan}
Kelengkapan : ${kelengkapanStr}
Estimasi Selesai : ${formatDateIndo(ticket.estimasi_selesai)}
━━━━━━━━━━━━━━━
Lacak status pengerjaan unit Anda kapan saja secara online:
https://mybctapps.vercel.app/tracking?no=${ticket.nomor_layanan}

Mohon simpan pesan ini sebagai bukti serah terima perangkat.
Catatan:
• Pengambilan perangkat wajib menunjukkan No RMA.
• Perangkat yang tidak diambil lebih dari 30 hari setelah konfirmasi selesai bukan menjadi tanggung jawab kami atas segala risiko yang terjadi.
• Mohon melakukan pengecekan perangkat saat pengambilan.
Terima kasih
-${ticket.teknisi} Best Computel Service`;
}

/**
 * Template B: Notifikasi Unit Selesai Siap Ambil
 */
export function formatCustomerDoneMessage(ticket: Ticket): string {
  return `Hallo ${ticket.nama_customer}
Saya ${ticket.teknisi} dari Best Computel Service, Ingin menginformasikan bahwa perangkat:
━━━━━━━━━━━━━━━
Nama Perangkat : ${ticket.nama_barang}
Keluhan : ${ticket.keluhan}
━━━━━━━━━━━━━━━
Telah *SELESAI* diperbaiki dan sudah dapat diambil.
Silakan datang sesuai jam operasional toko:
• Senin - Jumat : 09.00 - 17.00
• Sabtu : 09.00 - 15.00
• Minggu dan Tanggal Merah : Libur
Terima kasih.`;
}

/**
 * Pipeline 1: Laporan WA Operasional Mingguan (Hari Kamis)
 * Format PERSIS seperti AppScript LAPORAN_WA (v5.0):
 * - grouping by distributor (BDG/JKT suffix di-strip)
 * - format tree: NAMA BARANG / ├─ S/N / ├─ Keluhan / ├─ User / └─ Catt
 * - pembatas ---- antar section
 * - STOCK BCT -> "Stok"
 */
export function formatOperationalReport(tickets: Ticket[], dateString?: string): string {
  const todayStr = dateString || new Date().toISOString().split('T')[0];
  const dateDisplay = formatDateIndo(todayStr);

  // helper: cek barang ke bandung (dikirim hari ini)
  const barangKeBdg = tickets.filter((t) => {
    const jenisOk = (t.jenis_layanan === 'GARANSI' && t.status === 'PROSES GARANSI') ||
      (t.jenis_layanan === 'SERVICE' && t.status === 'ALIH SERVICE');
    if (!jenisOk) return false;
    const tgl = t.tgl_kirim_vendor;
    if (!tgl) return false;
    return tgl.startsWith(todayStr);
  });

  // helper: di vendor, bukan kirim hari ini
  function diVendor(wilayah: 'BDG' | 'JKT') {
    return tickets.filter((t) => {
      const jenisOk = (t.jenis_layanan === 'GARANSI' && t.status === 'PROSES GARANSI') ||
        (t.jenis_layanan === 'SERVICE' && t.status === 'ALIH SERVICE');
      if (!jenisOk) return false;
      const tgl = t.tgl_kirim_vendor;
      if (tgl && tgl.startsWith(todayStr)) return false; // yang dikirim hari ini gak masuk
      const dist = (t.distributor_vendor || '').toUpperCase();
      return wilayah === 'BDG' ? dist.endsWith('BDG') : dist.endsWith('JKT');
    });
  }

  const barangDiVendorBdg = diVendor('BDG');
  const barangDiVendorJkt = diVendor('JKT');

  // Garansian belum diproses / belum dikirim
  const garansiBelumDiproses = tickets.filter((t) => {
    const isGaransiOrAlih = t.jenis_layanan === 'GARANSI' || t.status === 'ALIH SERVICE' || t.status === 'PROSES GARANSI';
    const belumKirim = !t.tgl_kirim_vendor && !t.no_surat_jalan;
    const belumSelesai = t.status !== 'SELESAI & DIAMBIL' && t.status !== 'SELESAI BELUM DIAMBIL' && t.status !== 'GAGAL SERVICE/GARANSI';
    return isGaransiOrAlih && belumKirim && belumSelesai;
  });

  function userTag(cust: string): string {
    return (cust || '').toUpperCase() === 'STOCK BCT' ? 'Stok' : (cust || '-');
  }

  function treeRow(t: Ticket, withTanggal = false): string {
    let s = '';
    if (withTanggal) s += `${formatDateIndo(t.tgl_kirim_vendor)}\n`;
    s += `${String(t.nama_barang || '-').toUpperCase()}\n`;
    s += `├─ S/N: ${t.serial_number || '-'}\n`;
    s += `├─ Keluhan: ${t.keluhan || '-'}\n`;
    s += `├─ User: ${userTag(t.nama_customer)}\n`;
    s += `└─ Catt: ${t.catatan || '-'}\n`;
    return s;
  }

  function groupSection(items: Ticket[]): string {
    const map = new Map<string, Ticket[]>();
    for (const t of items) {
      const v = cleanVendorName(t.distributor_vendor || 'LAINNYA');
      if (!map.has(v)) map.set(v, []);
      map.get(v)!.push(t);
    }
    let out = '';
    Array.from(map.keys()).sort().forEach((v) => {
      out += `*${v.toUpperCase()}*\n`;
      map.get(v)!.forEach((t) => {
        out += treeRow(t);
      });
      out += `\n`;
    });
    return out;
  }

  const SEP = '--------------------------------------------------\n--------------------------------------------------\n';

  let text = '';
  text += `*BARANG KE BANDUNG ${dateDisplay}*\n\n`;
  text += barangKeBdg.length === 0 ? '(Tidak ada pengiriman ke Bandung hari ini)\n\n' : groupSection(barangKeBdg);
  text += SEP;
  text += `*BARANG DI VENDOR BDG*\n\n`;
  text += barangDiVendorBdg.length === 0 ? '(Tidak ada unit di vendor Bandung)\n\n' : groupSection(barangDiVendorBdg);
  text += SEP;
  text += `*BARANG DI VENDOR JKT*\n\n`;
  text += barangDiVendorJkt.length === 0 ? '(Tidak ada unit di vendor Jakarta)\n\n' : groupSection(barangDiVendorJkt);
  text += SEP;
  text += `*GARANSIAN BELUM DIPROSES / BELUM DIKIRIM*\n\n`;
  text += garansiBelumDiproses.length === 0
    ? '(Semua unit garansi telah terproses/terkirim)\n\n'
    : groupSection(garansiBelumDiproses);
  text += `Best Computel Operasional & Logistics`;

  return text;
}

/**
 * Pipeline 2: Laporan WA Sales (Target: 0821-2008-1484)
 * Format PERSIS seperti AppScript LAPORAN_WA_SALES (v1.0):
 * - filter ketat STOCK BCT / GHITP
 * - GARANSIAN SELESAI (by TGL DIAMBIL CUST hari ini): S/N Lama, S/N Baru, Catt
 * - GARANSIAN DI VENDOR BDG / JKT: tanggal, barang, ├─ S/N, ├─ Keluhan, └─ Catt
 */
export function formatSalesReport(tickets: Ticket[], dateString?: string): string {
  const todayStr = dateString || new Date().toISOString().split('T')[0];
  const dateDisplay = formatDateIndo(todayStr);

  const stockTickets = tickets.filter((t) => {
    const upper = (t.nama_customer || '').trim().toUpperCase();
    return upper === 'STOCK BCT' || upper === 'GHITP';
  });

  // 1. GARANSIAN SELESAI (TGL DIAMBIL CUST == hari ini)
  const selesai = stockTickets.filter((t) => {
    const statusOk = t.status === 'SELESAI BELUM DIAMBIL' || t.status === 'SELESAI & DIAMBIL';
    if (!statusOk) return false;
    const tgl = t.tgl_diambil_customer;
    return tgl && tgl.startsWith(todayStr);
  });

  // 2 & 3. DI VENDOR BDG / JKT (status PROSES GARANSI, jenis GARANSI)
  function diVendor(wilayah: 'BDG' | 'JKT') {
    return stockTickets.filter((t) => {
      if (t.jenis_layanan !== 'GARANSI') return false;
      if (t.status !== 'PROSES GARANSI') return false;
      const dist = (t.distributor_vendor || '').toUpperCase();
      return wilayah === 'BDG' ? dist.endsWith('BDG') : dist.endsWith('JKT');
    });
  }
  const diVendorBdg = diVendor('BDG');
  const diVendorJkt = diVendor('JKT');

  // 4. BELUM DIPROSES
  const belumDiproses = stockTickets.filter((t) => {
    const isGaransi = t.jenis_layanan === 'GARANSI' || t.status === 'PROSES GARANSI';
    const belumKirim = !t.tgl_kirim_vendor;
    const belumSelesai = t.status !== 'SELESAI BELUM DIAMBIL' && t.status !== 'SELESAI & DIAMBIL' && t.status !== 'GAGAL SERVICE/GARANSI';
    return isGaransi && belumKirim && belumSelesai;
  });

  function groupSelesai(items: Ticket[]): string {
    const map = new Map<string, Ticket[]>();
    for (const t of items) {
      const v = cleanVendorName(t.distributor_vendor || 'LAINNYA');
      if (!map.has(v)) map.set(v, []);
      map.get(v)!.push(t);
    }
    let out = '';
    Array.from(map.keys()).sort().forEach((v) => {
      out += `*${v.toUpperCase()}*\n`;
      map.get(v)!.forEach((t) => {
        const tag = (t.nama_customer || '').toUpperCase().includes('GHITP') ? '[GHITP]' : '[STOCK BCT]';
        out += `${tag} ${String(t.nama_barang || '-').toUpperCase()}\n`;
        out += `├─ S/N Lama: ${t.serial_number || '-'}\n`;
        out += `├─ S/N Baru: ${t.sn_baru || '-'}\n`;
        out += `└─ Catt: ${t.catatan || '-'}\n`;
      });
      out += `\n`;
    });
    return out;
  }

  function groupVendor(items: Ticket[]): string {
    const map = new Map<string, Ticket[]>();
    for (const t of items) {
      const v = cleanVendorName(t.distributor_vendor || 'LAINNYA');
      if (!map.has(v)) map.set(v, []);
      map.get(v)!.push(t);
    }
    let out = '';
    Array.from(map.keys()).sort().forEach((v) => {
      out += `*${v.toUpperCase()}*\n`;
      map.get(v)!.forEach((t) => {
        out += `${formatDateIndo(t.tgl_kirim_vendor)}\n`;
        out += `${String(t.nama_barang || '-').toUpperCase()}\n`;
        out += `├─ S/N: ${t.serial_number || '-'}\n`;
        out += `├─ Keluhan: ${t.keluhan || '-'}\n`;
        out += `└─ Catt: ${t.catatan || '-'}\n`;
      });
      out += `\n`;
    });
    return out;
  }

  function groupBelumDiproses(items: Ticket[]): string {
    const map = new Map<string, Ticket[]>();
    for (const t of items) {
      const v = cleanVendorName(t.distributor_vendor || 'LAINNYA');
      if (!map.has(v)) map.set(v, []);
      map.get(v)!.push(t);
    }
    let out = '';
    Array.from(map.keys()).sort().forEach((v) => {
      out += `*${v.toUpperCase()}*\n`;
      map.get(v)!.forEach((t) => {
        out += `${String(t.nama_barang || '-').toUpperCase()}\n`;
        out += `├─ S/N: ${t.serial_number || '-'}\n`;
        out += `├─ Keluhan: ${t.keluhan || '-'}\n`;
        out += `├─ User: ${(t.nama_customer || '').toUpperCase() === 'STOCK BCT' ? 'Stok' : (t.nama_customer || '-')}\n`;
        out += `└─ Catt: ${t.catatan || '-'}\n`;
      });
      out += `\n`;
    });
    return out;
  }

  const SEP = '--------------------------------------------------\n--------------------------------------------------\n';

  let text = '';
  text += `*GARANSIAN SELESAI ${dateDisplay} (STOK BCT/GHITP)*\n\n`;
  text += selesai.length === 0 ? '(Belum ada unit stok baru yang selesai)\n\n' : groupSelesai(selesai);
  text += SEP;
  text += `*GARANSIAN DI VENDOR BDG (STOK BCT/GHITP)*\n\n`;
  text += diVendorBdg.length === 0 ? '(Kosong)\n\n' : groupVendor(diVendorBdg);
  text += SEP;
  text += `*GARANSIAN DI VENDOR JKT (STOK BCT/GHITP)*\n\n`;
  text += diVendorJkt.length === 0 ? '(Kosong)\n\n' : groupVendor(diVendorJkt);
  text += SEP;
  text += `*GARANSIAN BELUM DIPROSES (STOK BCT/GHITP)*\n\n`;
  text += belumDiproses.length === 0
    ? '(Semua stok garansi telah diproses)\n\n'
    : groupBelumDiproses(belumDiproses);
  text += `Best Computel RMA & Stock Division`;

  return text;
}

/**
 * Buat link langsung WhatsApp Web / App
 */
export function createWhatsAppUrl(phone: string, message: string): string {
  const formattedPhone = formatPhoneNumber(phone);
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${formattedPhone}?text=${encodedText}`;
}
