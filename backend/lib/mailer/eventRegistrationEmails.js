import { sendEmail } from './emailClient.js';
import { escapeHtml, safeHttpsUrl } from './emailUtils.js';

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

export function buildEventRegistrationEmailHtml({ event, registration, cancelToken, paymentCheckoutUrl }) {
  const frontendOrigin = process.env.FRONTEND_URL?.split(',')[0]?.trim() || 'https://www.kalceria.id';
  const token = cancelToken || '';
  const confirmUrl = `${frontendOrigin}/api/events/registration/${encodeURIComponent(registration.id)}/confirm?event_action=confirm&registration_id=${encodeURIComponent(registration.id)}${token ? `&token=${encodeURIComponent(token)}&manage_token=${encodeURIComponent(token)}` : ''}`;
  const cancelUrl = `${frontendOrigin}/events?event_action=cancel&registration_id=${encodeURIComponent(registration.id)}${token ? `&token=${encodeURIComponent(token)}&manage_token=${encodeURIComponent(token)}` : ''}&anchor=see-event#see-event`;
  const timerBadgeUrl = `${frontendOrigin}/api/events/registration/${encodeURIComponent(registration.id)}/timer.gif`;

  const safeTitle = escapeHtml(event.title || 'Kalceria Event');
  const safeSession = escapeHtml(registration.selectedSession || 'Regular Session');
  const priceFormatted = Number(event.price || 0).toLocaleString('id-ID');

  const posterRaw = event.displayPhotoUrl || event.posterUrl || '';
  const safePosterUrl = escapeHtml(
    posterRaw.startsWith('http://') || posterRaw.startsWith('https://')
      ? posterRaw
      : posterRaw.startsWith('/')
        ? `${frontendOrigin}${posterRaw}`
        : `${frontendOrigin}/${posterRaw || 'logo-avatar.png'}`
  );

  return `
      <style>
        @keyframes expireActionButtons {
          0%, 98% { opacity: 1; filter: none; pointer-events: auto; }
          100% { opacity: 0.28 !important; filter: grayscale(100%) brightness(0.6) !important; pointer-events: none !important; }
        }
        .action-buttons-box {
          animation: expireActionButtons 180s ease-in forwards;
        }
        .action-btn:visited, .action-btn:active {
          opacity: 0.3 !important;
          filter: grayscale(100%) !important;
          pointer-events: none !important;
          cursor: default !important;
          color: #888888 !important;
          background-color: #333333 !important;
          border-color: #333333 !important;
        }
      </style>
      <div style="font-family:Arial,sans-serif;max-width:540px;margin:auto;padding:28px 24px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;color:#1e293b;">
        <div style="text-align:center;margin-bottom:20px;">
          <img src="https://www.kalceria.id/favicon.png?v=2" alt="Kalceria" width="56" height="50" style="display:inline-block;border:none;outline:none;" />
        </div>

        <h2 style="color:#0a0e27;margin:0 0 8px 0;font-size:22px;text-align:center;font-weight:900;letter-spacing:-0.5px;">Ringkasan Order Event: ${safeTitle}</h2>
        <p style="color:#475569;font-size:14px;text-align:center;margin:0 0 20px 0;">Hai <strong>${escapeHtml(registration.user?.name || 'Kalcerian')}</strong>, pendaftaran tiket event kamu telah tercatat di buffer sistem kami.</p>

        <div style="text-align:center;margin:0 0 24px 0;">
          <img src="${safePosterUrl}" alt="${safeTitle}" width="260" style="width:260px;max-width:100%;height:auto;aspect-ratio:3/4;object-fit:cover;display:block;margin:0 auto;border:none;border-radius:12px;box-shadow:0 12px 30px rgba(0,0,0,0.25);" />
        </div>

        <div style="margin-bottom:24px;">
          <p style="margin:0 0 12px 0;font-size:12px;font-weight:bold;color:#0f172a;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;">Order Summary &amp; Event Parameters</p>
          <table style="width:100%;font-size:13px;color:#1e293b;border-collapse:collapse;">
            <tr><td style="padding:4px 0;font-weight:bold;width:130px;color:#334155;">ID Registrasi</td><td style="padding:4px 8px;width:10px;color:#94a3b8;">:</td><td style="padding:4px 0;">#${escapeHtml(registration.id.slice(-6))} (${escapeHtml(registration.id)})</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Nama Event</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${safeTitle}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Sesi Terpilih</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${safeSession}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Nama Peserta</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${escapeHtml(registration.user?.name || '—')}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">WhatsApp</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${escapeHtml(registration.user?.phone || '—')}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Email</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${escapeHtml(registration.user?.email || '—')}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Lokasi Event</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${escapeHtml(event.location || 'TBA')}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Biaya Tiket</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">Rp ${priceFormatted}</td></tr>
          </table>
        </div>

        <div style="margin:20px 0 16px 0;">
          <p style="margin:0 0 6px 0;font-weight:bold;color:#0f172a;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Konfirmasi Pendaftaran (Wajib) / Mandatory Confirmation:</p>
          <p style="margin:0;color:#334155;font-size:13px;line-height:1.6;">
            Apabila kamu sudah yakin dengan parameter pendaftaran event ini, silakan klik tombol <strong>CONFIRM</strong> di bawah ini untuk mengunci dan memverifikasi slot tiket kamu ke sistem resmi Kalceria sebelum batas waktu 3 menit berakhir. Jika waktu habis tanpa konfirmasi, pendaftaran otomatis dibatalkan dan dihapus dari sistem.
          </p>
        </div>

        <div style="margin:0 0 24px 0;">
          <p style="margin:0 0 6px 0;font-weight:bold;color:#0f172a;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Ketentuan Waktu &amp; Pembatalan (3 Menit):</p>
          <ol style="margin:0;padding-left:18px;color:#334155;font-size:13px;line-height:1.6;">
            <li><strong>Batas Waktu Konfirmasi &amp; Pembatalan:</strong> Kamu memiliki waktu 3 menit dari saat pendaftaran dibuat. Jika kamu ingin membatalkan, klik tombol <strong>CANCEL</strong>.</li>
            <li>Setelah 3 menit berlalu tanpa konfirmasi, pendaftaran unconfirmed akan otomatis di-purge dari sistem.</li>
          </ol>
        </div>

        <div style="text-align:center;margin:22px 0 14px 0;">
          <img src="${timerBadgeUrl}" alt="Status Waktu 3 Menit" width="460" height="46" style="max-width:100%;height:auto;display:inline-block;border:none;outline:none;" />
        </div>

        <div class="action-buttons-box" style="text-align:center;margin:16px 0 20px 0;">
          <a href="${confirmUrl}" class="action-btn" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#000000;color:#ffffff;border:1px solid #000000;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;letter-spacing:0.5px;font-family:Arial,sans-serif;margin:0 8px 8px 0;">CONFIRM</a>
          <a href="${cancelUrl}" class="action-btn" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#000000;color:#ffffff;border:1px solid #000000;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;letter-spacing:0.5px;font-family:Arial,sans-serif;margin:0 8px 8px 0;">CANCEL</a>
        </div>

        ${paymentCheckoutUrl ? `
          <div style="text-align:center;margin:16px 0;">
            <a href="${paymentCheckoutUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#059669;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:13px;">Bayar Online Sekarang (QRIS / VA / E-Wallet)</a>
          </div>
        ` : ''}

        <p style="color:#64748b;font-size:12px;text-align:center;margin:20px 0 0 0;line-height:1.5;">
          Tim operasional Kalceria juga dapat menghubungi kamu via WhatsApp untuk koordinasi kedatangan di lokasi acara.
        </p>
      </div>
  `;
}

