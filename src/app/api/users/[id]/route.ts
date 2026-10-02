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

// PUT /api/users/[id] - Update user details, role, status, or reset password
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = getAdminUser(request);
  if (!admin) {
    return NextResponse.json(
      { error: 'Akses ditolak. Fitur ini hanya dapat diakses oleh Admin.' },
      { status: 403 }
    );
  }

  const { id } = await params;

  try {
    const targetStmt = db.prepare('SELECT id, username, email, nama_lengkap, role, status, provider FROM users WHERE id = ?');
    const targetUser = targetStmt.get(id) as User | undefined;

    if (!targetUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    const body = await request.json();
    const { role, status, nama_lengkap, email, spesialisasi, password } = body;

    // Safety checks for self-modification
    if (admin.id === targetUser.id) {
      if (status && status !== 'active') {
        return NextResponse.json(
          { error: 'Anda tidak dapat menonaktifkan akun Admin yang sedang Anda gunakan.' },
          { status: 400 }
        );
      }
      if (role && role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Anda tidak dapat menurunkan role akun Admin Anda sendiri.' },
          { status: 400 }
        );
      }
    }

    // Safety check: ensure at least 1 active ADMIN remains
    if (targetUser.role === 'ADMIN' && ((role && role !== 'ADMIN') || (status && status !== 'active'))) {
      const adminCountStmt = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'ADMIN' AND status = 'active' AND id != ?");
      const otherAdmins = (adminCountStmt.get(id) as { count: number }).count;
      if (otherAdmins === 0) {
        return NextResponse.json(
          { error: 'Tidak dapat mengubah role/status. Harus tersisa minimal 1 Admin aktif dalam sistem.' },
          { status: 400 }
        );
      }
    }

    const newRole: UserRole = role || targetUser.role;
    const newStatus: UserStatus = status || (targetUser.status || 'active');
    const newName = nama_lengkap ? String(nama_lengkap).trim() : targetUser.nama_lengkap;
    const newEmail = email !== undefined ? (email ? String(email).trim().toLowerCase() : null) : (targetUser.email ?? null);
    const newSpesialisasi = spesialisasi !== undefined ? (spesialisasi ? String(spesialisasi).trim() : null) : (targetUser.spesialisasi ?? null);

    // Check duplicate email if changed
    if (newEmail && newEmail !== targetUser.email) {
      const checkEmailStmt = db.prepare('SELECT id FROM users WHERE LOWER(email) = ? AND id != ?');
      if (checkEmailStmt.get(newEmail, id)) {
        return NextResponse.json(
          { error: `Email "${newEmail}" sudah digunakan oleh pengguna lain.` },
          { status: 400 }
        );
      }
    }

    if (password && String(password).trim()) {
      db.prepare(`
        UPDATE users 
        SET role = ?, status = ?, nama_lengkap = ?, email = ?, spesialisasi = ?, password_hash = ?
        WHERE id = ?
      `).run(newRole, newStatus, newName, newEmail, newSpesialisasi, String(password).trim(), id);
    } else {
      db.prepare(`
        UPDATE users 
        SET role = ?, status = ?, nama_lengkap = ?, email = ?, spesialisasi = ?
        WHERE id = ?
      `).run(newRole, newStatus, newName, newEmail, newSpesialisasi, id);
    }

    // Audit log
    try {
      db.prepare(`
        INSERT INTO audit_logs (actor, action, keterangan)
        VALUES (?, 'UPDATE_USER', ?)
      `).run(admin.nama_lengkap, `Memperbarui data user: ${newName} (@${targetUser.username}), Role: ${newRole}, Status: ${newStatus}`);
    } catch {}

    const updatedUserStmt = db.prepare('SELECT id, username, email, nama_lengkap, role, status, provider, spesialisasi, avatar_color, avatar_url, created_at, last_login FROM users WHERE id = ?');
    const updatedUser = updatedUserStmt.get(id) as User;

    return NextResponse.json({
      success: true,
      message: 'Data pengguna berhasil diperbarui',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem saat memperbarui pengguna' },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Delete a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = getAdminUser(request);
  if (!admin) {
    return NextResponse.json(
      { error: 'Akses ditolak. Fitur ini hanya dapat diakses oleh Admin.' },
      { status: 403 }
    );
  }

  const { id } = await params;

  try {
    const targetStmt = db.prepare('SELECT id, username, nama_lengkap, role FROM users WHERE id = ?');
    const targetUser = targetStmt.get(id) as User | undefined;

    if (!targetUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    // Cannot delete own active account
    if (admin.id === targetUser.id) {
      return NextResponse.json(
        { error: 'Anda tidak dapat menghapus akun Admin yang sedang Anda gunakan saat ini.' },
        { status: 400 }
      );
    }

    // Cannot delete last admin
    if (targetUser.role === 'ADMIN') {
      const adminCountStmt = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'ADMIN' AND id != ?");
      const otherAdmins = (adminCountStmt.get(id) as { count: number }).count;
      if (otherAdmins === 0) {
        return NextResponse.json(
          { error: 'Tidak dapat menghapus. Harus ada minimal 1 akun Admin di dalam sistem.' },
          { status: 400 }
        );
      }
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);

    // Audit log
    try {
      db.prepare(`
        INSERT INTO audit_logs (actor, action, keterangan)
        VALUES (?, 'DELETE_USER', ?)
      `).run(admin.nama_lengkap, `Menghapus user: ${targetUser.nama_lengkap} (@${targetUser.username}) [${targetUser.role}]`);
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Pengguna ${targetUser.nama_lengkap} berhasil dihapus.`
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem saat menghapus pengguna' },
      { status: 500 }
    );
  }
}
