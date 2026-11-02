import { NextResponse } from 'next/server';
import {
  getBackupConfig,
  saveBackupConfig,
  runGoogleSheetsBackup,
  checkAndRunDailyAutoBackup,
  collectDatabaseSnapshot,
  GOOGLE_APPS_SCRIPT_TEMPLATE
} from '@/lib/backup';

export async function GET() {
  try {
    // Also opportunistically check if daily auto-backup should run
    checkAndRunDailyAutoBackup().catch((e) =>
      console.error('[api/backup] Auto backup check error:', e)
    );

    const config = getBackupConfig();
    const snapshot = collectDatabaseSnapshot();

    return NextResponse.json({
      config,
      counts: snapshot.counts,
      scriptTemplate: GOOGLE_APPS_SCRIPT_TEMPLATE
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || 'Gagal memuat konfigurasi backup' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'save_config') {
      const updated = saveBackupConfig({
        enabled: Boolean(body.enabled),
        webhookUrl: String(body.webhookUrl || '').trim(),
        spreadsheetUrl: String(body.spreadsheetUrl || '').trim(),
        scheduleTime: String(body.scheduleTime || '17:00').trim()
      });
      return NextResponse.json({
        ok: true,
        message: 'Pengaturan backup otomatis berhasil disimpan.',
        config: updated
      });
    }

    if (action === 'run_now') {
      // Save URL first if passed in request
      if (body.webhookUrl !== undefined) {
        saveBackupConfig({
          webhookUrl: String(body.webhookUrl || '').trim(),
          spreadsheetUrl:
            body.spreadsheetUrl !== undefined
              ? String(body.spreadsheetUrl || '').trim()
              : undefined
        });
      }

      const result = await runGoogleSheetsBackup(
        'MANUAL',
        body.webhookUrl ? String(body.webhookUrl).trim() : undefined
      );

      if (!result.ok) {
        return NextResponse.json(
          { error: result.message, config: result.config },
          { status: 400 }
        );
      }

      return NextResponse.json({
        ok: true,
        message: result.message,
        config: result.config
      });
    }

    if (action === 'check_auto') {
      const res = await checkAndRunDailyAutoBackup();
      return NextResponse.json({
        ok: true,
        triggered: res.triggered,
        message: res.message || null,
        config: getBackupConfig()
      });
    }

    return NextResponse.json({ error: 'Action tidak dikenali' }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || 'Terjadi kesalahan saat memproses backup' },
      { status: 500 }
    );
  }
}