export async function sendEventRegistrationEmail({ to, event, registration, cancelToken, paymentCheckoutUrl }) {
  if (process.env.ENABLE_EMAIL_NOTIF !== 'true' || !to || to.endsWith('@guest.kalceria.local')) {
    return { skipped: true, reason: 'EMAIL_NOTIF_DISABLED_OR_GUEST' };
  }
  const safeTitle = escapeHtml(event.title || 'Kalceria Event');
  const html = buildEventRegistrationEmailHtml({ event, registration, cancelToken, paymentCheckoutUrl });

  return sendEmail({
    to,
    channel: 'notif',
    subject: `[Pendaftaran Event] ${safeTitle} (#${escapeHtml(registration.id.slice(-6))}) - Kalceria`,
    html,
  });
}

export function buildEventRegistrationUpdatedEmailHtml({ event, registration, cancelToken, paymentCheckoutUrl }) {
  const frontendOrigin = process.env.FRONTEND_URL?.split(',')[0]?.trim() || 'https://www.kalceria.id';
  const token = cancelToken || '';
  const confirmUrl = `${frontendOrigin}/api/events/registration/${encodeURIComponent(registration.id)}/confirm?event_action=confirm&registration_id=${encodeURIComponent(registration.id)}${token ? `&token=${encodeURIComponent(token)}&manage_token=${encodeURIComponent(token)}` : ''}`;
  const cancelUrl = `${frontendOrigin}/events?event_action=cancel&registration_id=${encodeURIComponent(registration.id)}${token ? `&token=${encodeURIComponent(token)}&manage_token=${encodeURIComponent(token)}` : ''}&anchor=see-event#see-event`;
  const timerBadgeUrl = `${frontendOrigin}/api/events/registration/${encodeURIComponent(registration.id)}/timer.gif`;

  const safeTitle = escapeHtml(event.title || 'Kalceria Event');
  const safeSession = escapeHtml(registration.selectedSession || 'Regular Session');
  const priceFormatted = Number(event.price || 0).toLocaleString('id-ID');

  const posterRaw = event.displayPhotoUrl || event.posterUrl || '';
  const safePosterUrl = escapeHtml(
    posterRaw.startsWith('http://') || posterRaw.startsWith('https://')
      ? posterRaw
      : posterRaw.startsWith('/')
        ? `${frontendOrigin}${posterRaw}`
        : `${frontendOrigin}/${posterRaw || 'logo-avatar.png'}`
  );

  return `
      <style>
        @keyframes expireActionButtons {
          0%, 98% { opacity: 1; filter: none; pointer-events: auto; }
          100% { opacity: 0.28 !important; filter: grayscale(100%) brightness(0.6) !important; pointer-events: none !important; }
        }
        .action-buttons-box {
          animation: expireActionButtons 180s ease-in forwards;
        }
        .action-btn:visited, .action-btn:active {
          opacity: 0.3 !important;
          filter: grayscale(100%) !important;
          pointer-events: none !important;
          cursor: default !important;
          color: #888888 !important;
          background-color: #333333 !important;
          border-color: #333333 !important;
        }
      </style>
      <div style="font-family:Arial,sans-serif;max-width:540px;margin:auto;padding:28px 24px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;color:#1e293b;">
        <div style="text-align:center;margin-bottom:20px;">
          <img src="https://www.kalceria.id/favicon.png?v=2" alt="Kalceria" width="56" height="50" style="display:inline-block;border:none;outline:none;" />
        </div>

        <h2 style="color:#0a0e27;margin:0 0 8px 0;font-size:22px;text-align:center;font-weight:900;letter-spacing:-0.5px;">Ringkasan Update: ${safeTitle}</h2>
        <p style="color:#475569;font-size:14px;text-align:center;margin:0 0 20px 0;">Hai <strong>${escapeHtml(registration.user?.name || 'Kalcerian')}</strong>, perubahan parameter pendaftaran event kamu telah diperbarui di sistem buffer kami.</p>

        <div style="text-align:center;margin:0 0 24px 0;">
          <img src="${safePosterUrl}" alt="${safeTitle}" width="260" style="width:260px;max-width:100%;height:auto;aspect-ratio:3/4;object-fit:cover;display:block;margin:0 auto;border:none;border-radius:12px;box-shadow:0 12px 30px rgba(0,0,0,0.25);" />
        </div>

        <div style="margin-bottom:24px;">
          <p style="margin:0 0 12px 0;font-size:12px;font-weight:bold;color:#0f172a;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;">Updated Order Summary &amp; Event Parameters</p>
          <table style="width:100%;font-size:13px;color:#1e293b;border-collapse:collapse;">
            <tr><td style="padding:4px 0;font-weight:bold;width:130px;color:#334155;">ID Registrasi</td><td style="padding:4px 8px;width:10px;color:#94a3b8;">:</td><td style="padding:4px 0;">#${escapeHtml(registration.id.slice(-6))} (${escapeHtml(registration.id)})</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Nama Event</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${safeTitle}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Sesi Terpilih</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${safeSession}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Nama Peserta</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${escapeHtml(registration.user?.name || '—')}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">WhatsApp</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${escapeHtml(registration.user?.phone || '—')}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Email</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${escapeHtml(registration.user?.email || '—')}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Lokasi Event</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${escapeHtml(event.location || 'TBA')}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Biaya Tiket</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">Rp ${priceFormatted}</td></tr>
          </table>
        </div>

        <div style="margin:20px 0 16px 0;">
          <p style="margin:0 0 6px 0;font-weight:bold;color:#0f172a;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Konfirmasi Pendaftaran (Wajib) / Mandatory Confirmation:</p>
          <p style="margin:0;color:#334155;font-size:13px;line-height:1.6;">
            Silakan klik tombol <strong>CONFIRM</strong> di bawah ini untuk mengunci perubahan parameter pendaftaran event ini ke sistem resmi Kalceria sebelum sisa batas waktu 3 menit berakhir. Jika waktu habis tanpa konfirmasi, pendaftaran otomatis dibatalkan.
          </p>
        </div>

        <div style="text-align:center;margin:22px 0 14px 0;">
          <img src="${timerBadgeUrl}" alt="Status Waktu 3 Menit" width="460" height="46" style="max-width:100%;height:auto;display:inline-block;border:none;outline:none;" />
        </div>

        <div class="action-buttons-box" style="text-align:center;margin:16px 0 20px 0;">
          <a href="${confirmUrl}" class="action-btn" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#000000;color:#ffffff;border:1px solid #000000;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;letter-spacing:0.5px;font-family:Arial,sans-serif;margin:0 8px 8px 0;">CONFIRM</a>
          <a href="${cancelUrl}" class="action-btn" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#000000;color:#ffffff;border:1px solid #000000;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;letter-spacing:0.5px;font-family:Arial,sans-serif;margin:0 8px 8px 0;">CANCEL</a>
        </div>

        <p style="color:#64748b;font-size:12px;text-align:center;margin:20px 0 0 0;line-height:1.5;">
          Tim operasional Kalceria juga dapat menghubungi kamu via WhatsApp untuk koordinasi kedatangan di lokasi acara.
        </p>
      </div>
  `;
}

