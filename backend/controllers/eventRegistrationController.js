import prisma from '../lib/prisma.js';


const WA_ADMIN = process.env.WA_ADMIN_NUMBER || '6281234567890';

// ─── POST /events/:eventId/register ──────────────────────────────────────────
export async function registerEvent(req, res, next) {
  try {
    const userId = req.user.userId;
    const { eventId } = req.params;
    const { selectedSession } = req.body;

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    if (event.status !== 'OPEN') return res.status(400).json({ error: 'Registration is closed.' });

    const now = new Date();
    if (now < event.regStartTime || now > event.regEndTime) {
      return res.status(400).json({ error: 'Registration is not in active window.' });
    }

    const count = await prisma.eventRegistration.count({ where: { eventId } });
    if (count >= event.quota) return res.status(400).json({ error: 'Event is full.' });

    const reg = await prisma.eventRegistration.create({
      data: { userId, eventId, selectedSession },
      include: { user: { select: { name: true, email: true, phone: true } }, event: true },
    });

    const msg = [
      `📋 PENDAFTARAN EVENT BARU`,
      ``,
      `Event: ${event.title}`,
      `Sesi: ${selectedSession}`,
      `Peserta: ${reg.user.name} (${reg.user.email})`,
      `Biaya: Rp ${event.price.toLocaleString('id-ID')}`,
      ``,
      `Segera konfirmasi pembayaran!`,
    ].join('\n');

    const whatsappUrl = `https://wa.me/${WA_ADMIN}?text=${encodeURIComponent(msg)}`;
    res.status(201).json({ registration: reg, whatsappUrl });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Already registered for this event.' });
    next(err);
  }
}

// ─── GET /events (public listing) ────────────────────────────────────────────
export async function listPublicEvents(req, res, next) {
  try {
    const events = await prisma.event.findMany({
      where: { status: { not: 'DRAFT' } },
      orderBy: { regStartTime: 'asc' },
      select: {
        id: true, title: true, description: true, displayPhotoUrl: true,
        location: true, regStartTime: true, regEndTime: true,
        sessionOptions: true, price: true, quota: true, status: true,
        _count: { select: { registrations: true } },
      },
    });
    res.json({ events });
  } catch (err) {
    next(err);
  }
}

// ─── GET /events/:eventId (public detail) ────────────────────────────────────
export async function getPublicEvent(req, res, next) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.eventId },
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
    const { status, version } = req.body; // 'CONFIRMED' | 'REJECTED'
    if (version === undefined || version === null) {
      return res.status(400).json({ error: 'Optimistic Concurrency Control: Version is required.' });
    }
    const reg = await prisma.eventRegistration.update({
      where: { id: req.params.id, version: Number(version) },
      data: { paymentStatus: status, version: { increment: 1 } },
      include: { user: { select: { name: true, email: true } }, event: { select: { title: true } } },
    });
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
    const { version } = req.body;
    if (version === undefined || version === null) {
      return res.status(400).json({ error: 'Optimistic Concurrency Control: Version is required for delete.' });
    }
    await prisma.eventRegistration.delete({ where: { id: req.params.id, version: Number(version) } });
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
