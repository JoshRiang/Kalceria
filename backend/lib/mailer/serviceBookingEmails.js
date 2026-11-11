import { sendEmail, ADMIN_NOTIF_EMAIL } from './emailClient.js';
import { escapeHtml } from './emailUtils.js';

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
  const confirmUrl = `${frontendOrigin}/api/services/request/${encodeURIComponent(booking.id)}/confirm?service_action=confirm&booking_id=${encodeURIComponent(booking.id)}${token ? `&token=${encodeURIComponent(token)}&manage_token=${encodeURIComponent(token)}` : ''}`;
  const editUrl = `${frontendOrigin}/?service_action=edit&booking_id=${encodeURIComponent(booking.id)}${token ? `&token=${encodeURIComponent(token)}&manage_token=${encodeURIComponent(token)}` : ''}&anchor=need-our-help#need-our-help`;
  const cancelUrl = `${frontendOrigin}/?service_action=cancel&booking_id=${encodeURIComponent(booking.id)}${token ? `&token=${encodeURIComponent(token)}&manage_token=${encodeURIComponent(token)}` : ''}&anchor=need-our-help#need-our-help`;
  const timerBadgeUrl = `${frontendOrigin}/api/services/request/${encodeURIComponent(booking.id)}/timer.gif`;

  return `
      <style>
        @keyframes expireActionButtons {
          0%, 98% { opacity: 1; filter: none; pointer-events: auto; }
          100% { opacity: 0.28 !important; filter: grayscale(100%) brightness(0.6) !important; pointer-events: none !important; }
        }
        .action-buttons-box {
          animation: expireActionButtons 180s ease-in forwards;
        }
      </style>
      <div style="font-family:Arial,sans-serif;max-width:540px;margin:auto;padding:28px 24px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;color:#1e293b;">
        <div style="text-align:center;margin-bottom:20px;">
          <img src="https://www.kalceria.id/favicon.png?v=2" alt="Kalceria" width="56" height="50" style="display:inline-block;border:none;outline:none;" />
        </div>

        <h2 style="color:#0a0e27;margin:0 0 8px 0;font-size:22px;text-align:center;font-weight:900;letter-spacing:-0.5px;">Transmission Received: Need Our Help</h2>
        <p style="color:#475569;font-size:14px;text-align:center;margin:0 0 20px 0;">Hai <strong>${escapeHtml(booking.contactPerson || 'Pelanggan')}</strong>, permintaan layanan kamu telah berhasil masuk ke sistem kami.</p>

        <div style="margin-bottom:24px;">
          <p style="margin:0 0 12px 0;font-size:12px;font-weight:bold;color:#0f172a;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;">Booking Details</p>
          <table style="width:100%;font-size:13px;color:#1e293b;border-collapse:collapse;">
            <tr><td style="padding:4px 0;font-weight:bold;width:130px;color:#334155;">Booking ID</td><td style="padding:4px 8px;width:10px;color:#94a3b8;">:</td><td style="padding:4px 0;">#${escapeHtml(booking.id.slice(-6))} (${escapeHtml(booking.id)})</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Service</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${escapeHtml(serviceLabel)}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Request Title</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${escapeHtml(booking.serviceName || '—')}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Operator Name</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${escapeHtml(booking.contactPerson || '—')}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">WhatsApp</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${escapeHtml(booking.whatsapp || '—')}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Email</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${escapeHtml(booking.requestor?.email || booking.email || '—')}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Deployment Area</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${escapeHtml(booking.location || 'TBD')}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Selected Schedule</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${slotsSummary}</td></tr>
            ${booking.additionalNotes ? `<tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Notes</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${escapeHtml(booking.additionalNotes)}</td></tr>` : ''}
          </table>
        </div>

        <div style="margin:20px 0 16px 0;">
          <p style="margin:0 0 6px 0;font-weight:bold;color:#0f172a;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Konfirmasi Pesanan (Wajib) / Mandatory Confirmation:</p>
          <p style="margin:0;color:#334155;font-size:13px;line-height:1.6;">
            Apabila kamu sudah yakin dengan parameter pesanan, silakan klik tombol <strong>CONFIRM</strong> di bawah ini untuk mengunci dan memverifikasi pesanan ke sistem operasional kami sebelum batas waktu 3 menit berakhir. Jika waktu habis tanpa konfirmasi, pesanan otomatis dibatalkan dan dihapus dari sistem.
          </p>
        </div>

        <div style="margin:0 0 24px 0;">
          <p style="margin:0 0 6px 0;font-weight:bold;color:#0f172a;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Ketentuan Pemesanan &amp; Perubahan / Modification Policy:</p>
          <ol style="margin:0;padding-left:18px;color:#334155;font-size:13px;line-height:1.6;">
            <li><strong>Batas Waktu Perubahan (3 Menit):</strong> Pemesan masih memiliki hak penuh untuk mengedit parameter atau membatalkan pesanan dalam kurun waktu 3 menit setelah pesanan berhasil dibuat.</li>
            <li>Setelah 3 menit berlalu, pesanan akan secara otomatis dikunci dan masuk ke antrean koordinasi operasional tim Kalceria.</li>
          </ol>
        </div>

        <div style="text-align:center;margin:22px 0 14px 0;">
          <img src="${timerBadgeUrl}" alt="Status Waktu 3 Menit" width="460" height="46" style="max-width:100%;height:auto;display:inline-block;border:none;outline:none;" />
        </div>

        <div class="action-buttons-box" style="text-align:center;margin:16px 0 20px 0;">
          <a href="${confirmUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#000000;color:#ffffff;border:1px solid #000000;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;letter-spacing:0.5px;font-family:Arial,sans-serif;margin:0 8px 8px 0;">CONFIRM</a>
          <a href="${editUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#000000;color:#ffffff;border:1px solid #000000;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;letter-spacing:0.5px;font-family:Arial,sans-serif;margin:0 8px 8px 0;">EDIT</a>
          <a href="${cancelUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#000000;color:#ffffff;border:1px solid #000000;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;letter-spacing:0.5px;font-family:Arial,sans-serif;margin:0 8px 8px 0;">CANCEL</a>
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
  const confirmUrl = `${frontendOrigin}/api/services/request/${encodeURIComponent(booking.id)}/confirm?service_action=confirm&booking_id=${encodeURIComponent(booking.id)}${token ? `&token=${encodeURIComponent(token)}&manage_token=${encodeURIComponent(token)}` : ''}`;
  const cancelUrl = `${frontendOrigin}/?service_action=cancel&booking_id=${encodeURIComponent(booking.id)}${token ? `&token=${encodeURIComponent(token)}&manage_token=${encodeURIComponent(token)}` : ''}&anchor=need-our-help#need-our-help`;
  const timerBadgeUrl = `${frontendOrigin}/api/services/request/${encodeURIComponent(booking.id)}/timer.gif`;

  return `
      <style>
        @keyframes expireActionButtons {
          0%, 98% { opacity: 1; filter: none; pointer-events: auto; }
          100% { opacity: 0.28 !important; filter: grayscale(100%) brightness(0.6) !important; pointer-events: none !important; }
        }
        .action-buttons-box {
          animation: expireActionButtons 180s ease-in forwards;
        }
      </style>
      <div style="font-family:Arial,sans-serif;max-width:540px;margin:auto;padding:28px 24px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;color:#1e293b;">
        <div style="text-align:center;margin-bottom:20px;">
          <img src="https://www.kalceria.id/favicon.png?v=2" alt="Kalceria" width="56" height="50" style="display:inline-block;border:none;outline:none;" />
        </div>

        <h2 style="color:#0a0e27;margin:0 0 8px 0;font-size:22px;text-align:center;font-weight:900;letter-spacing:-0.5px;">Ringkasan Update: Need Our Help</h2>
        <p style="color:#475569;font-size:14px;text-align:center;margin:0 0 20px 0;">Hai <strong>${escapeHtml(booking.contactPerson || 'Pelanggan')}</strong>, pembaruan parameter pesanan layanan kamu telah berhasil disimpan di sistem kami.</p>

        <div style="margin-bottom:24px;">
          <p style="margin:0 0 12px 0;font-size:12px;font-weight:bold;color:#0f172a;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;">Updated Booking Details</p>
          <table style="width:100%;font-size:13px;color:#1e293b;border-collapse:collapse;">
            <tr><td style="padding:4px 0;font-weight:bold;width:130px;color:#334155;">Booking ID</td><td style="padding:4px 8px;width:10px;color:#94a3b8;">:</td><td style="padding:4px 0;">#${escapeHtml(booking.id.slice(-6))} (${escapeHtml(booking.id)})</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Service</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${escapeHtml(serviceLabel)}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Request Title</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${escapeHtml(booking.serviceName || '—')}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Operator Name</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${escapeHtml(booking.contactPerson || '—')}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">WhatsApp</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${escapeHtml(booking.whatsapp || '—')}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Email</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${escapeHtml(booking.requestor?.email || booking.email || '—')}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Deployment Area</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${escapeHtml(booking.location || 'TBD')}</td></tr>
            <tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Selected Schedule</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${slotsSummary}</td></tr>
            ${booking.additionalNotes ? `<tr><td style="padding:4px 0;font-weight:bold;color:#334155;">Notes</td><td style="padding:4px 8px;color:#94a3b8;">:</td><td style="padding:4px 0;">${escapeHtml(booking.additionalNotes)}</td></tr>` : ''}
          </table>
        </div>

        <div style="margin:20px 0 16px 0;">
          <p style="margin:0 0 6px 0;font-weight:bold;color:#0f172a;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Konfirmasi Pembaruan (Wajib) / Mandatory Confirmation:</p>
          <p style="margin:0;color:#334155;font-size:13px;line-height:1.6;">
            Apabila pembaruan parameter pesanan kamu sudah sesuai dan yakin, silakan klik tombol <strong>CONFIRM</strong> di bawah ini untuk mengunci dan memverifikasi pesanan ke sistem operasional kami sebelum sisa waktu 3 menit berakhir. Jika waktu habis tanpa konfirmasi, pesanan otomatis dihapus dari sistem.
          </p>
        </div>

        <div style="margin:0 0 24px 0;">
          <p style="margin:0 0 6px 0;font-weight:bold;color:#0f172a;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Ketentuan Pembatalan / Cancellation Policy:</p>
          <ol style="margin:0;padding-left:18px;color:#334155;font-size:13px;line-height:1.6;">
            <li><strong>Batas Waktu Pembatalan (3 Menit Terpadu):</strong> Countdown tetap mengacu pada timeline 3 menit awal pemesanan dan counter tidak direset. Kamu masih memiliki hak untuk membatalkan pesanan ini selama sisa waktu 3 menit masih berlangsung.</li>
            <li>Setelah 3 menit berlalu dari waktu pemesanan awal, jadwal operasional akan otomatis dikunci dan masuk ke antrean koordinasi operasional tim Kalceria.</li>
          </ol>
        </div>

        <div style="text-align:center;margin:22px 0 14px 0;">
          <img src="${timerBadgeUrl}" alt="Status Waktu 3 Menit" width="460" height="46" style="max-width:100%;height:auto;display:inline-block;border:none;outline:none;" />
        </div>

        <div class="action-buttons-box" style="text-align:center;margin:16px 0 20px 0;">
          <a href="${confirmUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#000000;color:#ffffff;border:1px solid #000000;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;letter-spacing:0.5px;font-family:Arial,sans-serif;margin:0 8px 8px 0;">CONFIRM</a>
          <a href="${cancelUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#000000;color:#ffffff;border:1px solid #000000;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;letter-spacing:0.5px;font-family:Arial,sans-serif;margin:0 8px 8px 0;">CANCEL</a>
        </div>

        <p style="color:#64748b;font-size:12px;text-align:center;margin:20px 0 0 0;line-height:1.5;">
          Crew operasional Kalceria juga dapat menghubungi kamu via WhatsApp untuk koordinasi teknis lebih lanjut.
        </p>
      </div>
  `;
}

