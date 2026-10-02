import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { User } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const userCookie = request.cookies.get('bct_auth_user');

    if (userCookie?.value) {
      try {
        let cookieVal = userCookie.value;
        try {
          cookieVal = decodeURIComponent(cookieVal);
        } catch {}

        let userId: string | null = null;
        try {
          const parsed = JSON.parse(cookieVal);
          userId = typeof parsed === 'object' && parsed !== null ? (parsed.id || parsed.username) : String(parsed);
        } catch {
          userId = cookieVal;
        }

        if (userId) {
          const stmt = db.prepare('SELECT id, username, email, nama_lengkap, role, status, provider, spesialisasi, avatar_color, avatar_url, created_at, last_login FROM users WHERE id = ? OR username = ?');
          const user = stmt.get(userId, userId) as User | undefined;
          if (user) {
            if (user.status === 'suspended') {
              const res = NextResponse.json({ authenticated: false, user: null, error: 'Akun dinonaktifkan' }, { status: 403 });
              res.cookies.delete('bct_auth_user');
              return res;
            }
            return NextResponse.json({ authenticated: true, user });
          }
        }
      } catch (err) {
        console.error('Error parsing user cookie:', err);
      }
    }

    // If no valid session cookie is present, user is unauthenticated
    return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
  } catch (error) {
    console.error('Error in auth me route:', error);
    return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
  }
}
