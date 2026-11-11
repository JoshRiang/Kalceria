import { Resend } from 'resend';

// ─── Clients & Senders (Dual Channel: Auth vs Notifications) ─────────────────
const authApiKey = process.env.RESEND_AUTH_API_KEY || process.env.RESEND_API_KEY;
const notifApiKey = process.env.RESEND_NOTIF_API_KEY || process.env.RESEND_API_KEY;

export const authResend = authApiKey ? new Resend(authApiKey) : null;
export const notifResend = notifApiKey ? new Resend(notifApiKey) : null;

export const DEFAULT_AUTH_FROM = process.env.EMAIL_FROM_AUTH || process.env.EMAIL_FROM || 'Kalceria Security <onboarding@resend.dev>';
export const DEFAULT_NOTIF_FROM = process.env.EMAIL_FROM_NOTIF || process.env.EMAIL_FROM || 'Kalceria <onboarding@resend.dev>';
export const ADMIN_NOTIF_EMAIL = process.env.EMAIL_ADMIN_NOTIF || null;

export function isEmailAuthConfigured() {
  return Boolean(authResend && (process.env.EMAIL_FROM_AUTH || process.env.EMAIL_FROM || DEFAULT_AUTH_FROM));
}

export function isEmailNotifConfigured() {
  return Boolean(notifResend && (process.env.EMAIL_FROM_NOTIF || process.env.EMAIL_FROM || DEFAULT_NOTIF_FROM));
}

// ─── General Send Email ──────────────────────────────────────────────────────
export async function sendEmail({ to, subject, html, text, from, channel = 'notif' }) {
  const isAuth = channel === 'auth';
  const client = isAuth ? authResend : notifResend;
  const defaultFrom = isAuth ? DEFAULT_AUTH_FROM : DEFAULT_NOTIF_FROM;

  if (!client) throw new Error('Email service is not configured.');
  const effectiveFrom = from || defaultFrom;
  if (!effectiveFrom) {
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

  const allowedSenders = [process.env.EMAIL_FROM, process.env.EMAIL_FROM_AUTH, process.env.EMAIL_FROM_NOTIF, DEFAULT_AUTH_FROM, DEFAULT_NOTIF_FROM].filter(Boolean);
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

