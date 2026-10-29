import crypto from 'node:crypto';
import { redis } from './redis.js';

// ─── Environment & Provider Detection ─────────────────────────────────────────
export function isOnlinePaymentEnabled() {
  return process.env.ENABLE_ONLINE_PAYMENT === 'true';
}

export function getPaymentProviderName() {
  return (process.env.PAYMENT_PROVIDER || 'midtrans').toLowerCase();
}

export function isPaymentBrokerConfigured() {
  const provider = getPaymentProviderName();
  if (provider === 'midtrans') {
    return Boolean(process.env.MIDTRANS_SERVER_KEY && process.env.MIDTRANS_CLIENT_KEY);
  }
  if (provider === 'xendit') {
    return Boolean(process.env.XENDIT_SECRET_KEY && process.env.XENDIT_WEBHOOK_TOKEN);
  }
  return false;
}

export function getClientPaymentConfig() {
  const enabled = isOnlinePaymentEnabled() && isPaymentBrokerConfigured();
  const provider = getPaymentProviderName();
  return {
    enabled,
    provider,
    clientKey: provider === 'midtrans' ? (process.env.MIDTRANS_CLIENT_KEY || null) : null,
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true' || process.env.NODE_ENV === 'production',
  };
}

// ─── Order ID Generation & Storage ───────────────────────────────────────────
export function formatEventOrderId(registrationId) {
  const shortId = registrationId.replace(/-/g, '').slice(0, 10);
  const stamp = Date.now().toString(36);
  return `KALC-EVT-${shortId}-${stamp}`;
}

// ─── Create Payment Checkout Session ─────────────────────────────────────────
export async function createEventPaymentSession({ event, registration, user, frontendReturnUrl }) {
  if (!isOnlinePaymentEnabled() || !isPaymentBrokerConfigured()) {
    return {
      enabled: false,
      paymentRequired: Number(event.price) > 0,
      checkoutUrl: null,
      token: null,
      orderId: null,
    };
  }

  const grossAmount = Math.round(Number(event.price));
  if (grossAmount <= 0) {
    return {
      enabled: true,
      paymentRequired: false,
      checkoutUrl: null,
      token: null,
      orderId: null,
    };
  }

  const orderId = formatEventOrderId(registration.id);
  const provider = getPaymentProviderName();

  // Save session metadata in Redis with 24h expiration
  await redis.set(
    `payment:order:${orderId}`,
    JSON.stringify({
      orderId,
      registrationId: registration.id,
      eventId: event.id,
      userId: user?.id || registration.userId,
      amount: grossAmount,
      provider,
      createdAt: new Date().toISOString(),
    }),
    'EX',
    86400,
  );

  if (provider === 'midtrans') {
    return createMidtransSnapSession({ event, registration, user, orderId, grossAmount, frontendReturnUrl });
  }

  if (provider === 'xendit') {
    return createXenditInvoiceSession({ event, registration, user, orderId, grossAmount, frontendReturnUrl });
  }

  throw new Error(`Unsupported payment provider: ${provider}`);
}

// ─── Midtrans Snap Integration ───────────────────────────────────────────────
async function createMidtransSnapSession({ event, registration: _registration, user, orderId, grossAmount, frontendReturnUrl }) {
  const isProd = process.env.MIDTRANS_IS_PRODUCTION === 'true';
  const endpoint = isProd
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  const authHeader = `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`;

  const payload = {
    transaction_details: {
      order_id: orderId,
      gross_amount: grossAmount,
    },
    item_details: [
      {
        id: event.id,
        price: grossAmount,
        quantity: 1,
        name: (event.title || 'Event Registration').slice(0, 50),
      },
    ],
    customer_details: {
      first_name: (user.name || 'Participant').slice(0, 50),
      email: user.email && !user.email.endsWith('@guest.kalceria.local') ? user.email : 'guest@kalceria.com',
      phone: user.phone || undefined,
    },
    callbacks: frontendReturnUrl ? { finish: frontendReturnUrl } : undefined,
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[PaymentBroker:Midtrans] Snap creation failed:', response.status, errorBody);
    throw new Error('Failed to create payment session with payment broker.');
  }

  const data = await response.json();
  return {
    enabled: true,
    paymentRequired: true,
    provider: 'midtrans',
    orderId,
    token: data.token,
    checkoutUrl: data.redirect_url,
  };
}

