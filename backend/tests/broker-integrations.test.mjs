import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { redis } from '../lib/redis.js';
import {
  isEmailAuthConfigured,
  isEmailNotifConfigured,
  sendOtpEmail,
  sendEventRegistrationEmail,
  sendServiceRequestSubmittedEmail,
} from '../lib/mailer.js';
import {
  isOnlinePaymentEnabled,
  isPaymentBrokerConfigured,
  formatEventOrderId,
  verifyAndNormalizePaymentWebhook,
} from '../lib/paymentBroker.js';
import {
  isWhatsAppBotEnabled,
  normalizeIndonesianPhone,
  sendWhatsAppMessage,
} from '../lib/whatsappBroker.js';

describe('Broker Integrations - Safety and Inactive States', () => {
  it('keeps online payment and whatsapp bot disabled by default', () => {
    assert.equal(isOnlinePaymentEnabled(), false);
    assert.equal(isWhatsAppBotEnabled(), false);
    assert.equal(isPaymentBrokerConfigured(), false);
    assert.equal(isEmailAuthConfigured(), false);
    assert.equal(isEmailNotifConfigured(), false);
  });

  it('skips OTP email gracefully when ENABLE_EMAIL_AUTH is off', async () => {
    const res = await sendOtpEmail('user@test.com', '123456');
    assert.equal(res.skipped, true);
    assert.equal(res.reason, 'EMAIL_AUTH_DISABLED');
  });

  it('skips notification email gracefully when ENABLE_EMAIL_NOTIF is off', async () => {
    const res = await sendEventRegistrationEmail({
      to: 'participant@test.com',
      event: { title: 'Meetup', price: 50000 },
      registration: { id: 'reg-123', selectedSession: 'Sesi A', paymentStatus: 'PENDING' },
    });
    assert.equal(res.skipped, true);
    assert.equal(res.reason, 'EMAIL_NOTIF_DISABLED_OR_GUEST');
  });

  it('skips service request email gracefully when ENABLE_EMAIL_NOTIF is off', async () => {
    const res = await sendServiceRequestSubmittedEmail({
      to: 'client@test.com',
      booking: { id: 'bk-123', serviceType: 'SHOOTING' },
    });
    assert.equal(res.skipped, true);
    assert.equal(res.reason, 'EMAIL_NOTIF_DISABLED_OR_GUEST');
  });
});

describe('WhatsApp Broker - Phone Normalization', () => {
  it('correctly normalizes diverse Indonesian phone formats', () => {
    assert.equal(normalizeIndonesianPhone('081234567890'), '6281234567890');
    assert.equal(normalizeIndonesianPhone('+62 812-3456-7890'), '6281234567890');
    assert.equal(normalizeIndonesianPhone('81234567890'), '6281234567890');
    assert.equal(normalizeIndonesianPhone('6281234567890'), '6281234567890');
    assert.equal(normalizeIndonesianPhone('0857-1111-2222'), '6285711112222');
  });

  it('rejects invalid or too short numbers', () => {
    assert.equal(normalizeIndonesianPhone(''), null);
    assert.equal(normalizeIndonesianPhone('123'), null);
    assert.equal(normalizeIndonesianPhone('abcdef'), null);
  });

  it('skips sending when WA bot is disabled', async () => {
    const res = await sendWhatsAppMessage({ to: '081234567890', message: 'Hello' });
    assert.equal(res.skipped, true);
  });
});

describe('Payment Broker - Order Formatting & Verification', () => {
  it('generates deterministic and sanitized order ID from registration ID', () => {
    const regId = 'c14d982e-da9f-4015-97e5-8269e8f18888';
    const orderId = formatEventOrderId(regId);
    assert.match(orderId, /^KALC-EVT-c14d982eda-[a-z0-9]+$/);
  });

  it('verifies valid Midtrans SHA-512 signatures accurately', async () => {
    const oldKey = process.env.MIDTRANS_SERVER_KEY;
    const oldProvider = process.env.PAYMENT_PROVIDER;
    try {
      process.env.PAYMENT_PROVIDER = 'midtrans';
      process.env.MIDTRANS_SERVER_KEY = 'SB-Mid-server-TEST12345';

      const orderId = 'KALC-EVT-TEST-1';
      const statusCode = '200';
      const grossAmount = '150000.00';
      const expectedSig = crypto
        .createHash('sha512')
        .update(`${orderId}${statusCode}${grossAmount}SB-Mid-server-TEST12345`)
        .digest('hex');

      const verification = await verifyAndNormalizePaymentWebhook({
        headers: {},
        body: {
          order_id: orderId,
          status_code: statusCode,
          gross_amount: grossAmount,
          signature_key: expectedSig,
          transaction_status: 'settlement',
          transaction_id: 'tx-999',
        },
      });

      assert.equal(verification.valid, true);
      assert.equal(verification.status, 'CONFIRMED');
      assert.equal(verification.amount, 150000);
      assert.equal(verification.transactionId, 'tx-999');
    } finally {
      process.env.MIDTRANS_SERVER_KEY = oldKey;
      process.env.PAYMENT_PROVIDER = oldProvider;
    }
  });

  it('rejects tampered Midtrans signatures', async () => {
    const oldKey = process.env.MIDTRANS_SERVER_KEY;
    const oldProvider = process.env.PAYMENT_PROVIDER;
    try {
      process.env.PAYMENT_PROVIDER = 'midtrans';
      process.env.MIDTRANS_SERVER_KEY = 'SB-Mid-server-TEST12345';

      const verification = await verifyAndNormalizePaymentWebhook({
        headers: {},
        body: {
          order_id: 'KALC-EVT-TEST-1',
          status_code: '200',
          gross_amount: '150000.00',
          signature_key: 'fake-signature-abc1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          transaction_status: 'settlement',
        },
      });

      assert.equal(verification.valid, false);
      assert.equal(verification.error, 'INVALID_SIGNATURE');
    } finally {
      process.env.MIDTRANS_SERVER_KEY = oldKey;
      process.env.PAYMENT_PROVIDER = oldProvider;
    }
  });

  it('verifies valid Xendit callback tokens accurately', async () => {
    const oldToken = process.env.XENDIT_WEBHOOK_TOKEN;
    const oldProvider = process.env.PAYMENT_PROVIDER;
    try {
      process.env.PAYMENT_PROVIDER = 'xendit';
      process.env.XENDIT_WEBHOOK_TOKEN = 'xendit_token_secret_xyz123';

      const verification = await verifyAndNormalizePaymentWebhook({
        headers: { 'x-callback-token': 'xendit_token_secret_xyz123' },
        body: {
          external_id: 'KALC-EVT-TEST-2',
          status: 'PAID',
          paid_amount: 75000,
          id: 'xnd-inv-123',
        },
      });

      assert.equal(verification.valid, true);
      assert.equal(verification.status, 'CONFIRMED');
      assert.equal(verification.amount, 75000);
    } finally {
      process.env.XENDIT_WEBHOOK_TOKEN = oldToken;
      process.env.PAYMENT_PROVIDER = oldProvider;
    }
  });

  after(() => {
    redis.disconnect();
  });
});
