import jwt from 'jsonwebtoken';
import prisma from '../../lib/prisma.js';
import { safeNotify, sendEventRegistrationEmail } from '../../lib/mailer.js';
import { createEventPaymentSession, isOnlinePaymentEnabled } from '../../lib/paymentBroker.js';
import { notifyEventRegistration } from '../../lib/whatsappBroker.js';
import { setEventRegistrationCooldown } from '../../middleware/ingressDefense.js';
import { buildEventRegistrationWaMessage } from '../comms/waMessageBuilder.js';
import { WA_ADMIN, THREE_MINUTES_MS } from './eventRegistrationConstants.js';
import { resolveEventRegistrant } from './eventRegistrantResolver.js';

// ─── POST /events/:eventId/register ──────────────────────────────────────────
export async function registerEvent(req, res, next) {
  try {
    const { eventId } = req.params;
    const { selectedSession } = req.body || {};

    const registrant = await resolveEventRegistrant(req);
    if (registrant.error === 'MISSING_IDENTITY') {
      return res.status(401).json({ error: 'Please provide your account email/username or guest details.' });
    }
    if (registrant.error === 'GUEST_INVALID') {
      return res.status(400).json({ error: 'Please provide valid guest name, email, and WhatsApp contact.' });
    }
    if (registrant.error === 'ACCOUNT_NOT_FOUND') {
      return res.status(404).json({ error: 'Account not found. Check your email/username or register As Guest.' });
    }

    if (typeof selectedSession !== 'string' || !selectedSession.trim() || selectedSession.length > 120) {
      return res.status(400).json({ error: 'Please select a valid event session.' });
    }

    const { userId, guestContact, guestName } = registrant;

    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "events" WHERE "id" = ${eventId} FOR UPDATE`;
      const event = await tx.event.findUnique({ where: { id: eventId } });
      if (!event) return { error: 'NOT_FOUND' };
      if (event.status !== 'OPEN') return { error: 'CLOSED' };

      const now = new Date();
      if (now < event.regStartTime || now > event.regEndTime) return { error: 'WINDOW' };
      if (!Array.isArray(event.sessionOptions) || !event.sessionOptions.includes(selectedSession)) {
        return { error: 'SESSION' };
      }

      // Purge expired unconfirmed registrations for this event before checking quota
      const cutoff = new Date(Date.now() - THREE_MINUTES_MS);
      await tx.eventRegistration.deleteMany({
        where: {
          eventId,
          paymentStatus: 'PENDING',
          createdAt: { lt: cutoff },
        },
      });

      // Active Registration Deduplication (Reuse pending registration to prevent Resend quota burn)
      const existingReg = await tx.eventRegistration.findUnique({
        where: { userId_eventId: { userId, eventId } },
        include: { user: { select: { name: true, email: true, phone: true } }, event: true },
      });

      if (existingReg) {
        if (existingReg.paymentStatus === 'CONFIRMED') {
          return { error: 'ALREADY_CONFIRMED' };
        }
        let reg = existingReg;
        if (tx.eventRegistration.update && selectedSession && existingReg.selectedSession !== selectedSession) {
          try {
            reg = await tx.eventRegistration.update({
              where: { id: existingReg.id },
              data: { selectedSession },
              include: { user: { select: { name: true, email: true, phone: true } }, event: true },
            });
          } catch {}
        }
        return { event, reg, isReused: true };
      }

      const count = await tx.eventRegistration.count({ where: { eventId } });
      if (count >= event.quota) return { error: 'FULL' };

      const registration = await tx.eventRegistration.create({
        data: { userId, eventId, selectedSession },
        include: { user: { select: { name: true, email: true, phone: true } }, event: true },
      });
      return { event, reg: registration, isReused: false };
    });

    if (result.error === 'NOT_FOUND') return res.status(404).json({ error: 'Event not found.' });
    if (result.error === 'CLOSED') return res.status(400).json({ error: 'Registration is closed.' });
    if (result.error === 'WINDOW') return res.status(400).json({ error: 'Registration is not in active window.' });
    if (result.error === 'SESSION') return res.status(400).json({ error: 'Please select a valid event session.' });
    if (result.error === 'FULL') return res.status(400).json({ error: 'Event is full.' });
    if (result.error === 'ALREADY_CONFIRMED') {
      return res.status(409).json({ error: 'Pendaftaran untuk event ini sudah terkonfirmasi dan terkunci.', isConfirmed: true });
    }
    const { event, reg, isReused } = result;

    // Set 24-hour registration cooldown per event & device/account/email
    await setEventRegistrationCooldown(req, eventId, userId, reg.user.email);

    const participantName = guestName || reg.user.name;
    const participantContact = guestContact || reg.user.phone || '';
    const participantEmail = (typeof req.body?.email === 'string' && req.body.email.trim())
      ? req.body.email.trim().toLowerCase()
      : reg.user.email;

    // Online Payment checkout session (if broker is enabled)
    let paymentCheckout = null;
    if (isOnlinePaymentEnabled()) {
      paymentCheckout = await createEventPaymentSession({
        event,
        registration: reg,
        user: { id: userId, name: participantName, email: participantEmail, phone: participantContact },
      }).catch((err) => {
        console.warn('[EventRegistration] Payment session generation failed:', err.message);
        return null;
      });
    }

    const waMsg = buildEventRegistrationWaMessage({
      event,
      registration: reg,
      user: { id: userId, name: participantName, email: participantEmail, phone: participantContact },
      paymentCheckoutUrl: paymentCheckout?.checkoutUrl,
    });
    const whatsappUrl = `https://wa.me/${WA_ADMIN}?text=${encodeURIComponent(waMsg)}`;

    // Signed payment token for guest checkout access
    const paymentToken = process.env.JWT_SECRET
      ? jwt.sign(
        { registrationId: reg.id, userId },
        process.env.JWT_SECRET,
        { algorithm: 'HS256', audience: 'kalceria-event-payment', issuer: 'kalceria-api', expiresIn: '2h' },
      )
      : undefined;

    // Mint 3-minute cancelToken / manageToken for 2-step verification lifecycle
    const cancelSecret = process.env.JWT_SECRET || 'kalceria-service-cancel-fallback-secret';
    const cancelToken = jwt.sign(
      { registrationId: reg.id, userId },
      cancelSecret,
      { expiresIn: 180, issuer: 'kalceria-api' }
    );

    // Dispatches (Awaited with Promise.allSettled for guaranteed serverless delivery before Lambda freeze)
    await Promise.allSettled([
      safeNotify(() => notifyEventRegistration({
        registration: reg,
        event,
        user: { name: participantName, phone: participantContact, email: reg.user.email },
        paymentCheckoutUrl: paymentCheckout?.checkoutUrl,
      }), 'whatsapp-event-reg'),
      safeNotify(() => sendEventRegistrationEmail({
        to: participantEmail || reg.user?.email,
        event,
        registration: {
          ...reg,
          user: {
            ...reg.user,
            name: participantName || reg.user?.name,
            phone: participantContact || reg.user?.phone,
            email: participantEmail || reg.user?.email,
          },
        },
        cancelToken,
        paymentCheckoutUrl: paymentCheckout?.checkoutUrl,
      }), 'email-event-reg'),
    ]);

    res.status(201).json({
      registration: reg,
      whatsappUrl,
      paymentCheckout,
      paymentToken,
      cancelToken,
    });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Already registered for this event.' });
    next(err);
  }
}