// ─── Xendit Invoice Integration ──────────────────────────────────────────────
async function createXenditInvoiceSession({ event, registration, user, orderId, grossAmount, frontendReturnUrl }) {
  const endpoint = 'https://api.xendit.co/v2/invoices';
  const secretKey = process.env.XENDIT_SECRET_KEY;
  const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;

  const payload = {
    external_id: orderId,
    amount: grossAmount,
    description: `Kalceria Event: ${(event.title || '').slice(0, 50)} (Sesi ${registration.selectedSession})`,
    customer: {
      given_names: (user.name || 'Participant').slice(0, 50),
      email: user.email && !user.email.endsWith('@guest.kalceria.local') ? user.email : 'guest@kalceria.com',
      mobile_number: user.phone || undefined,
    },
    success_redirect_url: frontendReturnUrl || undefined,
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[PaymentBroker:Xendit] Invoice creation failed:', response.status, errorBody);
    throw new Error('Failed to create payment invoice with payment broker.');
  }

  const data = await response.json();
  return {
    enabled: true,
    paymentRequired: true,
    provider: 'xendit',
    orderId,
    token: data.id,
    checkoutUrl: data.invoice_url,
  };
}

// ─── Webhook Signature Verification & Normalization ───────────────────────────
export async function verifyAndNormalizePaymentWebhook({ headers, body }) {
  const provider = getPaymentProviderName();

  if (provider === 'midtrans') {
    return verifyMidtransWebhook(body);
  }

  if (provider === 'xendit') {
    return verifyXenditWebhook({ headers, body });
  }

  return { valid: false, error: 'UNKNOWN_PROVIDER' };
}

function verifyMidtransWebhook(body) {
  const { order_id, status_code, gross_amount, signature_key, transaction_status, fraud_status, transaction_id } = body || {};

  if (!order_id || !status_code || !gross_amount || !signature_key) {
    return { valid: false, error: 'MISSING_SIGNATURE_FIELDS' };
  }

  const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
  const expectedSignature = crypto
    .createHash('sha512')
    .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
    .digest('hex');

  const bufA = Buffer.from(signature_key);
  const bufB = Buffer.from(expectedSignature);

  if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
    return { valid: false, error: 'INVALID_SIGNATURE' };
  }

  let normalizedStatus = 'PENDING';
  if (transaction_status === 'capture') {
    normalizedStatus = fraud_status === 'accept' ? 'CONFIRMED' : 'REJECTED';
  } else if (transaction_status === 'settlement') {
    normalizedStatus = 'CONFIRMED';
  } else if (['cancel', 'deny', 'expire'].includes(transaction_status)) {
    normalizedStatus = 'REJECTED';
  }

  return {
    valid: true,
    provider: 'midtrans',
    orderId: order_id,
    transactionId: transaction_id || order_id,
    amount: parseFloat(gross_amount),
    status: normalizedStatus,
    rawStatus: transaction_status,
  };
}

function verifyXenditWebhook({ headers, body }) {
  const incomingToken = headers['x-callback-token'];
  const expectedToken = process.env.XENDIT_WEBHOOK_TOKEN;

  if (!incomingToken || !expectedToken) {
    return { valid: false, error: 'MISSING_XENDIT_TOKEN' };
  }

  const bufA = Buffer.from(incomingToken);
  const bufB = Buffer.from(expectedToken);
  if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
    return { valid: false, error: 'INVALID_XENDIT_TOKEN' };
  }

  const { external_id, status, paid_amount, id } = body || {};
  let normalizedStatus = 'PENDING';
  if (status === 'PAID' || status === 'SETTLED') {
    normalizedStatus = 'CONFIRMED';
  } else if (status === 'EXPIRED') {
    normalizedStatus = 'REJECTED';
  }

  return {
    valid: true,
    provider: 'xendit',
    orderId: external_id,
    transactionId: id || external_id,
    amount: parseFloat(paid_amount || 0),
    status: normalizedStatus,
    rawStatus: status,
  };
}
