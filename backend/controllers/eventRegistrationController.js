import argon2 from 'argon2';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { createLog } from './auditController.js';
import { decodePageCursor, encodePageCursor, parsePageLimit } from '../utils/cursorPagination.js';
import { safeNotify, sendEventRegistrationEmail, sendEventPaymentConfirmedEmail } from '../lib/mailer.js';
import { createEventPaymentSession, isOnlinePaymentEnabled } from '../lib/paymentBroker.js';
import { notifyEventRegistration, notifyEventPaymentConfirmed } from '../lib/whatsappBroker.js';

const WA_ADMIN = process.env.WA_ADMIN_NUMBER || '6281234567890';

let guestPlaceholderHash;
const getGuestPlaceholderHash = () => (
  guestPlaceholderHash ??= argon2.hash(`guest-unusable-${crypto.randomBytes(24).toString('hex')}`)
);

async function resolveEventRegistrant(req) {
  const { identifier, name, email, contact } = req.body || {};

  // 1) "As Guest" payload (name + email + contact)
  if (name !== undefined || contact !== undefined || (email !== undefined && identifier === undefined)) {
    const cleanName = typeof name === 'string' ? name.trim() : '';
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const cleanContact = typeof contact === 'string' ? contact.trim() : '';

    if (
      !cleanName || cleanName.length > 80
      || !cleanEmail || cleanEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
      || cleanContact.length < 5 || cleanContact.length > 32
    ) {
      return { error: 'GUEST_INVALID' };
    }

    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
      select: { id: true },
    });
    if (existing) {
      return { userId: existing.id, guestContact: cleanContact, guestName: cleanName };
    }

    const created = await prisma.user.create({
      data: {
        name: cleanName,
        dob: new Date('2000-01-01'),
        email: cleanEmail,
        gender: 'OTHER',
        phone: cleanContact,
        passwordHash: await getGuestPlaceholderHash(),
        domicileLat: 0,
        domicileLng: 0,
        isEmailVerified: false,
      },
      select: { id: true },
    });
    return { userId: created.id, guestContact: cleanContact, guestName: cleanName };
  }

  // 2) "By Account" payload (identifier = email / username / nickname)
  if (typeof identifier === 'string' && identifier.trim()) {
    const raw = identifier.trim();
    if (raw.length > 254) return { error: 'ACCOUNT_NOT_FOUND' };
    const found = raw.includes('@')
      ? await prisma.user.findUnique({ where: { email: raw.toLowerCase() }, select: { id: true } })
      : await prisma.user.findFirst({
        where: {
          OR: [
            { name: { equals: raw, mode: 'insensitive' } },
            { nickname: { equals: raw, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });
    if (!found) return { error: 'ACCOUNT_NOT_FOUND' };
    return { userId: found.id };
  }

  // 3) Authenticated session fallback
  if (req.user?.userId) {
    return { userId: req.user.userId };
  }

  return { error: 'MISSING_IDENTITY' };
}

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

      const count = await tx.eventRegistration.count({ where: { eventId } });
      if (count >= event.quota) return { error: 'FULL' };

      const registration = await tx.eventRegistration.create({
        data: { userId, eventId, selectedSession },
        include: { user: { select: { name: true, email: true, phone: true } }, event: true },
      });
      return { event, reg: registration };
    });

    if (result.error === 'NOT_FOUND') return res.status(404).json({ error: 'Event not found.' });
    if (result.error === 'CLOSED') return res.status(400).json({ error: 'Registration is closed.' });
    if (result.error === 'WINDOW') return res.status(400).json({ error: 'Registration is not in active window.' });
    if (result.error === 'SESSION') return res.status(400).json({ error: 'Please select a valid event session.' });
    if (result.error === 'FULL') return res.status(400).json({ error: 'Event is full.' });
    const { event, reg } = result;

    const participantName = guestName || reg.user.name;
    const participantContact = guestContact || reg.user.phone || '';

    const msg = [
      `📋 PENDAFTARAN EVENT BARU`,
      ``,
      `Event: ${event.title}`,
      `Sesi: ${selectedSession}`,
      `Peserta: ${participantName} (${reg.user.email})`,
      ...(participantContact ? [`Kontak: ${participantContact}`] : []),
      `Biaya: Rp ${event.price.toLocaleString('id-ID')}`,
      ``,
      `Segera konfirmasi pembayaran!`,
    ].join('\n');

    const whatsappUrl = `https://wa.me/${WA_ADMIN}?text=${encodeURIComponent(msg)}`;

    // Online Payment checkout session (if broker is enabled)
    let paymentCheckout = null;
    if (isOnlinePaymentEnabled()) {
      paymentCheckout = await createEventPaymentSession({
        event,
        registration: reg,
        user: { id: userId, name: participantName, email: reg.user.email, phone: participantContact },
      }).catch((err) => {
        console.warn('[EventRegistration] Payment session generation failed:', err.message);
        return null;
      });
    }

    // Signed payment token for guest checkout access
    const paymentToken = process.env.JWT_SECRET
      ? jwt.sign(
        { registrationId: reg.id, userId },
        process.env.JWT_SECRET,
        { algorithm: 'HS256', audience: 'kalceria-event-payment', issuer: 'kalceria-api', expiresIn: '2h' },
      )
      : undefined;

    // Dispatches (fire-and-forget, safe & isolated)
    safeNotify(() => notifyEventRegistration({
      registration: reg,
      event,
      user: { name: participantName, phone: participantContact, email: reg.user.email },
      paymentCheckoutUrl: paymentCheckout?.checkoutUrl,
    }), 'whatsapp-event-reg');

    safeNotify(() => sendEventRegistrationEmail({
      to: reg.user.email,
      event,
      registration: reg,
      paymentCheckoutUrl: paymentCheckout?.checkoutUrl,
    }), 'email-event-reg');

    res.status(201).json({
      registration: reg,
      whatsappUrl,
      paymentCheckout,
      paymentToken,
    });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Already registered for this event.' });
    next(err);
  }
}

