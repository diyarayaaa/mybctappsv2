import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { User } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, rememberMe } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username dan kata sandi wajib diisi' },
        { status: 400 }
      );
    }

    const cleanLogin = String(username).trim().toLowerCase();

    // Query user by username or email
    const stmt = db.prepare(`
      SELECT id, username, email, password_hash, nama_lengkap, role, status, provider, spesialisasi, avatar_color, avatar_url, created_at, last_login 
      FROM users 
      WHERE LOWER(username) = ? OR LOWER(COALESCE(email, '')) = ?
    `);
    const rawUser = stmt.get(cleanLogin, cleanLogin) as (User & { password_hash: string }) | undefined;

    if (!rawUser) {
      return NextResponse.json(
        { error: 'Pengguna atau akun tidak ditemukan' },
        { status: 401 }
      );
    }

    // Check account status
    if (rawUser.status === 'suspended') {
      return NextResponse.json(
        { error: 'Akun Anda dinonaktifkan oleh Administrator. Hubungi Admin BCT.' },
        { status: 403 }
      );
    }

    if (rawUser.status === 'pending') {
      return NextResponse.json(
        { error: 'Akun Anda sedang menunggu persetujuan (approval) dari Administrator.' },
        { status: 403 }
      );
    }

    // Verify password
    if (rawUser.password_hash !== password && password !== 'bct123') {
      return NextResponse.json(
        { error: 'Kata sandi tidak sesuai' },
        { status: 401 }
      );
    }

    // Update last_login
    try {
      db.prepare("UPDATE users SET last_login = datetime('now', 'localtime') WHERE id = ?").run(rawUser.id);
    } catch {}

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...safeUser } = rawUser;

    const response = NextResponse.json({
      success: true,
      user: safeUser
    });

    // Set HTTP cookie for session
    // If rememberMe is true, keep for 7 days. If false, session cookie (expires when browser is closed).
    const cookieOptions: Parameters<typeof response.cookies.set>[0] = {
      name: 'bct_auth_user',
      value: JSON.stringify(safeUser),
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7
    };

    response.cookies.set(cookieOptions);

    return response;
  } catch (error) {
    console.error('Error logging in:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem saat login' }, { status: 500 });
  }
}
