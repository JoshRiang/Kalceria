import { URLSearchParams } from 'node:url';

// ─── Environment & Provider Detection ─────────────────────────────────────────
export function isWhatsAppBotEnabled() {
  return process.env.ENABLE_WHATSAPP_BOT === 'true';
}

export function getWhatsAppBotProvider() {
  return (process.env.WA_BOT_PROVIDER || 'meta_cloud').toLowerCase();
}

export function isWhatsAppBotConfigured() {
  const provider = getWhatsAppBotProvider();
  if (provider === 'meta_cloud') {
    return Boolean(process.env.WA_PHONE_NUMBER_ID && process.env.WA_ACCESS_TOKEN);
  }
  if (provider === 'fonnte') {
    return Boolean(process.env.WA_FONNTE_TOKEN);
  }
  if (provider === 'generic_webhook') {
    return Boolean(process.env.WA_GATEWAY_URL);
  }
  return false;
}

// ─── Phone Normalization ──────────────────────────────────────────────────────
export function normalizeIndonesianPhone(rawPhone) {
  if (!rawPhone || typeof rawPhone !== 'string') return null;
  let digits = rawPhone.replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('0')) {
    digits = `62${digits.slice(1)}`;
  } else if (digits.startsWith('8')) {
    digits = `62${digits}`;
  } else if (!digits.startsWith('62') && digits.length >= 8) {
    digits = `62${digits}`;
  }

  if (digits.length < 9 || digits.length > 16) return null;
  return digits;
}

// ─── Core Message Sender ──────────────────────────────────────────────────────
export async function sendWhatsAppMessage({ to, message, templateName, templateParams = [] }) {
  if (!isWhatsAppBotEnabled() || !isWhatsAppBotConfigured()) {
    return { skipped: true, reason: 'WHATSAPP_BOT_DISABLED_OR_UNCONFIGURED' };
  }

  const normalizedTo = normalizeIndonesianPhone(to);
  if (!normalizedTo) {
    return { skipped: true, reason: 'INVALID_PHONE_NUMBER' };
  }

  const provider = getWhatsAppBotProvider();

  if (provider === 'meta_cloud') {
    return sendMetaCloudMessage({ to: normalizedTo, message, templateName, templateParams });
  }

  if (provider === 'fonnte') {
    return sendFonnteMessage({ to: normalizedTo, message });
  }

  if (provider === 'generic_webhook') {
    return sendGenericGatewayMessage({ to: normalizedTo, message });
  }

  throw new Error(`Unsupported WhatsApp Bot provider: ${provider}`);
}

// ─── Provider: Meta WhatsApp Cloud API ────────────────────────────────────────
async function sendMetaCloudMessage({ to, message, templateName, templateParams }) {
  const phoneId = process.env.WA_PHONE_NUMBER_ID;
  const accessToken = process.env.WA_ACCESS_TOKEN;
  const endpoint = `https://graph.facebook.com/v21.0/${phoneId}/messages`;

  const useTemplate = process.env.WA_USE_TEMPLATES === 'true' && templateName;

  const payload = useTemplate
    ? {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: process.env.WA_TEMPLATE_LANG || 'id' },
          components: templateParams.length
            ? [{ type: 'body', parameters: templateParams.map((text) => ({ type: 'text', text: String(text) })) }]
            : undefined,
        },
      }
    : {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { preview_url: true, body: message },
      };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[WhatsAppBroker:Meta] Message send failed:', response.status, errorBody);
    throw new Error('Meta WhatsApp API failed to deliver message.');
  }

  const data = await response.json();
  return { success: true, provider: 'meta_cloud', messageId: data.messages?.[0]?.id || null };
}

// ─── Provider: Fonnte API ─────────────────────────────────────────────────────
async function sendFonnteMessage({ to, message }) {
  const token = process.env.WA_FONNTE_TOKEN;
  const endpoint = 'https://api.fonnte.com/send';

  const formData = new URLSearchParams();
  formData.append('target', to);
  formData.append('message', message);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: token,
    },
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('[WhatsAppBroker:Fonnte] Send failed:', response.status, errText);
    throw new Error('Fonnte WhatsApp API failed to deliver message.');
  }

  const data = await response.json();
  return { success: true, provider: 'fonnte', data };
}

// ─── Provider: Generic Webhook Gateway ────────────────────────────────────────
async function sendGenericGatewayMessage({ to, message }) {
  const endpoint = process.env.WA_GATEWAY_URL;
  const token = process.env.WA_GATEWAY_TOKEN;

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ to, message, timestamp: Date.now() }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('[WhatsAppBroker:Gateway] Send failed:', response.status, errText);
    throw new Error('Generic WhatsApp Gateway failed to deliver message.');
  }

  return { success: true, provider: 'generic_webhook' };
}