// ─── GET /events (public listing) ────────────────────────────────────────────
export async function listPublicEvents(req, res, next) {
  try {
    const limit = parsePageLimit(req.query.limit, 50, 100);
    const cursor = decodePageCursor(req.query.cursor);
    if (limit === null || cursor === false) {
      return res.status(400).json({ error: 'Pagination limit or cursor is invalid.' });
    }

    const events = await prisma.event.findMany({
      where: {
        status: { not: 'DRAFT' },
        ...(cursor && {
          AND: [{
            OR: [
              { regStartTime: { gt: cursor.at } },
              { regStartTime: cursor.at, id: { gt: cursor.id } },
            ],
          }],
        }),
      },
      orderBy: [{ regStartTime: 'asc' }, { id: 'asc' }],
      take: limit + 1,
      select: {
        id: true, title: true, description: true, displayPhotoUrl: true,
        location: true, regStartTime: true, regEndTime: true,
        sessionOptions: true, price: true, quota: true, status: true,
        _count: { select: { registrations: true } },
      },
    });
    const hasMore = events.length > limit;
    const pageEvents = events.slice(0, limit);
    const lastEvent = pageEvents.at(-1);
    const nextCursor = hasMore && lastEvent
      ? encodePageCursor({ id: lastEvent.id, at: lastEvent.regStartTime })
      : null;

    res.json({ events: pageEvents, nextCursor });
  } catch (err) {
    next(err);
  }
}

// ─── GET /events/:eventId (public detail) ────────────────────────────────────
export async function getPublicEvent(req, res, next) {
  try {
    const event = await prisma.event.findFirst({
      where: { id: req.params.eventId, status: { not: 'DRAFT' } },
      include: { _count: { select: { registrations: true } } },
    });
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    res.json({ event });
  } catch (err) {
    next(err);
  }
}

// ─── ADMIN: GET /admin/registrations ─────────────────────────────────────────
export async function listRegistrations(req, res, next) {
  try {
    const { eventId } = req.query;
    const registrations = await prisma.eventRegistration.findMany({
      where: eventId ? { eventId } : {},
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        event: { select: { id: true, title: true, price: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ registrations });
  } catch (err) {
    next(err);
  }
}

// ─── ADMIN: PATCH /admin/registrations/:id/payment ───────────────────────────
export async function confirmRegistrationPayment(req, res, next) {
  try {
    const { status, version } = req.body || {}; // 'CONFIRMED' | 'REJECTED'
    if (!['CONFIRMED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Payment status must be CONFIRMED or REJECTED.' });
    }
    if (version === undefined || version === null || !Number.isInteger(Number(version)) || Number(version) < 0) {
      return res.status(400).json({ error: 'Optimistic Concurrency Control: Version is required.' });
    }
    const reg = await prisma.eventRegistration.update({
      where: { id: req.params.id, version: Number(version) },
      data: { paymentStatus: status, version: { increment: 1 } },
      include: { user: { select: { id: true, name: true, email: true, phone: true } }, event: true },
    });

    if (status === 'CONFIRMED') {
      safeNotify(() => notifyEventPaymentConfirmed({
        registration: reg,
        event: reg.event,
        user: reg.user,
      }), 'whatsapp-admin-confirm');

      safeNotify(() => sendEventPaymentConfirmedEmail({
        to: reg.user.email,
        event: reg.event,
        registration: reg,
      }), 'email-admin-confirm');
    }

    res.json({ registration: reg });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(409).json({ error: 'Data telah dimodifikasi oleh admin lain. Silakan refresh.' });
    }
    next(err);
  }
}

// ─── ADMIN: DELETE /admin/registrations/:id ───────────────────────────────────
export async function deleteRegistration(req, res, next) {
  try {
    const { version } = req.body || {};
    if (version === undefined || version === null || !Number.isInteger(Number(version)) || Number(version) < 0) {
      return res.status(400).json({ error: 'Optimistic Concurrency Control: Version is required for delete.' });
    }
    await prisma.$transaction(async (tx) => {
      const registration = await tx.eventRegistration.delete({
        where: { id: req.params.id, version: Number(version) },
        select: { id: true, eventId: true },
      });
      await createLog(
        req.user.email,
        'EVENT_REGISTRATION_DELETED',
        `Registration ${registration.id} for event ${registration.eventId} deleted.`,
        tx,
      );
    });
    res.json({ message: 'Deleted.' });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(409).json({ error: 'Data telah dimodifikasi oleh admin lain. Silakan refresh.' });
    }
    next(err);
  }
}

// ─── ADMIN: PATCH /admin/registrations/:id/pdf ───────────────────────────────
export async function markPdfExported(req, res, next) {
  try {
    await prisma.eventRegistration.update({
      where: { id: req.params.id },
      data: { pdfExported: true },
    });
    res.json({ message: 'PDF marked exported.' });
  } catch (err) {
    next(err);
  }
}
