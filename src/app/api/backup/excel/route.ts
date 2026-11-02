import { NextResponse } from 'next/server';
import { generateBackupExcelBuffer, getJakartaNow } from '@/lib/backup';

export async function GET() {
  try {
    const buffer = generateBackupExcelBuffer();
    const { dateStr } = getJakartaNow();
    const filename = `Backup_Database_BCT_${dateStr}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || 'Gagal membuat file Excel backup' },
      { status: 500 }
    );
  }
}