// ─── Event Notification Dispatchers ───────────────────────────────────────────
export async function notifyEventRegistration({ registration, event, user, paymentCheckoutUrl }) {
  if (!isWhatsAppBotEnabled()) return { skipped: true };

  const participantPhone = user.phone;
  const priceStr = Number(event.price).toLocaleString('id-ID');

  const clientMsg = [
    `🏁 *KALCERIA EVENT REGISTRATION* 🏁`,
    ``,
    `Halo *${user.name}*, pendaftaran event kamu berhasil tercatat!`,
    ``,
    `📌 *Event:* ${event.title}`,
    `🗓 *Sesi:* ${registration.selectedSession}`,
    `🎫 *ID Tiket:* ${registration.id}`,
    `💰 *Biaya:* Rp ${priceStr}`,
    `📊 *Status:* ${registration.paymentStatus}`,
    ...(paymentCheckoutUrl ? [``, `💳 *Link Pembayaran Online:*`, paymentCheckoutUrl] : []),
    ``,
    `Sampai jumpa di arena, Kalcerian! 🔥`,
  ].join('\n');

  // 1. Send to participant
  if (participantPhone) {
    await sendWhatsAppMessage({
      to: participantPhone,
      message: clientMsg,
      templateName: process.env.WA_TEMPLATE_EVENT_REGISTRATION,
      templateParams: [user.name, event.title, registration.selectedSession, registration.id],
    }).catch((err) => console.warn('[WABot] Participant event notice failed:', err.message));
  }

  // 2. Alert Admin
  const adminNumber = process.env.WA_ADMIN_NUMBER;
  if (adminNumber) {
    const adminMsg = `📢 *EVENT REGISTRATION ALERT*\nEvent: ${event.title}\nPeserta: ${user.name} (${user.email})\nID: ${registration.id}\nSesi: ${registration.selectedSession}`;
    await sendWhatsAppMessage({ to: adminNumber, message: adminMsg }).catch(() => {});
  }

  return { success: true };
}

export async function notifyEventPaymentConfirmed({ registration, event, user }) {
  if (!isWhatsAppBotEnabled() || !user.phone) return { skipped: true };

  const clientMsg = [
    `🎉 *TIKET EVENT TERKONFIRMASI - KALCERIA* 🎉`,
    ``,
    `Halo *${user.name}*, pembayaran kamu untuk event *${event.title}* telah LUNAS!`,
    ``,
    `🎫 *KODE TIKET:* ${registration.id}`,
    `🗓 *Sesi:* ${registration.selectedSession}`,
    `✅ *Status:* CONFIRMED / LUNAS`,
    ``,
    `Tunjukkan pesan WhatsApp ini kepada crew check-in di gate masuk venue! Have fun! 🚗💨`,
  ].join('\n');

  return sendWhatsAppMessage({
    to: user.phone,
    message: clientMsg,
    templateName: process.env.WA_TEMPLATE_EVENT_CONFIRMED,
    templateParams: [user.name, event.title, registration.id],
  });
}

// ─── Service Request ("Need Our Help") Dispatchers ───────────────────────────
export async function notifyServiceRequestCreated({ booking, slots = [], user, contactPerson, whatsapp }) {
  if (!isWhatsAppBotEnabled()) return { skipped: true };

  const clientPhone = whatsapp || user.phone;
  const picName = contactPerson || user.name || 'Kak';
  const slotsCount = slots.length || 1;

  const clientMsg = [
    `📋 *KALCERIA - NEED OUR HELP CONFIRMATION* 📋`,
    ``,
    `Halo *${picName}*, request layanan *${booking.serviceType}* kamu sudah kami terima!`,
    ``,
    `📌 *ID Booking:* ${booking.id}`,
    `🛠 *Layanan:* ${booking.serviceType}`,
    `🏷 *Project:* ${booking.serviceName || '—'}`,
    `📍 *Lokasi:* ${booking.location || 'TBD'}`,
    `⏰ *Slot:* ${slotsCount} slot waktu`,
    ``,
    `Crew operasional Kalceria sedang meninjau brief dan ketersediaan jadwal. Kami akan menghubungi kamu segera! 🤝`,
  ].join('\n');

  if (clientPhone) {
    await sendWhatsAppMessage({
      to: clientPhone,
      message: clientMsg,
      templateName: process.env.WA_TEMPLATE_SERVICE_REQUEST,
      templateParams: [picName, booking.serviceType, booking.id],
    }).catch((err) => console.warn('[WABot] Client service notice failed:', err.message));
  }

  // Alert Ops Admin
  const adminNumber = process.env.WA_ADMIN_NUMBER;
  if (adminNumber) {
    const adminMsg = `🚨 *NEW SERVICE REQUEST ALERT*\nLayanan: ${booking.serviceType}\nProject: ${booking.serviceName || '—'}\nPIC: ${picName} (${clientPhone})\nSlot: ${slotsCount} slot\nID: ${booking.id}`;
    await sendWhatsAppMessage({ to: adminNumber, message: adminMsg }).catch(() => {});
  }

  return { success: true };
}

export async function notifyServiceRequestUpdated({ booking, user, status }) {
  if (!isWhatsAppBotEnabled()) return { skipped: true };

  const clientPhone = booking.whatsapp || user.phone;
  if (!clientPhone) return { skipped: true };

  const picName = booking.contactPerson || user.name || 'Kak';
  const priceInfo = booking.totalPrice ? `\n💰 *Total Biaya:* Rp ${Number(booking.totalPrice).toLocaleString('id-ID')}` : '';

  const msg = [
    `🔔 *UPDATE STATUS LAYANAN KALCERIA* 🔔`,
    ``,
    `Halo *${picName}*, status booking kamu (*${booking.id}*) telah diperbarui:`,
    ``,
    `🛠 *Layanan:* ${booking.serviceType}`,
    `📊 *Status Baru:* *${status}*${priceInfo}`,
    ...(booking.technicalBrief ? [`📝 *Brief:* ${booking.technicalBrief}`] : []),
    ``,
    `Hubungi kami jika ada pertanyaan teknis lebih lanjut! Terima kasih.`,
  ].join('\n');

  return sendWhatsAppMessage({ to: clientPhone, message: msg });
}
