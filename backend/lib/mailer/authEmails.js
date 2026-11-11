import { sendEmail } from './emailClient.js';
import { escapeHtml } from './emailUtils.js';

// ─── Channel A: OTP & Auth Emails (Uses Auth Domain) ─────────────────────────
export async function sendOtpEmail(toEmail, otp) {
  if (process.env.ENABLE_EMAIL_AUTH !== 'true') {
    return { skipped: true, reason: 'EMAIL_AUTH_DISABLED' };
  }
  return sendEmail({
    to: toEmail,
    channel: 'auth',
    subject: 'Kode Verifikasi Kalceria',
    text: `Hai Kalcerian! Ini adalah kode verifikasi mu: ${otp}. Harap jangan bagikan kode ini.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #eee;border-radius:8px;background:#ffffff;">
        <div style="text-align:center;margin-bottom:20px;">
          <img src="https://www.kalceria.id/favicon.png" alt="Kalceria" width="56" height="50" style="display:inline-block;border:none;outline:none;" />
        </div>
        <h2 style="color:#1a1a1a;">Verifikasi Akun Kalceria</h2>
        <p>Hai Kalcerian!</p>
        <p>Ini adalah kode verifikasi OTP akun kamu:</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#4F46E5;padding:16px 0;">${escapeHtml(otp)}</div>
        <p style="color:#666;font-size:13px;">Kode berlaku 1 menit. Harap jangan bagikan kode ini kepada siapapun demi keamanan akun kamu.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(toEmail, token, explicitOrigin, fromMap = false) {
  if (process.env.ENABLE_EMAIL_AUTH !== 'true') {
    return { skipped: true, reason: 'EMAIL_AUTH_DISABLED' };
  }
  let frontendOrigin = explicitOrigin;
  if (!frontendOrigin) {
    const configured = process.env.FRONTEND_URL?.split(',')[0]?.trim();
    if (configured && !configured.includes('vercel.app')) {
      frontendOrigin = configured;
    } else {
      frontendOrigin = 'https://kalceria.id';
    }
  }
  if (!frontendOrigin.startsWith('http')) {
    frontendOrigin = `https://${frontendOrigin}`;
  }
  const resetUrl = new URL('/', frontendOrigin);
  resetUrl.searchParams.set('mode', 'reset-password');
  resetUrl.searchParams.set('reset_token', token);
  resetUrl.searchParams.set('token', token);
  if (fromMap) {
    resetUrl.searchParams.set('from', 'map');
  }
  return sendEmail({
    to: toEmail,
    channel: 'auth',
    subject: 'Reset Password Akun Kalceria',
    text: `Hai Kalcerian! Klik link berikut untuk mereset password akun kamu: ${resetUrl.href} (Link berlaku 1 menit). Harap jangan bagikan link ini kepada siapapun demi keamanan akun kamu.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #eee;border-radius:8px;background:#ffffff;">
        <div style="text-align:center;margin-bottom:20px;">
          <img src="https://www.kalceria.id/favicon.png" alt="Kalceria" width="56" height="50" style="display:inline-block;border:none;outline:none;" />
        </div>
        <h2 style="color:#1a1a1a;margin-top:0;">Reset Password Kalceria</h2>
        <p>Hai Kalcerian!</p>
        <p>Kami menerima permintaan untuk mereset kata sandi akun Kalceria kamu. Klik tombol di bawah untuk membuat password baru:</p>
        <div style="text-align:center;padding:16px 0;">
          <a href="${resetUrl.href}" style="display:inline-block;background:#000000;color:#ffffff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px;letter-spacing:0.5px;">RESET PASSWORD</a>
        </div>
        <p style="color:#666;font-size:13px;line-height:1.5;">Atau gunakan link berikut secara manual di browser:<br/><a href="${resetUrl.href}" style="color:#2563eb;word-break:break-all;">${resetUrl.href}</a></p>
        <p style="color:#999;font-size:12px;margin-top:24px;border-top:1px solid #f0f0f0;padding-top:12px;">Link berlaku selama 1 menit. Jika kamu tidak merasa meminta reset password, abaikan email ini.</p>
      </div>
    `,
  });
}

