import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/app-config';
import fs from 'node:fs';
import path from 'node:path';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/svg+xml': 'svg',
  'image/webp': 'webp'
};

export async function POST(request: NextRequest) {
  const admin = getAuthenticatedAdmin(request);
  if (!admin) {
    return NextResponse.json(
      { error: 'Akses ditolak (403). Hanya Admin yang dapat mengunggah logo.' },
      { status: 403 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'File logo belum dipilih' }, { status: 400 });
    }

    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
      return NextResponse.json(
        { error: 'Format file tidak didukung. Gunakan PNG, JPG, SVG, atau WEBP.' },
        { status: 400 }
      );
    }

    // Max 2MB
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Ukuran file maksimal 2MB.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save to public/uploads when filesystem is writable, fallback to data URI (e.g. Vercel)
    let logoUrl = '';
    try {
      if (!process.env.VERCEL) {
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const filename = `brand-logo-${Date.now()}.${ext}`;
        const filePath = path.join(uploadsDir, filename);
        fs.writeFileSync(filePath, buffer);
        logoUrl = `/uploads/${filename}`;
      } else {
        logoUrl = `data:${file.type};base64,${buffer.toString('base64')}`;
      }
    } catch {
      logoUrl = `data:${file.type};base64,${buffer.toString('base64')}`;
    }

    return NextResponse.json({
      success: true,
      url: logoUrl,
      message: 'Logo berhasil diunggah'
    });
  } catch (error) {
    console.error('[api/settings/logo] Upload error:', error);
    return NextResponse.json(
      { error: 'Gagal mengunggah logo' },
      { status: 500 }
    );
  }
}

