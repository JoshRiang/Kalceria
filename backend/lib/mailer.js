import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS, // Gmail App Password
  },
});

// ─── OTP Email ────────────────────────────────────────────────────────────────
export async function sendOtpEmail(toEmail, otp) {
  await transporter.sendMail({
    from: `"Kalceria" <${process.env.SMTP_USER}>`,
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
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  await transporter.sendMail({
    from: `"Kalceria" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: 'Reset Password Kalceria',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #eee;border-radius:8px;">
        <h2 style="color:#1a1a1a;">Reset Password</h2>
        <p>Klik tombol di bawah untuk reset password. Link berlaku 1 jam.</p>
        <a href="${resetUrl}" style="display:inline-block;background:#4F46E5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0;">Reset Password</a>
        <p style="color:#666;font-size:13px;">Jika kamu tidak meminta reset, abaikan email ini.</p>
      </div>
    `,
  });
}

// ─── Event Notification Email ─────────────────────────────────────────────────
export async function sendEventNotificationEmail(toEmail, eventDetail, eventId) {
  const redirectUrl = `https://api.kalceria.com/redirect/event/${eventId}`;
  await transporter.sendMail({
    from: `"Kalceria Events" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `[Kalceria] ${eventDetail.title}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:540px;margin:auto;padding:24px;border:1px solid #eee;border-radius:8px;">
        <h2 style="color:#1a1a1a;">Event Kalceria</h2>
        <p>Hai Kalcerian! Ada event seru buat kamu.</p>
        <h3 style="color:#4F46E5;">${eventDetail.title}</h3>
        <p>${eventDetail.description || ''}</p>
        <a href="${redirectUrl}">
          <img
            src="${eventDetail.posterUrl || 'https://api.kalceria.com/assets/default-poster.png'}"
            alt="${eventDetail.title}"
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
