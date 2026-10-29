import { Resend } from 'resend';

// ─── Clients & Senders (Dual Channel: Auth vs Notifications) ─────────────────
const authApiKey = process.env.RESEND_AUTH_API_KEY || process.env.RESEND_API_KEY;
const notifApiKey = process.env.RESEND_NOTIF_API_KEY || process.env.RESEND_API_KEY;

const authResend = authApiKey ? new Resend(authApiKey) : null;
const notifResend = notifApiKey ? new Resend(notifApiKey) : null;

const DEFAULT_AUTH_FROM = process.env.EMAIL_FROM_AUTH || process.env.EMAIL_FROM || 'Kalceria Security <onboarding@resend.dev>';
const DEFAULT_NOTIF_FROM = process.env.EMAIL_FROM_NOTIF || process.env.EMAIL_FROM || 'Kalceria <onboarding@resend.dev>';
const ADMIN_NOTIF_EMAIL = process.env.EMAIL_ADMIN_NOTIF || null;

export function isEmailAuthConfigured() {
  return Boolean(authResend && (process.env.EMAIL_FROM_AUTH || process.env.EMAIL_FROM));
}

export function isEmailNotifConfigured() {
  return Boolean(notifResend && (process.env.EMAIL_FROM_NOTIF || process.env.EMAIL_FROM));
}

