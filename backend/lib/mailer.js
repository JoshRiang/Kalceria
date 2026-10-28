import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const DEFAULT_FROM = process.env.EMAIL_FROM || 'Kalceria <onboarding@resend.dev>';

// ─── General Send Email ──────────────────────────────────────────────────────
// Single point of contact to Resend API. All other functions call this.
export async function sendEmail({ to, subject, html, text, from }) {
  if (!resend) throw new Error('Email service is not configured.');
  if (process.env.NODE_ENV === 'production' && !process.env.EMAIL_FROM) {
    throw new Error('Email sender is not configured.');
  }
  if (!subject || subject.length > 200 || typeof html !== 'string' || html.length > 100_000) {
    throw new Error('Email content is invalid.');
  }
  if (text !== undefined && (typeof text !== 'string' || text.length > 100_000)) {
    throw new Error('Email text is invalid.');
  }
  const recipients = Array.isArray(to) ? to : [to];
  if (!recipients.length || recipients.length > 50 || recipients.some((email) => typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    throw new Error('Email recipient is invalid.');
  }
  if (from !== undefined && from !== process.env.EMAIL_FROM) {
    throw new Error('Email sender is not allowed.');
  }

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || DEFAULT_FROM,
    to: recipients,
    subject,
    html,
    ...(text && { text }),
  });

  if (error) {
    console.error('[Mailer] Email delivery failed.');
    throw new Error('Failed to send email.');
  }

  return data;
}

// ─── OTP Email ────────────────────────────────────────────────────────────────
export async function sendOtpEmail(toEmail, otp) {
  return sendEmail({
    to: toEmail,
    subject: 'Kode Verifikasi Kalceria',
    text: `Hai Kalcerian! Ini adalah kode verifikasi mu: ${otp}. Harap jangan bagikan kode ini.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #eee;border-radius:8px;">
        <h2 style="color:#1a1a1a;">Verifikasi Akun Kalceria</h2>
        <p>Hai Kalcerian!</p>
        <p>Ini adalah kode verifikasi mu:</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#4F46E5;padding:16px 0;">${otp}</div>
        <p style="color:#666;font-size:13px;">Kode berlaku 15 menit. Harap jangan bagikan kode ini kepada siapapun.</p>
      </div>
    `,
  });
}

// ─── Password Reset Email ─────────────────────────────────────────────────────
export async function sendPasswordResetEmail(toEmail, token) {
  const frontendOrigin = process.env.FRONTEND_URL?.split(',')[0]?.trim();
  if (!frontendOrigin) throw new Error('Frontend URL is not configured.');
  const resetUrl = new URL('/reset-password', frontendOrigin);
  resetUrl.searchParams.set('token', token);
  return sendEmail({
    to: toEmail,
    subject: 'Reset Password Kalceria',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #eee;border-radius:8px;">
        <h2 style="color:#1a1a1a;">Reset Password</h2>
        <p>Klik tombol di bawah untuk reset password. Link berlaku 1 jam.</p>
        <a href="${resetUrl.href}" style="display:inline-block;background:#4F46E5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0;">Reset Password</a>
        <p style="color:#666;font-size:13px;">Jika kamu tidak meminta reset, abaikan email ini.</p>
      </div>
    `,
  });
}

// ─── Event Notification Email ─────────────────────────────────────────────────
export async function sendEventNotificationEmail(toEmail, eventDetail, eventId) {
  const redirectUrl = `https://api.kalceria.com/redirect/event/${encodeURIComponent(eventId)}`;
  const safeTitle = escapeHtml(eventDetail.title || 'Kalceria event');
  const safeDescription = escapeHtml(eventDetail.description || '');
  const safePosterUrl = safeHttpsUrl(eventDetail.posterUrl) || 'https://api.kalceria.com/assets/default-poster.png';
  return sendEmail({
    to: toEmail,
    subject: `[Kalceria] ${eventDetail.title}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:540px;margin:auto;padding:24px;border:1px solid #eee;border-radius:8px;">
        <h2 style="color:#1a1a1a;">Event Kalceria</h2>
        <p>Hai Kalcerian! Ada event seru buat kamu.</p>
        <h3 style="color:#4F46E5;">${safeTitle}</h3>
        <p>${safeDescription}</p>
        <a href="${redirectUrl}">
          <img
            src="${safePosterUrl}"
            alt="${safeTitle}"
            style="width:100%;border-radius:8px;margin:16px 0;"
          />
        </a>
        <a href="${redirectUrl}" style="display:inline-block;background:#4F46E5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">
          Daftar Sekarang
        </a>
      </div>
    `,
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function safeHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}
