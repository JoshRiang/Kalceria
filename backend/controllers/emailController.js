import { sendEmail } from '../lib/mailer.js';

// ─── General Email Endpoint ──────────────────────────────────────────────────
// POST /api/email (requireAdmin)
// Body: { to, subject, html, text?, from? }
export async function sendGeneralEmail(req, res, next) {
  try {
    const { to, subject, html, text, from } = req.body;

    // Validate required fields
    if (!to) return res.status(400).json({ error: 'Field "to" is required.' });
    if (!subject) return res.status(400).json({ error: 'Field "subject" is required.' });
    if (!html) return res.status(400).json({ error: 'Field "html" is required.' });

    // Validate recipient count (max 50)
    const recipients = Array.isArray(to) ? to : [to];
    if (recipients.length > 50) {
      return res.status(400).json({ error: 'Max 50 recipients per request.' });
    }

    const data = await sendEmail({ to: recipients, subject, html, text, from });

    res.json({ success: true, id: data?.id || null });
  } catch (err) {
    next(err);
  }
}
