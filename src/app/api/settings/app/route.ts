import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedAdmin,
  getFullAppConfig,
  resetAppConfigToDefaults,
  saveFullAppConfig
} from '@/lib/app-config';
import { logActivity } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// GET /api/settings/app - Public read for UI branding, feature toggles, KPI & form config
export async function GET() {
  try {
    const config = getFullAppConfig();
    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('[api/settings/app] GET error:', error);
    return NextResponse.json(
      { error: 'Gagal memuat konfigurasi aplikasi' },
      { status: 500 }
    );
  }
}

// PUT /api/settings/app - Strict Admin-only update
export async function PUT(request: NextRequest) {
  const admin = getAuthenticatedAdmin(request);
  if (!admin) {
    return NextResponse.json(
      { error: 'Akses ditolak (403). Hanya Admin yang dapat mengubah Pengaturan Aplikasi.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const updated = saveFullAppConfig(body);

    const changedParts: string[] = [];
    if (body.branding) changedParts.push('Branding');
    if (body.features) changedParts.push('Feature Toggle');
    if (body.kpis) changedParts.push('KPI Dashboard');
    if (body.fields) changedParts.push('Form & Kolom Tabel');
    if (body.presets) changedParts.push('Preset Dropdown');

    logActivity(
      null,
      null,
      admin.nama_lengkap,
      'UPDATE_WHITELABEL',
      `Admin ${admin.nama_lengkap} memperbarui Pengaturan White-Label (${changedParts.join(', ') || 'Umum'})`
    );

    return NextResponse.json({
      success: true,
      message: 'Pengaturan aplikasi berhasil disimpan & diterapkan.',
      config: updated
    });
  } catch (error) {
    console.error('[api/settings/app] PUT error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Gagal menyimpan pengaturan aplikasi' },
      { status: 500 }
    );
  }
}

// DELETE /api/settings/app - Strict Admin-only reset to defaults
export async function DELETE(request: NextRequest) {
  const admin = getAuthenticatedAdmin(request);
  if (!admin) {
    return NextResponse.json(
      { error: 'Akses ditolak (403). Hanya Admin yang dapat mereset Pengaturan Aplikasi.' },
      { status: 403 }
    );
  }

  try {
    const config = resetAppConfigToDefaults();
    logActivity(
      null,
      null,
      admin.nama_lengkap,
      'RESET_WHITELABEL',
      `Admin ${admin.nama_lengkap} mereset Pengaturan White-Label ke default bawaan`
    );
    return NextResponse.json({
      success: true,
      message: 'Pengaturan aplikasi berhasil dikembalikan ke default.',
      config
    });
  } catch (error) {
    console.error('[api/settings/app] DELETE error:', error);
    return NextResponse.json(
      { error: 'Gagal mereset pengaturan aplikasi' },
      { status: 500 }
    );
  }
}

