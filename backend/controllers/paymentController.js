import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { redis } from '../lib/redis.js';
import { createLog } from './auditController.js';
import {
  createEventPaymentSession,
  verifyAndNormalizePaymentWebhook,
  getClientPaymentConfig,
} from '../lib/paymentBroker.js';
import { sendEventPaymentConfirmedEmail, safeNotify } from '../lib/mailer.js';
import { notifyEventPaymentConfirmed } from '../lib/whatsappBroker.js';

// ─── Public Capability Status ────────────────────────────────────────────────
export async function getPaymentCapabilities(_req, res) {
  res.json(getClientPaymentConfig());
}

// ─── Authorize Registration Access (Session or PaymentToken) ──────────────────
async function authorizeRegistrationAccess(req, registrationId) {
  const currentUserId = req.user?.userId || null;
  const paymentToken = req.headers['x-payment-token'] || req.query.token;

  let authorizedGuestRegId = null;
  if (paymentToken && process.env.JWT_SECRET) {
    try {
      const decoded = jwt.verify(paymentToken, process.env.JWT_SECRET, {
        algorithms: ['HS256'],
        audience: 'kalceria-event-payment',
        issuer: 'kalceria-api',
      });
      authorizedGuestRegId = decoded?.registrationId || null;
    } catch {
      // Invalid payment token; fall back to session
    }
  }

  const registration = await prisma.eventRegistration.findUnique({
    where: { id: registrationId },
    include: {
      event: true,
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
  });

  if (!registration) return { error: 'NOT_FOUND' };

  const isOwner = Boolean(currentUserId && registration.userId === currentUserId);
  const isAuthorizedGuest = authorizedGuestRegId === registration.id;

  if (!isOwner && !isAuthorizedGuest) {
    return { error: 'UNAUTHORIZED' };
  }

  return { registration };
}

// ─── POST /payments/events/:registrationId/checkout ──────────────────────────
export async function createCheckoutSession(req, res, next) {
  try {
    const { registrationId } = req.params;
    const { returnUrl } = req.body || {};

    const authResult = await authorizeRegistrationAccess(req, registrationId);
    if (authResult.error === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Registration not found.' });
    }
    if (authResult.error === 'UNAUTHORIZED') {
      return res.status(403).json({ error: 'Unauthorized to initiate payment for this registration.' });
    }

    const { registration } = authResult;
    const { event, user } = registration;

    if (registration.paymentStatus === 'CONFIRMED') {
      return res.json({
        alreadyPaid: true,
        paymentStatus: 'CONFIRMED',
        message: 'This registration has already been paid and confirmed.',
      });
    }

    const session = await createEventPaymentSession({
      event,
      registration,
      user,
      frontendReturnUrl: returnUrl,
    });

    res.json(session);
  } catch (err) {
    next(err);
  }
}

// ─── GET /payments/events/:registrationId/status ─────────────────────────────
export async function getRegistrationPaymentStatus(req, res, next) {
  try {
    const { registrationId } = req.params;

    const authResult = await authorizeRegistrationAccess(req, registrationId);
    if (authResult.error === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Registration not found.' });
    }
    if (authResult.error === 'UNAUTHORIZED') {
      return res.status(403).json({ error: 'Unauthorized to view payment status.' });
    }

    const { registration } = authResult;

    res.json({
      registrationId: registration.id,
      eventId: registration.eventId,
      eventTitle: registration.event.title,
      price: registration.event.price,
      selectedSession: registration.selectedSession,
      paymentStatus: registration.paymentStatus,
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /webhooks/payment (Server-to-Server) ────────────────────────────────
export async function handlePaymentWebhook(req, res, next) {
  try {
    const verification = await verifyAndNormalizePaymentWebhook({
      headers: req.headers,
      body: req.body,
    });

    if (!verification.valid) {
      console.warn('[PaymentWebhook] Verification failed:', verification.error);
      return res.status(400).json({ error: 'Invalid webhook signature.' });
    }

    const { orderId, transactionId, status, provider, amount } = verification;

    // Idempotency: avoid processing the exact same provider transaction twice
    const idempotencyKey = `payment:webhook:processed:${provider}:${transactionId}`;
    const acquired = await redis.set(idempotencyKey, '1', 'EX', 604800, 'NX');
    if (!acquired) {
      return res.status(200).json({ received: true, duplicate: true });
    }

    // Retrieve order metadata from Redis
    const orderDataRaw = await redis.get(`payment:order:${orderId}`);
    let registrationId = null;

    if (orderDataRaw) {
      try {
        const orderData = JSON.parse(orderDataRaw);
        registrationId = orderData.registrationId;
      } catch {}
    }

    // Fallback: search for registration if order key expired
    if (!registrationId) {
      const match = orderId.match(/^KALC-EVT-([A-Za-z0-9]+)-/);
      if (match) {
        const regPrefix = match[1];
        const reg = await prisma.eventRegistration.findFirst({
          where: { id: { startsWith: regPrefix } },
          select: { id: true },
        });
        registrationId = reg?.id || null;
      }
    }

    if (!registrationId) {
      console.warn(`[PaymentWebhook] No registration found for order ${orderId}`);
      return res.status(200).json({ received: true, matched: false });
    }

    if (status === 'CONFIRMED') {
      const updated = await prisma.eventRegistration.update({
        where: { id: registrationId },
        data: {
          paymentStatus: 'CONFIRMED',
          version: { increment: 1 },
        },
        include: {
          event: true,
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
      });

      await createLog('SYSTEM_WEBHOOK', 'ONLINE_PAYMENT_CONFIRMED', `Payment of Rp ${amount} confirmed for registration ${registrationId} via ${provider}.`);

      // Fire and forget notifications
      safeNotify(() => sendEventPaymentConfirmedEmail({
        to: updated.user.email,
        event: updated.event,
        registration: updated,
      }), 'email-ticket-confirm');

      safeNotify(() => notifyEventPaymentConfirmed({
        registration: updated,
        event: updated.event,
        user: updated.user,
      }), 'whatsapp-ticket-confirm');
    } else if (status === 'REJECTED') {
      await prisma.eventRegistration.update({
        where: { id: registrationId },
        data: { paymentStatus: 'REJECTED', version: { increment: 1 } },
      }).catch(() => {});
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
}
