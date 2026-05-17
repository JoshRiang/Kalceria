import prisma from '../lib/prisma.js';



// Helper function to create an audit log entry.
// IMPORTANT: This function intentionally THROWS on failure.
// This ensures atomicity: if the audit log cannot be written,
// the parent operation (delete/update) will also fail and roll back.
// "No receipt = no crime" — we do NOT allow silent audit failures.
export async function createLog(email, action, details = null) {
  await prisma.auditLog.create({
    data: {
      adminEmail: email,
      action,
      details
    }
  });
  // No try/catch — errors propagate up to the calling controller's catch block.
}

// GET /api/admin/logs
export async function listLogs(req, res, next) {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50 // Limit to last 50 for the chatbox
    });
    res.json({ logs });
  } catch (err) {
    next(err);
  }
}
