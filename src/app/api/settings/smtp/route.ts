import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { db } from '@/lib/db';
import { User } from '@/types';
import { getSmtpCredentials } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

function getAdminUser(request: NextRequest): User | null {
  const userCookie = request.cookies.get('bct_auth_user');
  if (!userCookie?.value) return null;
  try {
    let cookieVal = userCookie.value;
    try {
      cookieVal = decodeURIComponent(cookieVal);
    } catch {}
    const parsed = JSON.parse(cookieVal);
    const userId = parsed.id || parsed.username;
    if (!userId) return null;
    const stmt = db.prepare('SELECT id, username, email, nama_lengkap, role, status FROM users WHERE id = ? OR username = ?');
    const user = stmt.get(userId, userId) as User | undefined;
    if (user && user.role === 'ADMIN' && user.status === 'active') {
      return user;
    }
  } catch {}
  return null;
}

// GET /api/settings/smtp - Check SMTP status (Admin only)
export async function GET(request: NextRequest) {
  const admin = getAdminUser(request);
  if (!admin) {
    return NextResponse.json({ error: 'Akses ditolak. Khusus Admin.' }, { status: 403 });
  }

  const { user: smtpUser, pass: smtpPass } = getSmtpCredentials();
  const isConfigured = Boolean(smtpUser && smtpPass);

  return NextResponse.json({
    success: true,
    configured: isConfigured,
    email: smtpUser || null
  });
}

// POST /api/settings/smtp - Save and test SMTP credentials (Admin only)
export async function POST(request: NextRequest) {
  const admin = getAdminUser(request);
  if (!admin) {
    return NextResponse.json({ error: 'Akses ditolak. Khusus Admin.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { email, app_password } = body;

    if (!email || !app_password) {
      return NextResponse.json(
        { error: 'Email Gmail pengirim dan Sandi Aplikasi (App Password) wajib diisi.' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(app_password).replace(/\s+/g, '').trim();

    // Test verify with Gmail SMTP server
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: cleanEmail,
        pass: cleanPassword
      }
    });

    try {
      await transporter.verify();
    } catch (testErr) {
      console.error('SMTP Verification failed:', testErr);
      return NextResponse.json(
        {
          error: `Koneksi ke Gmail gagal: ${(testErr as Error).message}. Pastikan akun Gmail telah mengaktifkan Verifikasi 2 Langkah (2-Step Verification) dan gunakan Sandi Aplikasi (App Password 16 karakter).`
        },
        { status: 400 }
      );
    }

    // Save to app_settings table
    const saveStmt = db.prepare(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (?, ?, datetime('now', 'localtime'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now', 'localtime')
    `);

    saveStmt.run('smtp_user', cleanEmail);
    saveStmt.run('smtp_pass', cleanPassword);

    // Audit log
    try {
      db.prepare(`
        INSERT INTO audit_logs (actor, action, keterangan)
        VALUES (?, 'CONFIG_SMTP', ?)
      `).run(admin.nama_lengkap, `Memperbarui akun Gmail pengirim OTP ke: ${cleanEmail}`);
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Akun Gmail (${cleanEmail}) berhasil diverifikasi dan disimpan sebagai pengirim OTP!`
    });
  } catch (error) {
    console.error('Error saving SMTP settings:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem saat menyimpan pengaturan SMTP.' },
      { status: 500 }
    );
  }
}