export async function sendEventRegistrationUpdatedEmail({ to, event, registration, cancelToken, paymentCheckoutUrl }) {
  if (process.env.ENABLE_EMAIL_NOTIF !== 'true' || !to || to.endsWith('@guest.kalceria.local')) {
    return { skipped: true, reason: 'EMAIL_NOTIF_DISABLED_OR_GUEST' };
  }
  const safeTitle = escapeHtml(event.title || 'Kalceria Event');
  const html = buildEventRegistrationUpdatedEmailHtml({ event, registration, cancelToken, paymentCheckoutUrl });

  return sendEmail({
    to,
    channel: 'notif',
    subject: `[Pendaftaran Event] Ringkasan Update: ${safeTitle} (#${escapeHtml(registration.id.slice(-6))})`,
    html,
  });
}

export function buildEventPaymentConfirmedEmailHtml({ event, registration }) {
  const safeTitle = escapeHtml(event.title || 'Kalceria Event');
  const safeSession = escapeHtml(registration.selectedSession || 'Regular Session');
  const priceFormatted = Number(event.price || 0).toLocaleString('id-ID');

  const posterRaw = event.displayPhotoUrl || event.posterUrl || '';
  const frontendOrigin = process.env.FRONTEND_URL?.split(',')[0]?.trim() || 'https://www.kalceria.id';
  const safePosterUrl = escapeHtml(
    posterRaw.startsWith('http://') || posterRaw.startsWith('https://')
      ? posterRaw
      : posterRaw.startsWith('/')
        ? `${frontendOrigin}${posterRaw}`
        : `${frontendOrigin}/${posterRaw || 'logo-avatar.png'}`
  );

  return `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:24px auto;color:#000000;line-height:1.6;">
        <div style="text-align:center;margin-bottom:20px;">
          <img src="https://www.kalceria.id/favicon.png?v=2" alt="Kalceria" width="56" height="50" style="display:inline-block;border:none;outline:none;" />
        </div>
        <h2 style="font-size:18px;font-weight:bold;margin:0 0 12px 0;color:#000000;text-transform:uppercase;letter-spacing:0.5px;text-align:center;">RINGKASAN PESANAN</h2>
        <!-- Status: Terkonfirmasi &amp; Terkunci | CONFIRMED -->
        <p style="font-size:13px;margin:0 0 16px 0;color:#000000;text-align:center;">
          Pendaftaran tiket kamu untuk event <strong>${safeTitle}</strong> telah terkonfirmasi dan resmi tersimpan di sistem Kalceria. Parameter pendaftaran dan slot tiket kamu telah terkunci.
        </p>

        ${safePosterUrl ? `
          <div style="text-align:center;margin:0 0 20px 0;">
            <img src="${safePosterUrl}" alt="${safeTitle}" width="260" style="width:260px;max-width:100%;height:auto;aspect-ratio:3/4;object-fit:cover;display:block;margin:0 auto;border:none;border-radius:12px;box-shadow:0 12px 30px rgba(0,0,0,0.25);" />
          </div>
        ` : ''}

        <table style="width:100%;font-size:13px;color:#000000;border-collapse:collapse;margin-bottom:20px;">
          <tr><td style="padding:6px 0;font-weight:bold;width:140px;color:#000000;">Kode Tiket</td><td style="padding:6px 8px;width:10px;color:#000000;">:</td><td style="padding:6px 0;color:#000000;">#${escapeHtml(registration.id.slice(-6))} (${escapeHtml(registration.id)})</td></tr>
          <tr><td style="padding:6px 0;font-weight:bold;color:#000000;">Nama Event</td><td style="padding:6px 8px;color:#000000;">:</td><td style="padding:6px 0;color:#000000;">${safeTitle}</td></tr>
          <tr><td style="padding:6px 0;font-weight:bold;color:#000000;">Sesi</td><td style="padding:6px 8px;color:#000000;">:</td><td style="padding:6px 0;color:#000000;">${safeSession}</td></tr>
          <tr><td style="padding:6px 0;font-weight:bold;color:#000000;">Peserta</td><td style="padding:6px 8px;color:#000000;">:</td><td style="padding:6px 0;color:#000000;">${escapeHtml(registration.user?.name || '—')}</td></tr>
          <tr><td style="padding:6px 0;font-weight:bold;color:#000000;">WhatsApp</td><td style="padding:6px 8px;color:#000000;">:</td><td style="padding:6px 0;color:#000000;">${escapeHtml(registration.user?.phone || '—')}</td></tr>
          <tr><td style="padding:6px 0;font-weight:bold;color:#000000;">Email</td><td style="padding:6px 8px;color:#000000;">:</td><td style="padding:6px 0;color:#000000;">${escapeHtml(registration.user?.email || '—')}</td></tr>
          <tr><td style="padding:6px 0;font-weight:bold;color:#000000;">Lokasi Event</td><td style="padding:6px 8px;color:#000000;">:</td><td style="padding:6px 0;color:#000000;">${escapeHtml(event.location || 'TBA')}</td></tr>
          <tr><td style="padding:6px 0;font-weight:bold;color:#000000;">Biaya Tiket</td><td style="padding:6px 8px;color:#000000;">:</td><td style="padding:6px 0;color:#000000;">Rp ${priceFormatted}</td></tr>
        </table>

        <p style="font-size:12px;margin:0;color:#000000;line-height:1.5;">
          Tunjukkan email atau kode tiket ini saat check-in di gerbang acara. Sampai jumpa di arena Kalceria!
        </p>
      </div>
  `;
}

export async function sendEventPaymentConfirmedEmail({ to, event, registration }) {
  if (process.env.ENABLE_EMAIL_NOTIF !== 'true' || !to || to.endsWith('@guest.kalceria.local')) {
    return { skipped: true, reason: 'EMAIL_NOTIF_DISABLED_OR_GUEST' };
  }
  const safeTitle = escapeHtml(event.title || 'Kalceria Event');
  const html = buildEventPaymentConfirmedEmailHtml({ event, registration });

  return sendEmail({
    to,
    channel: 'notif',
    subject: `[Tiket Terkonfirmasi] ${safeTitle} (#${escapeHtml(registration.id.slice(-6))}) - Kalceria`,
    html,
  });
}

