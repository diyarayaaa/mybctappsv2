import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { User } from '@/types';
import { sendOtpEmail } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Alamat email Gmail wajib diisi.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { error: 'Format alamat email tidak valid.' },
        { status: 400 }
      );
    }

    // 1. Check if user is registered by Admin in the system
    const userStmt = db.prepare(`
      SELECT id, username, email, nama_lengkap, role, status 
      FROM users 
      WHERE LOWER(email) = ?
    `);
    const registeredUser = userStmt.get(cleanEmail) as User | undefined;

    if (!registeredUser) {
      return NextResponse.json(
        {
          error: 'Email belum di konfirmasi, hubungi administrator untuk info lebih lanjut.'
        },
        { status: 404 }
      );
    }

    // 2. Check user status
    if (registeredUser.status === 'suspended' || registeredUser.status === 'pending') {
      return NextResponse.json(
        { error: 'Email belum di konfirmasi, hubungi administrator untuk info lebih lanjut.' },
        { status: 403 }
      );
    }

    // 3. Rate limit: check if an OTP was sent in the last 20 seconds
    try {
      const recentOtpStmt = db.prepare(`
        SELECT id FROM auth_otps 
        WHERE LOWER(email) = ? 
          AND used = 0 
          AND created_at > datetime('now', '-20 seconds', 'localtime')
      `);
      if (recentOtpStmt.get(cleanEmail)) {
        return NextResponse.json(
          { error: 'Mohon tunggu 20 detik sebelum meminta kode verifikasi baru.' },
          { status: 429 }
        );
      }
    } catch {}

    // 4. Invalidate older unused OTPs for this email
    try {
      db.prepare(`
        UPDATE auth_otps 
        SET used = 2 
        WHERE LOWER(email) = ? AND used = 0
      `).run(cleanEmail);
    } catch {}

    // 5. Generate secure 6-digit OTP code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 6. Save OTP with 5 minutes validity
    const insertOtpStmt = db.prepare(`
      INSERT INTO auth_otps (email, code, expires_at, used, created_at)
      VALUES (?, ?, datetime('now', '+5 minutes', 'localtime'), 0, datetime('now', 'localtime'))
    `);
    insertOtpStmt.run(cleanEmail, code);

    // 7. Send OTP via email / mailer
    const mailResult = await sendOtpEmail(cleanEmail, code, registeredUser.nama_lengkap);

    if (!mailResult.success) {
      console.error('[OTP SEND FAILED]', mailResult.message, mailResult.error);
      return NextResponse.json(
        { error: 'Email belum di konfirmasi, hubungi administrator untuk info lebih lanjut.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Kode verifikasi telah dikirim ke ${cleanEmail}. Silakan periksa kotak masuk atau folder spam email Anda.`
    });
  } catch (error) {
    console.error('Error in send OTP route:', error);
    return NextResponse.json(
      { error: 'Email belum di konfirmasi, hubungi administrator untuk info lebih lanjut.' },
      { status: 500 }
    );
  }
}
