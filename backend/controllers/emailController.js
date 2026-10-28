import { sendEmail } from '../lib/mailer.js';

// ─── General Email Endpoint ──────────────────────────────────────────────────
// POST /api/email (requireAdmin)
// Body: { to, subject, html, text?, from? }
export async function sendGeneralEmail(req, res, next) {
  try {
    const { to, subject, html, text, from } = req.body || {};

    // Validate required fields
    if (!to) return res.status(400).json({ error: 'Field "to" is required.' });
    if (typeof subject !== 'string' || !subject.trim() || subject.length > 200) return res.status(400).json({ error: 'Subject must be between 1 and 200 characters.' });
    if (typeof html !== 'string' || !html.trim() || html.length > 100_000) return res.status(400).json({ error: 'HTML content must be between 1 and 100000 characters.' });
    if (text !== undefined && (typeof text !== 'string' || text.length > 100_000)) return res.status(400).json({ error: 'Text content must be 100000 characters or less.' });
    if (from !== undefined && (typeof from !== 'string' || from.length > 254 || from !== process.env.EMAIL_FROM)) {
      return res.status(400).json({ error: 'Sender is not allowed.' });
    }

    // Validate recipient count (max 50)
    const recipients = Array.isArray(to) ? to : [to];
    if (recipients.length > 50 || recipients.some((email) => typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      return res.status(400).json({ error: 'Max 50 recipients per request.' });
    }

    const data = await sendEmail({ to: recipients, subject, html, text, from });

    res.json({ success: true, id: data?.id || null });
  } catch (err) {
    next(err);
  }
}
