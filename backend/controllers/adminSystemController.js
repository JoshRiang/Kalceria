import prisma from '../lib/prisma.js';
import { createLog } from './auditController.js';

// ─── GET /admin/system/logs ───────────────────────────────────────────────────
// Returns ALL audit logs (no limit) for CSV export.
// The existing GET /admin/logs is capped at 50 for the UI chatbox.
export async function exportAllLogs(req, res, next) {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'asc' }, // chronological for CSV readability
    });
    res.json({ logs });
  } catch (err) {
    next(err);
  }
}

// ─── POST /admin/system/reset ─────────────────────────────────────────────────
// DESTRUCTIVE: Wipes all transactional/volatile data.
// PRESERVES: users, events, merch catalog (base data).
// Protected by requireAdmin + requireJIT middleware in routes.
export async function resetSystem(req, res, next) {
  try {
    const adminEmail = req.user.email;

    // Write the audit log BEFORE destruction so there is a record
    // (this will be wiped with AuditLog in the transaction — intentional,
    // giving a clean slate while the external backup/export should have been done first)
    await prisma.$transaction([
      // ── Transactional data (volatile) ─────────────────────────────────────
      prisma.merchSale.deleteMany(),           // Phase 3 sales log
      prisma.serviceBookingSlot.deleteMany(),  // Booking time slots
      prisma.serviceBooking.deleteMany(),      // EO/Shoot service bookings
      prisma.booking.deleteMany(),             // Timekeeper bookings
      prisma.eventRegistration.deleteMany(),   // Event registrations
      prisma.comment.deleteMany(),             // Community feedback
      prisma.miniEvent.deleteMany(),           // Ephemeral mini events
      prisma.userBroadcast.deleteMany(),       // User broadcasts
      prisma.auditLog.deleteMany(),            // Audit trail (clean slate)

      // ── Merch sold counters reset (preserve catalog, zero revenue) ────────
      prisma.merch.updateMany({
        data: { soldCount: 0, totalRevenue: 0, isSoldOut: false },
      }),
    ]);

    // Log the reset action AFTER transaction (new clean log)
    await createLog(
      adminEmail,
      'SYSTEM_RESET',
      `Full system reset executed by ${adminEmail}. Transactional data wiped. User accounts and base catalog preserved.`
    );

    res.json({
      ok: true,
      message: 'System reset complete. All transactional data has been wiped. User accounts and catalog are preserved.',
      resetBy: adminEmail,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}
