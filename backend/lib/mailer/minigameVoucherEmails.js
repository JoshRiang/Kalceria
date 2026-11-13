import { sendEmail } from './emailClient.js';
import { escapeHtml } from './emailUtils.js';

function resolveAbsolutePosterUrl(event, frontendOrigin) {
  const publicBase = (frontendOrigin && !frontendOrigin.includes('localhost') && frontendOrigin.startsWith('https://'))
    ? frontendOrigin
    : 'https://www.kalceria.id';

  const posterRaw = String(event?.displayPhotoUrl || event?.posterUrl || '').trim();
  let url = posterRaw;
  if (!url) {
    url = `${publicBase}/event_3.jpg`;
  } else if (url.startsWith('http://') || url.startsWith('https://')) {
    if (url.includes('localhost')) {
      url = url.replace(/^http:\/\/localhost(:\d+)?/i, 'https://www.kalceria.id');
    }
  } else if (url.startsWith('/')) {
    url = `${publicBase}${url}`;
  } else {
    url = `${publicBase}/${url}`;
  }

  // Convert .webp to .jpg for universal email proxy rendering (Gmail GoogleImageProxy)
  if (url.endsWith('.webp')) {
    url = url.replace(/\.webp$/i, '.jpg');
  }

  return url;
}

function formatWibIssuedAt(isoDate) {
  try {
    const dt = isoDate ? new Date(isoDate) : new Date();
    return `${dt.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })} WIB`;
  } catch {
    return String(isoDate || '-');
  }
}

export function buildMinigameVoucherEmailHtml({ event = {}, voucher = {}, registration = {}, user = {} }) {
  const rawOrigin = process.env.FRONTEND_URL?.split(',')[0]?.trim() || 'https://www.kalceria.id';
  const frontendOrigin = (rawOrigin.includes('localhost') || !rawOrigin.startsWith('https://'))
    ? 'https://www.kalceria.id'
    : rawOrigin;
  const safeTitle = escapeHtml(event.title || voucher.eventTitle || 'Kalceria Event');
  const safePosterUrl = escapeHtml(resolveAbsolutePosterUrl(event, frontendOrigin));

  const regId = String(registration?.id || voucher?.registrationId || '').trim();
  const regCode = regId ? `#${escapeHtml(regId.slice(-6))} (${escapeHtml(regId)})` : '—';
  const safeSession = escapeHtml(registration?.selectedSession || voucher?.selectedSession || 'Regular Session');
  const safeName = escapeHtml(user?.name || voucher?.userName || 'Kalcerian');
  const safePhone = escapeHtml(user?.phone || voucher?.userPhone || '—');
  const safeEmail = escapeHtml(user?.email || voucher?.userEmail || '—');
  const safeLocation = escapeHtml(event?.location || voucher?.location || 'TBA');
  const priceNumber = Number(event?.price ?? voucher?.price ?? 0);
  const priceFormatted = Number.isFinite(priceNumber) ? priceNumber.toLocaleString('id-ID') : '0';
  const safePaymentStatus = escapeHtml(registration?.paymentStatus || voucher?.paymentStatus || 'CONFIRMED');
  const safeVoucherCode = escapeHtml(voucher?.voucherCode || '—');
  const bestScoreSeconds = Number.isFinite(Number(voucher?.bestScoreMs))
    ? `${(Number(voucher.bestScoreMs) / 1000).toFixed(2)}s`
    : '—';
  const issuedWib = escapeHtml(formatWibIssuedAt(voucher?.issuedAt));

  return `
      <div style="font-family:Arial,sans-serif;max-width:540px;margin:auto;padding:28px 24px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;color:#1e293b;">
        <div style="text-align:center;margin-bottom:20px;">
          <img src="https://www.kalceria.id/favicon.png?v=2" alt="Kalceria" width="56" height="50" style="display:inline-block;border:none;outline:none;" />
        </div>

        <h2 style="color:#0a0e27;margin:0 0 8px 0;font-size:22px;text-align:center;font-weight:900;letter-spacing:-0.5px;">Voucher Event: ${safeTitle}</h2>
        <p style="color:#475569;font-size:14px;text-align:center;margin:0 0 20px 0;">Hai <strong>${safeName}</strong>, selamat! Kamu terpilih sebagai pemenang Event Voucher Kalceria dari tantangan Minigame untuk event <strong>${safeTitle}</strong>.</p>

        ${safePosterUrl ? `
          <div style="text-align:center;margin:0 0 24px 0;">
            <img src="${safePosterUrl}" alt="${safeTitle}" width="260" height="347" style="width:260px;max-width:100%;height:auto;display:block;margin:0 auto;border:none;border-radius:12px;box-shadow:0 12px 30px rgba(0,0,0,0.25);" />
          </div>
        ` : ''}

        <div style="margin-bottom:24px;">
          <p style="margin:0 0 12px 0;font-size:12px;font-weight:bold;color:#0f172a;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;">Order Summary &amp; Event Parameters</p>
          <table style="width:100%;font-size:13px;color:#1e293b;border-collapse:collapse;">
            <tr><td style="padding:4px 0;font-weight:bold;width:130px;color:#334155;">Kode Voucher</td><td style="padding:4px 8px;width:10px;color:#94a3b8;">:</td><td style="padding:4px 0;font-weight:bold;color:#0a0e27;">${safeVoucherCode}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">ID Registrasi</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${regCode}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Nama Event</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${safeTitle}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Sesi Terpilih</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${safeSession}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Nama Peserta</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${safeName}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">WhatsApp</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${safePhone}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Email</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${safeEmail}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Lokasi Event</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${safeLocation}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Biaya Tiket</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">Rp ${priceFormatted}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Status Tiket</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${safePaymentStatus}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Skor Terbaik</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${escapeHtml(bestScoreSeconds)}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Diterbitkan</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${issuedWib}</td></tr>
          </table>
        </div>

        <p style="color:#64748b;font-size:12px;text-align:center;margin:20px 0 0 0;line-height:1.5;">
          Tunjukkan email ini beserta kode voucher dan ID registrasi kepada petugas Kalceria saat check-in di lokasi acara.
        </p>
      </div>
  `;
}

