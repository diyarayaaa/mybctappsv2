import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { User, UserRole, UserStatus } from '@/types';

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
  } catch (err) {
    console.error('Error verifying admin user:', err);
  }
  return null;
}

// GET /api/users - List all users (Admin only)
export async function GET(request: NextRequest) {
  const admin = getAdminUser(request);
  if (!admin) {
    return NextResponse.json(
      { error: 'Akses ditolak. Fitur ini hanya dapat diakses oleh Admin.' },
      { status: 403 }
    );
  }

  try {
    const stmt = db.prepare(`
      SELECT id, username, email, nama_lengkap, role, status, provider, spesialisasi, avatar_color, avatar_url, created_at, last_login
      FROM users
      ORDER BY 
        CASE role WHEN 'ADMIN' THEN 1 WHEN 'TEKNISI' THEN 2 WHEN 'SALES' THEN 3 ELSE 4 END,
        created_at DESC
    `);
    const users = stmt.all() as User[];

    return NextResponse.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data pengguna' },
      { status: 500 }
    );
  }
}

// POST /api/users - Create new user (Admin only)
export async function POST(request: NextRequest) {
  const admin = getAdminUser(request);
  if (!admin) {
    return NextResponse.json(
      { error: 'Akses ditolak. Fitur ini hanya dapat diakses oleh Admin.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { username, email, nama_lengkap, password, role, spesialisasi, status } = body;

    if (!username || !nama_lengkap || !role) {
      return NextResponse.json(
        { error: 'Username, nama lengkap, dan role wajib diisi' },
        { status: 400 }
      );
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const cleanEmail = email ? String(email).trim().toLowerCase() : null;
    const cleanPassword = password ? String(password).trim() : 'bct123';
    const cleanRole: UserRole = role || 'TEKNISI';
    const cleanStatus: UserStatus = status || 'active';

    // Check duplicate username
    const checkStmt = db.prepare('SELECT id FROM users WHERE LOWER(username) = ?');
    if (checkStmt.get(cleanUsername)) {
      return NextResponse.json(
        { error: `Username "${cleanUsername}" sudah digunakan.` },
        { status: 400 }
      );
    }

    if (cleanEmail) {
      const checkEmailStmt = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?');
      if (checkEmailStmt.get(cleanEmail)) {
        return NextResponse.json(
          { error: `Email "${cleanEmail}" sudah terdaftar pada akun lain.` },
          { status: 400 }
        );
      }
    }

    const id = `usr-${Date.now().toString(36)}`;
    const colors = ['blue', 'emerald', 'purple', 'amber', 'rose', 'indigo'];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];

    const insertStmt = db.prepare(`
      INSERT INTO users (id, username, password_hash, nama_lengkap, role, email, status, provider, spesialisasi, avatar_color, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'credentials', ?, ?, datetime('now', 'localtime'))
    `);

    insertStmt.run(
      id,
      cleanUsername,
      cleanPassword,
      nama_lengkap.trim(),
      cleanRole,
      cleanEmail,
      cleanStatus,
      spesialisasi?.trim() || null,
      avatarColor
    );

    // Audit log
    try {
      db.prepare(`
        INSERT INTO audit_logs (actor, action, keterangan)
        VALUES (?, 'CREATE_USER', ?)
      `).run(admin.nama_lengkap, `Menambahkan user baru: ${nama_lengkap} (@${cleanUsername}) sebagai ${cleanRole}`);
    } catch {}

    const newUser: User = {
      id,
      username: cleanUsername,
      email: cleanEmail,
      nama_lengkap: nama_lengkap.trim(),
      role: cleanRole,
      status: cleanStatus,
      provider: 'credentials',
      spesialisasi: spesialisasi?.trim() || null,
      avatar_color: avatarColor
    };

    return NextResponse.json({
      success: true,
      message: 'User berhasil dibuat',
      user: newUser
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem saat membuat user' },
      { status: 500 }
    );
  }
}
