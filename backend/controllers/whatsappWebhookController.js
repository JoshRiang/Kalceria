import crypto from 'node:crypto';

// ─── GET /webhooks/whatsapp (Meta Cloud Webhook Verification) ─────────────────
export function verifyMetaWhatsAppWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.WA_WEBHOOK_VERIFY_TOKEN;

  if (mode === 'subscribe' && token && expectedToken) {
    const bufA = Buffer.from(token);
    const bufB = Buffer.from(expectedToken);
    if (bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)) {
      console.log('[WhatsAppWebhook] Meta verification successful.');
      return res.status(200).send(challenge);
    }
  }

  res.status(403).json({ error: 'Verification failed.' });
}

// ─── POST /webhooks/whatsapp (Inbound WhatsApp Events) ────────────────────────
export function handleInboundWhatsAppWebhook(req, res) {
  // 1. Signature Verification for Meta Cloud API if secret is configured
  const signature = req.headers['x-hub-signature-256'];
  const appSecret = process.env.WA_APP_SECRET;

  if (appSecret && signature && req.rawBody) {
    const expectedSig = 'sha256=' + crypto.createHmac('sha256', appSecret).update(req.rawBody).digest('hex');
    const bufA = Buffer.from(signature);
    const bufB = Buffer.from(expectedSig);
    if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
      console.warn('[WhatsAppWebhook] Signature mismatch.');
      return res.status(401).json({ error: 'Invalid signature.' });
    }
  }

  // 2. Parse incoming status or message updates
  const body = req.body || {};
  if (body.object === 'whatsapp_business_account') {
    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const val = change.value || {};
        const messages = val.messages || [];
        for (const msg of messages) {
          console.log(`[WhatsAppWebhook:Inbound] Received message from ${msg.from}:`, msg.text?.body || msg.type);
        }
      }
    }
  }

  // Always acknowledge immediately with 200 OK so Meta doesn't disable the webhook
  res.status(200).json({ status: 'received' });
}
