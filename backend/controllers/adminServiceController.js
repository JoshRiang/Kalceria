import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── GET /admin/services ──────────────────────────────────────────────────────
export async function listServiceBookings(req, res, next) {
  try {
    const bookings = await prisma.serviceBooking.findMany({
      include: { 
        requestor: { select: { id: true, name: true, email: true, phone: true } },
        slots: true
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ bookings });
  } catch (err) { next(err); }
}

// ─── PATCH /admin/services/:id/status ───────────────────────────────────────
export async function updateServiceStatus(req, res, next) {
  try {
    const { status } = req.body; // 'PENDING' | 'PROCESSED' | 'CANCELLED'
    const booking = await prisma.serviceBooking.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json({ booking });
  } catch (err) { next(err); }
}

// ─── PATCH /admin/services/:id/payment ───────────────────────────────────────
export async function confirmServicePayment(req, res, next) {
  try {
    const { status } = req.body; // 'CONFIRMED' | 'REJECTED'
    const booking = await prisma.serviceBooking.update({
      where: { id: req.params.id },
      data: { paymentStatus: status, ...(status === 'CONFIRMED' && { status: 'PROCESSED' }) },
    });
    res.json({ booking });
  } catch (err) { next(err); }
}

// ─── DELETE /admin/services/:id ───────────────────────────────────────────────
export async function deleteServiceBooking(req, res, next) {
  try {
    await prisma.serviceBooking.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted.' });
  } catch (err) { next(err); }
}

// ─── PATCH /admin/services/:id/pdf ────────────────────────────────────────────
export async function markServicePdf(req, res, next) {
  try {
    await prisma.serviceBooking.update({ where: { id: req.params.id }, data: { pdfExported: true } });
    res.json({ message: 'PDF marked.' });
  } catch (err) { next(err); }
}

// ─── GET /admin/bookings (NeedUs timekeeper) ──────────────────────────────────
export async function listBookings(req, res, next) {
  try {
    const bookings = await prisma.booking.findMany({
      include: { user: { select: { id: true, name: true, email: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ bookings });
  } catch (err) { next(err); }
}

// ─── PATCH /admin/bookings/:id/payment ───────────────────────────────────────
export async function confirmBookingPayment(req, res, next) {
  try {
    const { status } = req.body;
    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: { paymentStatus: status, ...(status === 'CONFIRMED' && { status: 'CONFIRMED' }) },
    });
    res.json({ booking });
  } catch (err) { next(err); }
}

// ─── DELETE /admin/bookings/:id ───────────────────────────────────────────────
export async function deleteBooking(req, res, next) {
  try {
    await prisma.booking.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted.' });
  } catch (err) { next(err); }
}

// ─── PATCH /admin/bookings/:id/pdf ────────────────────────────────────────────
export async function markBookingPdf(req, res, next) {
  try {
    await prisma.booking.update({ where: { id: req.params.id }, data: { pdfExported: true } });
    res.json({ message: 'PDF marked.' });
  } catch (err) { next(err); }
}
