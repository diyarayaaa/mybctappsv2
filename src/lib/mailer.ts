import nodemailer from 'nodemailer';
import { db } from '@/lib/db';

export interface SendOtpResult {
  success: boolean;
  simulated: boolean;
  message: string;
  error?: string;
}

export function getSmtpCredentials() {
  let user = process.env.GMAIL_USER || process.env.SMTP_USER || '';
  let pass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || '';

  if (!user || !pass) {
    try {
      const userRow = db.prepare("SELECT value FROM app_settings WHERE key = 'smtp_user'").get() as { value: string } | undefined;
      const passRow = db.prepare("SELECT value FROM app_settings WHERE key = 'smtp_pass'").get() as { value: string } | undefined;
      if (userRow?.value && passRow?.value) {
        user = userRow.value;
        pass = passRow.value;
      }
    } catch {}
  }

  // Remove spaces if copied with spaces from Google App Password
  pass = pass.replace(/\s+/g, '');

  return { user, pass };
}

export async function sendOtpEmail(toEmail: string, code: string, recipientName: string): Promise<SendOtpResult> {
  const { user: smtpUser, pass: smtpPass } = getSmtpCredentials();

  // Branded HTML Template
  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background-color: #f8fafc; border-radius: 20px;">
      <div style="background-color: #ffffff; padding: 32px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; background-color: #2563eb; color: #ffffff; font-weight: 900; font-size: 14px; padding: 6px 14px; border-radius: 10px; letter-spacing: 1px;">
            BEST COMPUTEL RMA
          </div>
          <h2 style="color: #0f172a; font-size: 20px; font-weight: 800; margin-top: 16px; margin-bottom: 6px;">Kode Verifikasi Login</h2>
          <p style="color: #64748b; font-size: 13px; margin: 0;">Gunakan kode di bawah ini untuk mengakses sistem BCT Service.</p>
        </div>

        <div style="background-color: #eff6ff; border: 2px dashed #93c5fd; border-radius: 14px; padding: 20px; text-align: center; margin: 24px 0;">
          <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #1d4ed8; font-family: monospace;">
            ${code}
          </span>
          <p style="color: #3b82f6; font-size: 11px; margin-top: 8px; font-weight: 600;">Berlaku selama 5 menit</p>
        </div>

        <p style="color: #334155; font-size: 13px; line-height: 1.5; margin-bottom: 12px;">
          Halo <strong>${recipientName}</strong>,
        </p>
        <p style="color: #64748b; font-size: 12px; line-height: 1.6; margin-bottom: 20px;">
          Permintaan masuk ke akun Best Computel Anda telah diterima. Masukkan 6-digit kode di atas pada layar login untuk memverifikasi akun Anda.
        </p>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center;">
          <p style="color: #94a3b8; font-size: 11px; margin: 0;">
            © 2026 Best Computel RMA & Service System. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  `;

  // If credentials are not configured
  if (!smtpUser || !smtpPass) {
    console.error('[BCT MAILER] SMTP pengirim belum dikonfigurasi!');
    return {
      success: false,
      simulated: false,
      message: 'Email belum di konfirmasi, hubungi administrator untuk info lebih lanjut.',
      error: 'SMTP_NOT_CONFIGURED'
    };
  }

  // Send real email via Gmail / SMTP
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    await transporter.sendMail({
      from: `"Best Computel Service" <${smtpUser}>`,
      to: toEmail,
      subject: `[${code}] Kode Verifikasi Login Best Computel`,
      text: `Kode verifikasi Best Computel Anda adalah: ${code}. Berlaku selama 5 menit.`,
      html: htmlContent
    });

    return {
      success: true,
      simulated: false,
      message: `Kode verifikasi telah dikirim ke ${toEmail}. Silakan periksa inbox atau folder spam email Anda.`
    };
  } catch (err) {
    console.error('[BCT MAILER] Gagal mengirim email via Gmail SMTP:', err);
    return {
      success: false,
      simulated: false,
      message: 'Email belum di konfirmasi, hubungi administrator untuk info lebih lanjut.',
      error: (err as Error).message
    };
  }
}