export function buildMinigameVoucherEmailText({ event = {}, voucher = {}, registration = {}, user = {} }) {
  const title = event.title || voucher.eventTitle || 'Kalceria Event';
  const regId = String(registration?.id || voucher?.registrationId || '').trim();
  const regCode = regId ? `#${regId.slice(-6)} (${regId})` : '-';
  const priceNumber = Number(event?.price ?? voucher?.price ?? 0);
  const priceFormatted = Number.isFinite(priceNumber) ? priceNumber.toLocaleString('id-ID') : '0';
  const bestScoreSeconds = Number.isFinite(Number(voucher?.bestScoreMs))
    ? `${(Number(voucher.bestScoreMs) / 1000).toFixed(2)}s`
    : '-';

  return [
    `Voucher Event: ${title}`,
    '',
    `Hai ${user?.name || voucher?.userName || 'Kalcerian'}, selamat! Kamu terpilih sebagai pemenang Event Voucher Kalceria untuk event target ${title}.`,
    '',
    `Kode Voucher      : ${voucher?.voucherCode || '-'}`,
    `ID Registrasi     : ${regCode}`,
    `Nama Event        : ${title}`,
    `Sesi Terpilih     : ${registration?.selectedSession || voucher?.selectedSession || 'Regular Session'}`,
    `Nama Peserta      : ${user?.name || voucher?.userName || '-'}`,
    `WhatsApp          : ${user?.phone || voucher?.userPhone || '-'}`,
    `Email             : ${user?.email || voucher?.userEmail || '-'}`,
    `Lokasi Event      : ${event?.location || voucher?.location || 'TBA'}`,
    `Biaya Tiket       : Rp ${priceFormatted}`,
    `Status Tiket      : ${registration?.paymentStatus || voucher?.paymentStatus || 'CONFIRMED'}`,
    `Skor Terbaik      : ${bestScoreSeconds}`,
    `Diterbitkan       : ${formatWibIssuedAt(voucher?.issuedAt)}`,
    '',
    'Tunjukkan email ini beserta kode voucher dan ID registrasi kepada petugas Kalceria saat check-in di lokasi acara.',
  ].join('\n');
}

export async function sendMinigameVoucherEmail({ to, event, voucher, registration, user }) {
  if (process.env.ENABLE_EMAIL_NOTIF !== 'true' || !to || to.endsWith('@guest.kalceria.local')) {
    return { skipped: true, reason: 'EMAIL_NOTIF_DISABLED_OR_GUEST' };
  }
  const eventTitle = event?.title || voucher?.eventTitle || 'Kalceria Event';
  const html = buildMinigameVoucherEmailHtml({ event, voucher, registration, user });
  const text = buildMinigameVoucherEmailText({ event, voucher, registration, user });

  return sendEmail({
    to,
    channel: 'notif',
    subject: `[Voucher Event] ${eventTitle} (${voucher?.voucherCode || 'WINNER'})`,
    html,
    text,
  });
}