// ─── General Send Email ──────────────────────────────────────────────────────
export async function sendEmail({ to, subject, html, text, from, channel = 'notif' }) {
  const isAuth = channel === 'auth';
  const client = isAuth ? authResend : notifResend;
  const defaultFrom = isAuth ? DEFAULT_AUTH_FROM : DEFAULT_NOTIF_FROM;

  if (!client) throw new Error('Email service is not configured.');
  if (process.env.NODE_ENV === 'production' && !process.env.EMAIL_FROM && !process.env.EMAIL_FROM_AUTH && !process.env.EMAIL_FROM_NOTIF) {
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

  const allowedSenders = [process.env.EMAIL_FROM, process.env.EMAIL_FROM_AUTH, process.env.EMAIL_FROM_NOTIF].filter(Boolean);
  if (from !== undefined && allowedSenders.length > 0 && !allowedSenders.includes(from)) {
    throw new Error('Email sender is not allowed.');
  }

  const { data, error } = await client.emails.send({
    from: from || defaultFrom,
    to: recipients,
    subject,
    html,
    ...(text && { text }),
  });

  if (error) {
    console.error(`[Mailer:${channel}] Email delivery failed:`, error.message || error);
    throw new Error('Failed to send email.');
  }

  return data;
}

// ─── Safe Execution Wrapper (Fault-isolated, non-blocking) ───────────────────
export async function safeNotify(promiseFn, label = 'email') {
  try {
    return await promiseFn();
  } catch (err) {
    console.warn(`[Broker:${label}] Notification skipped/failed gracefully:`, err.message || err);
    return { skipped: true, error: err.message };
  }
}

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
        <h2 style="color:#1a1a1a;">Verifikasi Akun Kalceria</h2>
        <p>Hai Kalcerian!</p>
        <p>Ini adalah kode verifikasi OTP akun kamu:</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#4F46E5;padding:16px 0;">${escapeHtml(otp)}</div>
        <p style="color:#666;font-size:13px;">Kode berlaku 15 menit. Harap jangan bagikan kode ini kepada siapapun demi keamanan akun kamu.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(toEmail, token) {
  if (process.env.ENABLE_EMAIL_AUTH !== 'true') {
    return { skipped: true, reason: 'EMAIL_AUTH_DISABLED' };
  }
  const frontendOrigin = process.env.FRONTEND_URL?.split(',')[0]?.trim();
  if (!frontendOrigin) throw new Error('Frontend URL is not configured.');
  const resetUrl = new URL('/reset-password', frontendOrigin);
  resetUrl.searchParams.set('token', token);
  return sendEmail({
    to: toEmail,
    channel: 'auth',
    subject: 'Reset Password Kalceria',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #eee;border-radius:8px;background:#ffffff;">
        <h2 style="color:#1a1a1a;">Reset Password</h2>
        <p>Klik tombol di bawah untuk reset password akun Kalceria kamu. Link berlaku 1 jam.</p>
        <a href="${resetUrl.href}" style="display:inline-block;background:#4F46E5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0;font-weight:bold;">Reset Password</a>
        <p style="color:#666;font-size:13px;">Jika kamu tidak meminta reset password, abaikan email ini.</p>
      </div>
    `,
  });
}

// ─── Channel B: Notifications (Uses Notification Domain) ─────────────────────

export async function sendEventNotificationEmail(toEmail, eventDetail, eventId) {
  if (process.env.ENABLE_EMAIL_NOTIF !== 'true') {
    return { skipped: true, reason: 'EMAIL_NOTIF_DISABLED' };
  }
  const frontendOrigin = process.env.FRONTEND_URL?.split(',')[0]?.trim() || 'https://kalceria-frontend.vercel.app';
  const redirectUrl = `${frontendOrigin}/events/${encodeURIComponent(eventId)}`;
  const safeTitle = escapeHtml(eventDetail.title || 'Kalceria Event');
  const safeDescription = escapeHtml(eventDetail.description || '');
  const safePosterUrl = safeHttpsUrl(eventDetail.posterUrl || eventDetail.displayPhotoUrl) || `${frontendOrigin}/favicon.ico`;
  return sendEmail({
    to: toEmail,
    channel: 'notif',
    subject: `[Kalceria Event] ${safeTitle}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:540px;margin:auto;padding:24px;border:1px solid #eee;border-radius:8px;background:#ffffff;">
        <h2 style="color:#1a1a1a;">Event Kalceria</h2>
        <p>Hai Kalcerian! Ada event baru yang siap kamu ikuti:</p>
        <h3 style="color:#4F46E5;">${safeTitle}</h3>
        <p style="color:#444;line-height:1.6;">${safeDescription}</p>
        <a href="${redirectUrl}">
          <img src="${safePosterUrl}" alt="${safeTitle}" style="width:100%;border-radius:8px;margin:16px 0;" />
        </a>
        <a href="${redirectUrl}" style="display:inline-block;background:#4F46E5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
          Daftar Sekarang
        </a>
      </div>
    `,
  });
}

export async function sendEventRegistrationEmail({ to, event, registration, paymentCheckoutUrl }) {
  if (process.env.ENABLE_EMAIL_NOTIF !== 'true' || !to || to.endsWith('@guest.kalceria.local')) {
    return { skipped: true, reason: 'EMAIL_NOTIF_DISABLED_OR_GUEST' };
  }
  const safeTitle = escapeHtml(event.title);
  const safeSession = escapeHtml(registration.selectedSession);
  const priceFormatted = Number(event.price).toLocaleString('id-ID');
  const payButtonHtml = paymentCheckoutUrl
    ? `<a href="${paymentCheckoutUrl}" style="display:inline-block;background:#10B981;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin:16px 0;">Bayar Sekarang Online (Rp ${priceFormatted})</a>`
    : `<p style="color:#555;">Status Pembayaran: <strong>${escapeHtml(registration.paymentStatus)}</strong></p>`;

  return sendEmail({
    to,
    channel: 'notif',
    subject: `[Pendaftaran Berhasil] ${safeTitle} - Kalceria`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:24px;border:1px solid #eee;border-radius:8px;background:#ffffff;">
        <h2 style="color:#111;">Pendaftaran Event Diterima! 🏁</h2>
        <p>Pendaftaran kamu untuk event <strong>${safeTitle}</strong> telah tercatat di sistem.</p>
        <div style="background:#f8fafc;padding:16px;border-radius:8px;margin:16px 0;">
          <p style="margin:4px 0;"><strong>ID Registrasi:</strong> ${escapeHtml(registration.id)}</p>
          <p style="margin:4px 0;"><strong>Sesi:</strong> ${safeSession}</p>
          <p style="margin:4px 0;"><strong>Biaya:</strong> Rp ${priceFormatted}</p>
        </div>
        ${payButtonHtml}
        <p style="font-size:12px;color:#888;">Terima kasih atas partisipasimu di kultur otomotif Kalceria!</p>
      </div>
    `,
  });
}

export async function sendEventPaymentConfirmedEmail({ to, event, registration }) {
  if (process.env.ENABLE_EMAIL_NOTIF !== 'true' || !to || to.endsWith('@guest.kalceria.local')) {
    return { skipped: true, reason: 'EMAIL_NOTIF_DISABLED_OR_GUEST' };
  }
  const safeTitle = escapeHtml(event.title);
  return sendEmail({
    to,
    channel: 'notif',
    subject: `[Tiket Terkonfirmasi] ${safeTitle} - Kalceria`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:24px;border:1px solid #10B981;border-radius:8px;background:#ffffff;">
        <h2 style="color:#10B981;">Pembayaran Terkonfirmasi! 🎉</h2>
        <p>Selamat! Pembayaran untuk event <strong>${safeTitle}</strong> telah lunas dan tiket kamu aktif.</p>
        <div style="background:#f0fdf4;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #10B981;">
          <p style="margin:4px 0;"><strong>Kode Tiket:</strong> ${escapeHtml(registration.id)}</p>
          <p style="margin:4px 0;"><strong>Sesi:</strong> ${escapeHtml(registration.selectedSession)}</p>
          <p style="margin:4px 0;"><strong>Status:</strong> CONFIRMED / LUNAS</p>
        </div>
        <p style="color:#555;">Tunjukkan email atau kode tiket ini saat check-in di lokasi event.</p>
      </div>
    `,
  });
}

export async function sendServiceRequestSubmittedEmail({ to, booking, slots = [] }) {
  if (process.env.ENABLE_EMAIL_NOTIF !== 'true' || !to || to.endsWith('@guest.kalceria.local')) {
    return { skipped: true, reason: 'EMAIL_NOTIF_DISABLED_OR_GUEST' };
  }
  const slotsSummary = slots.map(s => `${escapeHtml(s.date || '')} (${escapeHtml(s.startTime)}-${escapeHtml(s.endTime)})`).join(', ') || '1 slot';
  return sendEmail({
    to,
    channel: 'notif',
    subject: `[Need Our Help] Permintaan Layanan ${escapeHtml(booking.serviceType)} Diterima`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:24px;border:1px solid #eee;border-radius:8px;background:#ffffff;">
        <h2 style="color:#111;">Permintaan Layanan Diterima! 📋</h2>
        <p>Hai <strong>${escapeHtml(booking.contactPerson || 'Pelanggan')}</strong>, permintaan layanan kreatif / EO kamu telah kami terima.</p>
        <div style="background:#f8fafc;padding:16px;border-radius:8px;margin:16px 0;">
          <p style="margin:4px 0;"><strong>ID Booking:</strong> ${escapeHtml(booking.id)}</p>
          <p style="margin:4px 0;"><strong>Layanan:</strong> ${escapeHtml(booking.serviceType)}</p>
          <p style="margin:4px 0;"><strong>Nama Acara / Project:</strong> ${escapeHtml(booking.serviceName || '—')}</p>
          <p style="margin:4px 0;"><strong>Jadwal:</strong> ${slotsSummary}</p>
          <p style="margin:4px 0;"><strong>Lokasi:</strong> ${escapeHtml(booking.location || 'TBD')}</p>
        </div>
        <p style="color:#555;">Crew operasional Kalceria akan segera menghubungi kamu via WhatsApp untuk koordinasi teknis.</p>
      </div>
    `,
  });
}

export async function sendServiceRequestAdminAlertEmail({ booking, slots = [], user }) {
  if (process.env.ENABLE_EMAIL_NOTIF !== 'true' || !ADMIN_NOTIF_EMAIL) {
    return { skipped: true, reason: 'ADMIN_EMAIL_NOTIF_DISABLED' };
  }
  const slotsCount = slots.length;
  return sendEmail({
    to: ADMIN_NOTIF_EMAIL,
    channel: 'notif',
    subject: `[ALERT OPS] Request Layanan Baru: ${booking.serviceType} (${booking.contactPerson || user.name})`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:540px;margin:auto;padding:20px;border:1px solid #f97316;border-radius:8px;background:#ffffff;">
        <h3 style="color:#f97316;">Ada Request Layanan Baru Masuk! 🔥</h3>
        <p><strong>Layanan:</strong> ${escapeHtml(booking.serviceType)}</p>
        <p><strong>PIC:</strong> ${escapeHtml(booking.contactPerson || user.name)} (${escapeHtml(booking.whatsapp || user.phone || 'No WA')})</p>
        <p><strong>Email:</strong> ${escapeHtml(user.email)}</p>
        <p><strong>Lokasi:</strong> ${escapeHtml(booking.location || 'TBD')}</p>
        <p><strong>Slot:</strong> ${slotsCount} slot</p>
        <p><strong>Catatan:</strong> ${escapeHtml(booking.additionalNotes || '—')}</p>
        <p><a href="https://kalceria-backend.vercel.app/admin/services">Buka Dashboard Admin</a></p>
      </div>
    `,
  });
}

export async function sendServiceRequestStatusEmail({ to, booking, status }) {
  if (process.env.ENABLE_EMAIL_NOTIF !== 'true' || !to || to.endsWith('@guest.kalceria.local')) {
    return { skipped: true, reason: 'EMAIL_NOTIF_DISABLED_OR_GUEST' };
  }
  return sendEmail({
    to,
    channel: 'notif',
    subject: `[Update Status Layanan] Request ${escapeHtml(booking.serviceType)}: ${escapeHtml(status)}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:24px;border:1px solid #eee;border-radius:8px;background:#ffffff;">
        <h2>Update Status Permintaan Layanan</h2>
        <p>Status booking kamu dengan ID <strong>${escapeHtml(booking.id)}</strong> telah diperbarui menjadi:</p>
        <div style="font-size:20px;font-weight:bold;color:#4F46E5;padding:12px 0;">${escapeHtml(status)}</div>
        ${booking.totalPrice ? `<p><strong>Total Biaya Disepakati:</strong> Rp ${Number(booking.totalPrice).toLocaleString('id-ID')}</p>` : ''}
        ${booking.technicalBrief ? `<p><strong>Catatan Brief:</strong> ${escapeHtml(booking.technicalBrief)}</p>` : ''}
        <p style="color:#666;font-size:13px;">Tim Kalceria siap melayani kebutuhan acara kamu.</p>
      </div>
    `,
  });
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
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
