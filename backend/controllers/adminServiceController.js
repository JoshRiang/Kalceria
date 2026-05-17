import prisma from '../lib/prisma.js';
import { createLog } from './auditController.js';



// ─── GET /admin/services ──────────────────────────────────────────────────────
export async function listServiceBookings(req, res, next) {
  try {
    const bookings = await prisma.serviceBooking.findMany({
      include: { 
        requestor: { select: { id: true, name: true, email: true, phone: true, role: true } },
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
    const { status, version, deploymentArea, technicalBrief, totalPrice } = req.body;
    const validStatuses = ['PENDING', 'PROCESSED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status provided.' });
    }
    
    if (version === undefined || version === null) {
      return res.status(400).json({ error: 'Optimistic Concurrency Control: Version is required.' });
    }

    // Build data object — only include financial fields if they were provided (from modal)
    const data = {
      status,
      version: { increment: 1 },
      ...(deploymentArea !== undefined && { deploymentArea }),
      ...(technicalBrief !== undefined && { technicalBrief }),
      ...(totalPrice !== undefined && { totalPrice: parseFloat(totalPrice) }),
    };

    const booking = await prisma.serviceBooking.update({
      where: { 
        id: req.params.id, 
        version: Number(version) 
      },
      data,
    });
    
    // Log with financial summary if present
    const logDetail = totalPrice
      ? `Updated Service Booking ${req.params.id} to ${status} | Total: IDR ${parseFloat(totalPrice).toLocaleString('id-ID')}`
      : `Updated Service Booking ${req.params.id} to ${status}`;
    await createLog(req.user.email, logDetail);

    res.json({ booking });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(409).json({ error: 'Data telah dimodifikasi oleh admin lain. Silakan refresh.' });
    }
    next(err); 
  }
}

// ─── PATCH /admin/services/:id/payment ───────────────────────────────────────
export async function confirmServicePayment(req, res, next) {
  try {
    const { status, version } = req.body; // 'CONFIRMED' | 'REJECTED'
    
    if (version === undefined || version === null) {
      return res.status(400).json({ error: 'Optimistic Concurrency Control: Version is required.' });
    }

    const booking = await prisma.serviceBooking.update({
      where: { 
        id: req.params.id,
        version: Number(version)
      },
      data: { 
        paymentStatus: status, 
        ...(status === 'CONFIRMED' && { status: 'PROCESSED' }),
        version: { increment: 1 }
      },
    });

    await createLog(req.user.email, `Updated Service Payment ${req.params.id} to ${status}`);

    res.json({ booking });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(409).json({ error: 'Data telah dimodifikasi oleh admin lain. Silakan refresh.' });
    }
    next(err); 
  }
}

// ─── DELETE /admin/services/:id ───────────────────────────────────────────────
export async function deleteServiceBooking(req, res, next) {
  try {
    const { version } = req.body;
    if (version === undefined || version === null) {
      return res.status(400).json({ error: 'Optimistic Concurrency Control: Version is required for delete.' });
    }
    
    await prisma.serviceBooking.delete({ 
      where: { 
        id: req.params.id, 
        version: Number(version) 
      } 
    });

    // Log action
    await createLog(req.user.email, `Deleted Service Booking ${req.params.id}`);

    res.json({ message: 'Deleted.' });
  } catch (err) { 
    if (err.code === 'P2025') {
      return res.status(409).json({ error: 'Data telah dimodifikasi oleh admin lain. Silakan refresh.' });
    }
    next(err); 
  }
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
    const { status, version } = req.body;

    if (version === undefined || version === null) {
      return res.status(400).json({ error: 'Optimistic Concurrency Control: Version is required.' });
    }

    const booking = await prisma.booking.update({
      where: { id: req.params.id, version: Number(version) },
      data: { paymentStatus: status, ...(status === 'CONFIRMED' && { status: 'CONFIRMED' }), version: { increment: 1 } },
    });

    await createLog(req.user.email, `Updated Booking Payment ${req.params.id} to ${status}`);

    res.json({ booking });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(409).json({ error: 'Data telah dimodifikasi oleh admin lain. Silakan refresh.' });
    }
    next(err);
  }
}

// ─── DELETE /admin/bookings/:id ───────────────────────────────────────────────
export async function deleteBooking(req, res, next) {
  try {
    const { version } = req.body;
    if (version === undefined || version === null) {
      return res.status(400).json({ error: 'Optimistic Concurrency Control: Version is required for delete.' });
    }

    await prisma.booking.delete({ 
      where: { 
        id: req.params.id,
        version: Number(version)
      } 
    });

    await createLog(req.user.email, `Deleted Booking ${req.params.id}`);

    res.json({ message: 'Deleted.' });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(409).json({ error: 'Data telah dimodifikasi oleh admin lain. Silakan refresh.' });
    }
    next(err); 
  }
}

// ─── PATCH /admin/bookings/:id/pdf ────────────────────────────────────────────
export async function markBookingPdf(req, res, next) {
  try {
    await prisma.booking.update({ where: { id: req.params.id }, data: { pdfExported: true } });
    res.json({ message: 'PDF marked.' });
  } catch (err) { next(err); }
}
