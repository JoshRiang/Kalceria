import prisma from '../lib/prisma.js';



// Helper function to create an audit log entry.
// IMPORTANT: This function intentionally THROWS on failure.
// Pass the active Prisma transaction client when the log must be atomic with
// the operation it records. Failures are allowed to propagate to the caller.
export async function createLog(email, action, details = null, client = prisma) {
  await client.auditLog.create({
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
