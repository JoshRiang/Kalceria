import { isEmailAuthConfigured, isEmailNotifConfigured } from '../lib/mailer.js';
import { isOnlinePaymentEnabled, isPaymentBrokerConfigured, getPaymentProviderName } from '../lib/paymentBroker.js';
import { isWhatsAppBotEnabled, isWhatsAppBotConfigured, getWhatsAppBotProvider } from '../lib/whatsappBroker.js';

// ─── GET /integrations/status (Public Capabilities) ──────────────────────────
export function getPublicIntegrationStatus(_req, res) {
  res.json({
    emailAuthEnabled: process.env.ENABLE_EMAIL_AUTH === 'true',
    emailNotifEnabled: process.env.ENABLE_EMAIL_NOTIF === 'true',
    onlinePaymentEnabled: isOnlinePaymentEnabled() && isPaymentBrokerConfigured(),
    paymentProvider: getPaymentProviderName(),
    whatsappBotEnabled: isWhatsAppBotEnabled() && isWhatsAppBotConfigured(),
    whatsappBotProvider: getWhatsAppBotProvider(),
  });
}

// ─── GET /admin/integrations/readiness (Admin Diagnostics) ───────────────────
export function getAdminIntegrationReadiness(_req, res) {
  const paymentProvider = getPaymentProviderName();
  const waProvider = getWhatsAppBotProvider();

  // 1. Resend Email - Auth / OTP Domain
  const emailAuthMissing = [];
  if (!process.env.RESEND_API_KEY && !process.env.RESEND_AUTH_API_KEY) emailAuthMissing.push('RESEND_AUTH_API_KEY (or RESEND_API_KEY)');
  if (!process.env.EMAIL_FROM_AUTH && !process.env.EMAIL_FROM) emailAuthMissing.push('EMAIL_FROM_AUTH (or EMAIL_FROM)');

  // 2. Resend Email - Notification Domain
  const emailNotifMissing = [];
  if (!process.env.RESEND_API_KEY && !process.env.RESEND_NOTIF_API_KEY) emailNotifMissing.push('RESEND_NOTIF_API_KEY (or RESEND_API_KEY)');
  if (!process.env.EMAIL_FROM_NOTIF && !process.env.EMAIL_FROM) emailNotifMissing.push('EMAIL_FROM_NOTIF (or EMAIL_FROM)');

  // 3. Online Payment Broker
  const paymentMissing = [];
  if (paymentProvider === 'midtrans') {
    if (!process.env.MIDTRANS_SERVER_KEY) paymentMissing.push('MIDTRANS_SERVER_KEY');
    if (!process.env.MIDTRANS_CLIENT_KEY) paymentMissing.push('MIDTRANS_CLIENT_KEY');
  } else if (paymentProvider === 'xendit') {
    if (!process.env.XENDIT_SECRET_KEY) paymentMissing.push('XENDIT_SECRET_KEY');
    if (!process.env.XENDIT_WEBHOOK_TOKEN) paymentMissing.push('XENDIT_WEBHOOK_TOKEN');
  }

  // 4. WhatsApp Bot Account
  const waMissing = [];
  if (waProvider === 'meta_cloud') {
    if (!process.env.WA_PHONE_NUMBER_ID) waMissing.push('WA_PHONE_NUMBER_ID');
    if (!process.env.WA_ACCESS_TOKEN) waMissing.push('WA_ACCESS_TOKEN');
    if (!process.env.WA_WEBHOOK_VERIFY_TOKEN) waMissing.push('WA_WEBHOOK_VERIFY_TOKEN');
  } else if (waProvider === 'fonnte') {
    if (!process.env.WA_FONNTE_TOKEN) waMissing.push('WA_FONNTE_TOKEN');
  } else if (waProvider === 'generic_webhook') {
    if (!process.env.WA_GATEWAY_URL) waMissing.push('WA_GATEWAY_URL');
  }

  res.json({
    emailAuth: {
      flagEnabled: process.env.ENABLE_EMAIL_AUTH === 'true',
      isConfigured: isEmailAuthConfigured(),
      readyToExecute: emailAuthMissing.length === 0,
      missingVariables: emailAuthMissing,
      fromAddress: process.env.EMAIL_FROM_AUTH || process.env.EMAIL_FROM || null,
    },
    emailNotif: {
      flagEnabled: process.env.ENABLE_EMAIL_NOTIF === 'true',
      isConfigured: isEmailNotifConfigured(),
      readyToExecute: emailNotifMissing.length === 0,
      missingVariables: emailNotifMissing,
      fromAddress: process.env.EMAIL_FROM_NOTIF || process.env.EMAIL_FROM || null,
      adminInbox: process.env.EMAIL_ADMIN_NOTIF || null,
    },
    onlinePayment: {
      flagEnabled: isOnlinePaymentEnabled(),
      provider: paymentProvider,
      isConfigured: isPaymentBrokerConfigured(),
      readyToExecute: paymentMissing.length === 0,
      missingVariables: paymentMissing,
      isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true' || process.env.NODE_ENV === 'production',
      webhookUrl: 'https://kalceria-backend.vercel.app/api/webhooks/payment',
    },
    whatsappBot: {
      flagEnabled: isWhatsAppBotEnabled(),
      provider: waProvider,
      isConfigured: isWhatsAppBotConfigured(),
      readyToExecute: waMissing.length === 0,
      missingVariables: waMissing,
      adminNumber: process.env.WA_ADMIN_NUMBER || null,
      webhookUrl: 'https://kalceria-backend.vercel.app/api/webhooks/whatsapp',
    },
  });
}
