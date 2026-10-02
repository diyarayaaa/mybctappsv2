import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { User } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code, rememberMe } = body;

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email dan kode verifikasi wajib diisi.' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanCode = String(code).trim();

    // 1. Fetch latest active OTP
    const otpStmt = db.prepare(`
      SELECT id, code, expires_at, used 
      FROM auth_otps 
      WHERE LOWER(email) = ? AND used = 0
      ORDER BY id DESC LIMIT 1
    `);
    const otpRecord = otpStmt.get(cleanEmail) as { id: number; code: string; expires_at: string; used: number } | undefined;

    if (!otpRecord) {
      return NextResponse.json(
        { error: 'Kode verifikasi tidak ditemukan atau sudah digunakan. Silakan minta kode baru.' },
        { status: 400 }
      );
    }

    // Check expiration using sqlite datetime check
    const isExpiredStmt = db.prepare(`
      SELECT 1 FROM auth_otps 
      WHERE id = ? AND expires_at < datetime('now', 'localtime')
    `);
    if (isExpiredStmt.get(otpRecord.id)) {
      return NextResponse.json(
        { error: 'Kode verifikasi telah kadaluarsa (melewati 5 menit). Silakan minta kode baru.' },
        { status: 400 }
      );
    }

    // Check code match
    if (otpRecord.code !== cleanCode) {
      return NextResponse.json(
        { error: 'Kode verifikasi yang Anda masukkan salah. Periksa kembali email Anda.' },
        { status: 400 }
      );
    }

    // Mark OTP as used
    db.prepare('UPDATE auth_otps SET used = 1 WHERE id = ?').run(otpRecord.id);

    // 2. Fetch User data
    const userStmt = db.prepare(`
      SELECT id, username, email, nama_lengkap, role, status, provider, spesialisasi, avatar_color, avatar_url, created_at, last_login 
      FROM users 
      WHERE LOWER(email) = ?
    `);
    const targetUser = userStmt.get(cleanEmail) as User | undefined;

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Data pengguna tidak ditemukan di sistem.' },
        { status: 404 }
      );
    }

    if (targetUser.status === 'suspended') {
      return NextResponse.json(
        { error: 'Akun Anda sedang dinonaktifkan oleh Administrator.' },
        { status: 403 }
      );
    }

    // 3. Update last_login and set provider to google
    try {
      db.prepare(`
        UPDATE users 
        SET last_login = datetime('now', 'localtime'),
            provider = 'google'
        WHERE id = ?
      `).run(targetUser.id);
    } catch {}

    const safeUser: User = {
      ...targetUser,
      provider: 'google',
      last_login: new Date().toISOString()
    };

    const response = NextResponse.json({
      success: true,
      user: safeUser,
      message: `Selamat datang kembali, ${safeUser.nama_lengkap}!`
    });

    const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7;
    response.cookies.set({
      name: 'bct_auth_user',
      value: JSON.stringify(safeUser),
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge
    });

    return response;
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem saat memverifikasi kode.' },
      { status: 500 }
    );
  }
}