export function buildServiceRequestConfirmedEmailHtml({ booking, slots = [] }) {
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

  return `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:24px auto;color:#000000;line-height:1.6;">
        <h2 style="font-size:18px;font-weight:bold;margin:0 0 12px 0;color:#000000;text-transform:uppercase;letter-spacing:0.5px;">RINGKASAN PESANAN</h2>
        <!-- Final Booking Summary | Order Confirmed &amp; Persisted -->
        <p style="font-size:13px;margin:0 0 16px 0;color:#000000;">
          Pesanan layanan kamu telah terkonfirmasi dan resmi tersimpan di sistem operasional Kalceria. Seluruh parameter jadwal dan detail teknis telah terkunci untuk koordinasi pelaksanaan tugas oleh tim kami.
        </p>

        <table style="width:100%;font-size:13px;color:#000000;border-collapse:collapse;margin-bottom:20px;">
          <tr><td style="padding:6px 0;font-weight:bold;width:140px;color:#000000;">Booking ID</td><td style="padding:6px 8px;width:10px;color:#000000;">:</td><td style="padding:6px 0;color:#000000;">#${escapeHtml(booking.id.slice(-6))} (${escapeHtml(booking.id)})</td></tr>
          <tr><td style="padding:6px 0;font-weight:bold;color:#000000;">Layanan</td><td style="padding:6px 8px;color:#000000;">:</td><td style="padding:6px 0;color:#000000;">${escapeHtml(serviceLabel)}</td></tr>
          <tr><td style="padding:6px 0;font-weight:bold;color:#000000;">Judul Request</td><td style="padding:6px 8px;color:#000000;">:</td><td style="padding:6px 0;color:#000000;">${escapeHtml(booking.serviceName || '—')}</td></tr>
          <tr><td style="padding:6px 0;font-weight:bold;color:#000000;">Nama Operator</td><td style="padding:6px 8px;color:#000000;">:</td><td style="padding:6px 0;color:#000000;">${escapeHtml(booking.contactPerson || '—')}</td></tr>
          <tr><td style="padding:6px 0;font-weight:bold;color:#000000;">WhatsApp</td><td style="padding:6px 8px;color:#000000;">:</td><td style="padding:6px 0;color:#000000;">${escapeHtml(booking.whatsapp || '—')}</td></tr>
          <tr><td style="padding:6px 0;font-weight:bold;color:#000000;">Email</td><td style="padding:6px 8px;color:#000000;">:</td><td style="padding:6px 0;color:#000000;">${escapeHtml(booking.requestor?.email || booking.email || '—')}</td></tr>
          <tr><td style="padding:6px 0;font-weight:bold;color:#000000;">Area Penugasan</td><td style="padding:6px 8px;color:#000000;">:</td><td style="padding:6px 0;color:#000000;">${escapeHtml(booking.location || 'TBD')}</td></tr>
          <tr><td style="padding:6px 0;font-weight:bold;color:#000000;">Jadwal Terpilih</td><td style="padding:6px 8px;color:#000000;">:</td><td style="padding:6px 0;color:#000000;">${slotsSummary}</td></tr>
          ${booking.additionalNotes ? `<tr><td style="padding:6px 0;font-weight:bold;color:#000000;">Catatan Tambahan</td><td style="padding:6px 8px;color:#000000;">:</td><td style="padding:6px 0;color:#000000;">${escapeHtml(booking.additionalNotes)}</td></tr>` : ''}
        </table>

        <p style="font-size:12px;margin:0;color:#000000;line-height:1.5;">
          Tim operasional Kalceria akan segera menghubungi kamu melalui WhatsApp untuk koordinasi teknis lebih lanjut.
        </p>
      </div>
  `;
}

export async function sendServiceRequestConfirmedEmail({ to, booking, slots = [] }) {
  if (process.env.ENABLE_EMAIL_NOTIF !== 'true' || !to || to.endsWith('@guest.kalceria.local')) {
    return { skipped: true, reason: 'EMAIL_NOTIF_DISABLED_OR_GUEST' };
  }

  const serviceLabelMap = {
    SHOOTING: 'Shooting / Production',
    EO: 'Event Organizer',
    HOST_EVENT: 'Host Event',
  };
  const serviceLabel = serviceLabelMap[booking.serviceType] || booking.serviceType;
  const html = buildServiceRequestConfirmedEmailHtml({ booking, slots });

  return sendEmail({
    to,
    channel: 'notif',
    subject: `[Need Our Help] Order Confirmed & Persisted: ${escapeHtml(serviceLabel)} (#${escapeHtml(booking.id.slice(-6))})`,
    html,
  });
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

