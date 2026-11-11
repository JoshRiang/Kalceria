/**
 * Pure WhatsApp Message Builders for Kalceria Communications
 *
 * Strictly zero emojis, structured transactional metadata,
 * targeted at official Kalceria admin dispatch channel (+62 811-7998-790).
 */

export function buildServiceRequestWaMessage(
  booking,
  slots = [],
  contactPerson,
  whatsapp,
  location,
  additionalNotes,
  senderLabel,
  isUpdate = false
) {
  const serviceLabelMap = {
    SHOOTING: 'Shooting / Production',
    EO: 'Event Organizer',
    HOST_EVENT: 'Host Event',
  };
  const serviceLabel = serviceLabelMap[booking?.serviceType] || booking?.serviceType;

  const formattedDates = [...new Set((slots || []).map((s) => {
    const d = new Date(s.date);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }))].join(', ');

  const formattedHours = (slots || []).map((s) => `${s.startTime} - ${s.endTime}`).join(', ');

  const header = isUpdate ? 'UPDATE PESANAN - NEED OUR HELP' : 'SERVICE REQUEST - NEED OUR HELP';

  const lines = [
    header,
    '',
    `Booking ID: #${booking?.id ? booking.id.slice(-6) : 'NEW'}`,
    `Service: ${serviceLabel}`,
    `Request Title: ${booking?.serviceName || '—'}`,
    `Operator Name: ${contactPerson || booking?.contactPerson || '—'}`,
    `WhatsApp: ${whatsapp || booking?.whatsapp || '—'}`,
    `Deployment Area: ${location || booking?.location || '—'}`,
    `Selected Date: ${formattedDates || '—'}`,
    `Selected Hours: ${formattedHours || '—'}`,
  ];

  const notes = additionalNotes !== undefined ? additionalNotes : booking?.additionalNotes;
  if (notes && String(notes).trim()) {
    const trimmed = String(notes).trim();
    lines.push(`Notes: ${trimmed.length > 50 ? trimmed.slice(0, 50) + '...' : trimmed}`);
  }
  if (senderLabel) {
    lines.push('');
    lines.push(`Dari: ${senderLabel}`);
  }

  return lines.join('\n');
}

export function buildEventRegistrationWaMessage({ event, registration, user, paymentCheckoutUrl }) {
  const regId = registration?.id ? registration.id.slice(-6) : 'PENDING';
  const participantName = user?.name || '—';
  const participantEmail = user?.email || '—';
  const participantPhone = user?.phone || user?.contact || '—';
  const eventTitle = event?.title || '—';
  const session = registration?.selectedSession || '—';
  const location = event?.location || 'TBA';
  const rawPrice = Number(event?.price || 0);
  const formattedPrice = rawPrice === 0 ? 'Rp 0 (Gratis / Free Entry)' : `Rp ${rawPrice.toLocaleString('id-ID')}`;
  const status = registration?.paymentStatus || 'PENDING';

  let formattedDate = '—';
  if (registration?.createdAt) {
    try {
      const d = new Date(registration.createdAt);
      formattedDate = d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
      }) + ' WIB';
    } catch {
      formattedDate = String(registration.createdAt);
    }
  }

  const lines = [
    'PENDAFTARAN EVENT - SEE EVENT',
    '',
    `Booking ID: #${regId}`,
    `Event: ${eventTitle}`,
    `Sesi: ${session}`,
    `Nama Pendaftar: ${participantName}`,
    `Email Pendaftar: ${participantEmail}`,
    `WhatsApp Pendaftar: ${participantPhone}`,
    `Lokasi Event: ${location}`,
    `Total Tagihan: ${formattedPrice}`,
    `Status Pendaftaran: ${status} (Menunggu Konfirmasi Email)`,
    `Waktu Pendaftaran: ${formattedDate}`,
  ];

  if (paymentCheckoutUrl) {
    lines.push(`Link Pembayaran Online: ${paymentCheckoutUrl}`);
  }

  lines.push('');
  lines.push('Catatan: Pendaftaran wajib dikonfirmasi via email pendaftar dalam batas waktu 3 menit sebelum slot kedaluwarsa.');

  return lines.join('\n');
}

