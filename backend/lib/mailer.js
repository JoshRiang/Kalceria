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
        <div style="text-align:center;margin-bottom:20px;">
          <img src="https://kalceria.id/logo-avatar.png" alt="Kalceria" width="64" height="64" style="border-radius:12px;background:#000000;display:inline-block;" />
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
          <img src="https://kalceria.id/logo-avatar.png" alt="Kalceria" width="64" height="64" style="border-radius:12px;background:#000000;display:inline-block;" />
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

// ─── Channel B: Notifications (Uses Notification Domain) ─────────────────────

export async function sendEventNotificationEmail(toEmail, eventDetail, eventId) {
  if (process.env.ENABLE_EMAIL_NOTIF !== 'true') {
    return { skipped: true, reason: 'EMAIL_NOTIF_DISABLED' };
  }
  const frontendOrigin = process.env.FRONTEND_URL?.split(',')[0]?.trim() || 'https://kalceria.id';
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

export function buildServiceRequestSubmittedEmailHtml({ booking, slots = [], cancelToken }) {
  const serviceLabelMap = {
    SHOOTING: 'Shooting / Production',
    EO: 'Event Organizer',
    HOST_EVENT: 'Host Event',
  };
  const serviceLabel = serviceLabelMap[booking.serviceType] || booking.serviceType;

  const slotsSummary = (slots || []).map((s) => {
    const dStr = s.date ? new Date(s.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    return `${escapeHtml(dStr)} (${escapeHtml(s.startTime || '')}-${escapeHtml(s.endTime || '')})`;
  }).join(', ') || '1 slot';

  const frontendOrigin = process.env.FRONTEND_URL?.split(',')[0]?.trim() || 'https://www.kalceria.id';
  const token = cancelToken || '';
  const editUrl = `${frontendOrigin}/?service_action=edit&booking_id=${encodeURIComponent(booking.id)}${token ? `&token=${encodeURIComponent(token)}` : ''}&anchor=need-our-help#need-our-help`;
  const cancelUrl = `${frontendOrigin}/?service_action=cancel&booking_id=${encodeURIComponent(booking.id)}${token ? `&token=${encodeURIComponent(token)}` : ''}&anchor=need-our-help#need-our-help`;

  return `
      <div style="font-family:Arial,sans-serif;max-width:540px;margin:auto;padding:28px 24px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;color:#1e293b;">
        <div style="text-align:center;margin-bottom:20px;">
          <img src="https://www.kalceria.id/logo-avatar.png" alt="Kalceria" width="60" height="60" style="border-radius:14px;background:#000000;display:inline-block;box-shadow:0 4px 12px rgba(0,0,0,0.15);" />
        </div>

        <h2 style="color:#0a0e27;margin:0 0 8px 0;font-size:22px;text-align:center;font-weight:900;letter-spacing:-0.5px;">Transmission Received: Need Our Help</h2>
        <p style="color:#475569;font-size:14px;text-align:center;margin:0 0 20px 0;">Hai <strong>${escapeHtml(booking.contactPerson || 'Pelanggan')}</strong>, permintaan layanan kamu telah berhasil masuk ke sistem kami.</p>

        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px;margin-bottom:20px;">
          <p style="margin:0 0 12px 0;font-size:12px;font-weight:bold;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;">Booking Details</p>
          <table style="width:100%;font-size:13px;color:#1e293b;border-collapse:collapse;">
            <tr><td style="padding:4px 0;font-weight:bold;width:130px;color:#334155;">Booking ID</td><td style="padding:4px 8px;width:10px;color:#94a3b8;">:</td><td style="padding:4px 0;">#${escapeHtml(booking.id.slice(-6))} (${escapeHtml(booking.id)})</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Service</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${escapeHtml(serviceLabel)}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Request Title</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${escapeHtml(booking.serviceName || '—')}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Operator Name</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${escapeHtml(booking.contactPerson || '—')}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">WhatsApp</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${escapeHtml(booking.whatsapp || '—')}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Deployment Area</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${escapeHtml(booking.location || 'TBD')}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Selected Schedule</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${slotsSummary}</td></tr>
            ${booking.additionalNotes ? `<tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Notes</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${escapeHtml(booking.additionalNotes)}</td></tr>` : ''}
          </table>
        </div>

        <div style="background:#fffbeb;border:1px solid #fef3c7;border-left:4px solid #f59e0b;padding:14px;border-radius:8px;margin-bottom:24px;">
          <p style="margin:0 0 6px 0;font-weight:bold;color:#92400e;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Ketentuan Pemesanan & Perubahan / Modification Policy:</p>
          <ol style="margin:0;padding-left:18px;color:#78350f;font-size:13px;line-height:1.5;">
            <li><strong>Batas Waktu Perubahan (15 Menit):</strong> Pemesan masih memiliki hak penuh untuk mengedit parameter atau membatalkan pesanan dalam kurun waktu 15 menit setelah pesanan berhasil dibuat.</li>
            <li>Setelah 15 menit berlalu, pesanan akan secara otomatis dikunci dan masuk ke antrean koordinasi operasional tim Kalceria.</li>
          </ol>
        </div>

        <div style="text-align:center;margin:28px 0 20px 0;">
          <a href="${editUrl}" target="_blank" rel="noopener noreferrer" style="background:#0a0e27;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;display:inline-block;margin:0 8px 8px 0;border:1px solid #1e293b;">Edit Booking</a>
          <a href="${cancelUrl}" target="_blank" rel="noopener noreferrer" style="background:#ef4444;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;display:inline-block;margin:0 8px 8px 0;">Cancel Booking</a>
        </div>

        <p style="color:#64748b;font-size:12px;text-align:center;margin:20px 0 0 0;line-height:1.5;">
          Crew operasional Kalceria juga dapat menghubungi kamu via WhatsApp untuk koordinasi teknis lebih lanjut.
        </p>
      </div>
  `;
}

export async function sendServiceRequestSubmittedEmail({ to, booking, slots = [], cancelToken }) {
  if (process.env.ENABLE_EMAIL_NOTIF !== 'true' || !to || to.endsWith('@guest.kalceria.local')) {
    return { skipped: true, reason: 'EMAIL_NOTIF_DISABLED_OR_GUEST' };
  }

  const serviceLabelMap = {
    SHOOTING: 'Shooting / Production',
    EO: 'Event Organizer',
    HOST_EVENT: 'Host Event',
  };
  const serviceLabel = serviceLabelMap[booking.serviceType] || booking.serviceType;
  const html = buildServiceRequestSubmittedEmailHtml({ booking, slots, cancelToken });

  return sendEmail({
    to,
    channel: 'notif',
    subject: `[Need Our Help] Booking Confirmation: ${escapeHtml(serviceLabel)} (#${escapeHtml(booking.id.slice(-6))})`,
    html,
  });
}

export function buildServiceRequestUpdatedEmailHtml({ booking, slots = [], cancelToken }) {
  const serviceLabelMap = {
    SHOOTING: 'Shooting / Production',
    EO: 'Event Organizer',
    HOST_EVENT: 'Host Event',
  };
  const serviceLabel = serviceLabelMap[booking.serviceType] || booking.serviceType;

  const slotsSummary = (slots || []).map((s) => {
    const dStr = typeof s.date === 'string' ? s.date.split('T')[0] : new Date(s.date).toISOString().split('T')[0];
    return `${escapeHtml(dStr)} (${escapeHtml(s.startTime || '')}-${escapeHtml(s.endTime || '')})`;
  }).join(', ') || '1 slot';

  const frontendOrigin = process.env.FRONTEND_URL?.split(',')[0]?.trim() || 'https://www.kalceria.id';
  const token = cancelToken || '';
  const cancelUrl = `${frontendOrigin}/?service_action=cancel&booking_id=${encodeURIComponent(booking.id)}${token ? `&token=${encodeURIComponent(token)}` : ''}&anchor=need-our-help#need-our-help`;

  return `
      <div style="font-family:Arial,sans-serif;max-width:540px;margin:auto;padding:28px 24px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;color:#1e293b;">
        <div style="text-align:center;margin-bottom:20px;">
          <img src="https://www.kalceria.id/logo-avatar.png" alt="Kalceria" width="60" height="60" style="border-radius:14px;background:#000000;display:inline-block;box-shadow:0 4px 12px rgba(0,0,0,0.15);" />
        </div>

        <h2 style="color:#0a0e27;margin:0 0 8px 0;font-size:22px;text-align:center;font-weight:900;letter-spacing:-0.5px;">Ringkasan Update: Need Our Help</h2>
        <p style="color:#475569;font-size:14px;text-align:center;margin:0 0 20px 0;">Hai <strong>${escapeHtml(booking.contactPerson || 'Pelanggan')}</strong>, pembaruan parameter pesanan layanan kamu telah berhasil disimpan di sistem kami.</p>

        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px;margin-bottom:20px;">
          <p style="margin:0 0 12px 0;font-size:12px;font-weight:bold;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;">Updated Booking Details</p>
          <table style="width:100%;font-size:13px;color:#1e293b;border-collapse:collapse;">
            <tr><td style="padding:4px 0;font-weight:bold;width:130px;color:#334155;">Booking ID</td><td style="padding:4px 8px;width:10px;color:#94a3b8;">:</td><td style="padding:4px 0;">#${escapeHtml(booking.id.slice(-6))} (${escapeHtml(booking.id)})</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Service</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${escapeHtml(serviceLabel)}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Request Title</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${escapeHtml(booking.serviceName || '—')}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Operator Name</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${escapeHtml(booking.contactPerson || '—')}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">WhatsApp</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${escapeHtml(booking.whatsapp || '—')}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Deployment Area</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${escapeHtml(booking.location || 'TBD')}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Selected Schedule</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${slotsSummary}</td></tr>
            ${booking.additionalNotes ? `<tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Notes</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${escapeHtml(booking.additionalNotes)}</td></tr>` : ''}
          </table>
        </div>

        <div style="background:#fffbeb;border:1px solid #fef3c7;border-left:4px solid #f59e0b;padding:14px;border-radius:8px;margin-bottom:24px;">
          <p style="margin:0 0 6px 0;font-weight:bold;color:#92400e;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Ketentuan Pembatalan / Cancellation Policy:</p>
          <ol style="margin:0;padding-left:18px;color:#78350f;font-size:13px;line-height:1.5;">
            <li><strong>Batas Waktu Pembatalan (15 Menit):</strong> Kamu masih memiliki hak penuh untuk membatalkan pesanan ini dalam kurun waktu 15 menit setelah pembaruan disimpan.</li>
            <li>Setelah 15 menit berlalu, jadwal operasional akan otomatis dikunci dan masuk ke antrean koordinasi operasional tim Kalceria.</li>
          </ol>
        </div>

        <div style="text-align:center;margin:28px 0 20px 0;">
          <a href="${cancelUrl}" target="_blank" rel="noopener noreferrer" style="background:#ef4444;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;display:inline-block;">Cancel Booking</a>
        </div>

        <p style="color:#64748b;font-size:12px;text-align:center;margin:20px 0 0 0;line-height:1.5;">
          Crew operasional Kalceria juga dapat menghubungi kamu via WhatsApp untuk koordinasi teknis lebih lanjut.
        </p>
      </div>
  `;
}

export async function sendServiceRequestUpdatedEmail({ to, booking, slots = [], cancelToken }) {
  if (process.env.ENABLE_EMAIL_NOTIF !== 'true' || !to || to.endsWith('@guest.kalceria.local')) {
    return { skipped: true, reason: 'EMAIL_NOTIF_DISABLED_OR_GUEST' };
  }

  const serviceLabelMap = {
    SHOOTING: 'Shooting / Production',
    EO: 'Event Organizer',
    HOST_EVENT: 'Host Event',
  };
  const serviceLabel = serviceLabelMap[booking.serviceType] || booking.serviceType;
  const html = buildServiceRequestUpdatedEmailHtml({ booking, slots, cancelToken });

  return sendEmail({
    to,
    channel: 'notif',
    subject: `[Need Our Help] Ringkasan Update: ${escapeHtml(serviceLabel)} (#${escapeHtml(booking.id.slice(-6))})`,
    html,
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
