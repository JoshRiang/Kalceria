# Features: Notifications & Email System

Sistem notifikasi email terautomasi dengan template profesional.

---

## 📧 Email System Overview

**Provider**: Gmail (kalceria@gmail.com)
**Service**: Nodemailer dengan SMTP
**Frequency**: Event-driven (real-time)

---

## 🔐 Email Configuration

### DKIM/SPF/DMARC Setup

**Purpose**: Prevent email spoofing, improve deliverability

```
SPF Record (Sender Policy Framework):
v=spf1 include:gmail.com ~all

DKIM (DomainKeys Identified Mail):
- Generated in Gmail admin console
- Add public key to DNS TXT record
- Signs all outgoing emails

DMARC (Domain-based Message Authentication):
v=DMARC1; p=quarantine; rua=mailto:admin@kalceria.co.id
```

### Nodemailer Configuration

```javascript
// backend/lib/mailer.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER, // kalceria@gmail.com
    pass: process.env.GMAIL_APP_PASSWORD, // App-specific password
  },
});

module.exports = transporter;
```

### Environment Variables

```bash
GMAIL_USER=kalceria@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx  # 16-char app password
GMAIL_FROM_NAME="Kalceria Community"
```

---

## 📬 Email Templates

### 1. Event Notification Email

**Trigger**: Admin sends event notification (isSent flag)
**To**: All active users (with email verified)

```
From: kalceria@gmail.com
To: user@example.com
Subject: 🚗 Kalceria Event: [Event Title]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🎉 KALCERIA EVENT ANNOUNCEMENT 🎉
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Halo Kalcerian! 👋

Kami dengan senang hati mengumumkan event terbaru kami:

[EVENT POSTER IMAGE]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EVENT: Car Gathering 2026
📅 Date: 2026-05-15
🕐 Time: 08:00 - 17:00
📍 Location: Fresh Market Bintaro, Jakarta

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ABOUT THIS EVENT:
Join us untuk gathering automotive terbesar di Jakarta!
Berkumpul dengan enthusiast lain, showcase kendaraan Anda,
dan dapatkan pengalaman tak terlupakan.

📋 REGISTRATION DETAILS:
- Registration Fee: Rp 150,000
- Seats Available: 100
- Registration Deadline: 2026-05-13

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[REGISTER NOW] ← Click here

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Questions? Contact us at support@kalceria.co.id

Best regards,
🚗 Kalceria Team
www.kalceria.co.id

═══════════════════════════════════════════════
Kalceria © 2026 - Automotive Community Platform
═══════════════════════════════════════════════
```

### 2. Email Verification (On Registration)

**Trigger**: New user signs up
**To**: Registered email

```
From: kalceria@gmail.com
To: newuser@example.com
Subject: ✅ Verify Your Kalceria Account

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   KALCERIA EMAIL VERIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Hi there! 👋

Welcome to Kalceria! To complete your registration,
please verify your email address using the PIN below:

╔════════════════════════════════════╗
║         YOUR VERIFICATION PIN      ║
║                                    ║
║              123456                ║
║                                    ║
╚════════════════════════════════════╝

⏰ This PIN expires in 15 minutes.

Enter this PIN in your browser to activate your account.
[VERIFY NOW] → https://kalceria.co.id/verify?pin=123456

If you didn't sign up for this account, ignore this email.

Best regards,
Kalceria Team
```

### 3. Event Registration Confirmation

**Trigger**: User successfully registers for event
**To**: User email

```
From: kalceria@gmail.com
To: user@example.com
Subject: ✅ Registration Confirmed: Car Gathering 2026

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   REGISTRATION CONFIRMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Great! Your registration is confirmed! 🎉

EVENT: Car Gathering 2026
Confirmation ID: CONF-20260506-12345

📋 YOUR DETAILS:
Name: John Doe
Email: john@example.com
Registration Fee: Rp 150,000
Session: Morning (08:00 - 12:00)

📅 Event Details:
Date: 2026-05-15
Time: 08:00 - 17:00
Location: Fresh Market Bintaro, Jakarta

📍 WHAT'S NEXT:
1. Payment confirmation (check your account)
2. Receive ticket 2 days before event
3. Show ticket at event entrance

Need help? Reply to this email or visit our support page.

Best regards,
Kalceria Team
```

### 4. Payment Confirmation

**Trigger**: Payment gateway webhook (successful payment)
**To**: User email

```
From: kalceria@gmail.com
To: user@example.com
Subject: 💰 Payment Received - Car Gathering 2026

Your payment has been received! ✅

Transaction ID: TRX-20260506-98765
Amount: Rp 150,000
Method: BCA Virtual Account
Date: 2026-05-06 10:30:00

Event: Car Gathering 2026
Status: ✅ CONFIRMED

You will receive your event ticket soon.
```

### 5. Service Booking Confirmation

**Trigger**: User confirms service booking
**To**: User email

```
From: kalceria@gmail.com
To: user@example.com
Subject: 📷 Shooting Service Booking Confirmed

Your shooting service is confirmed! 📷

Booking ID: BK-20260506-54321
Service: Automotive Shooting
Date: 2026-05-10
Time: 09:00 - 12:00 (3 hours)
Location: Kalceria HQ, Fresh Market Bintaro

💰 Total Price: Rp 396,000
Payment Status: ✅ Confirmed

Photographer will contact you 24 hours before the session.
```

### 6. Password Reset

**Trigger**: User requests password reset
**To**: User email

```
From: kalceria@gmail.com
To: user@example.com
Subject: 🔐 Reset Your Kalceria Password

You requested a password reset.

Click link below to set new password:
[RESET PASSWORD] → https://kalceria.co.id/reset?token=abc123...

⏰ Link expires in 1 hour.

If you didn't request this, ignore this email.

Best regards,
Kalceria Team
```

### 7. Admin Notification (WhatsApp)

**Trigger**: Service booking confirmed
**To**: Kalceria WhatsApp Business
**Format**: Structured WhatsApp template

```
🚗 PESANAN BARU MASUK

Layanan: Shooting
Pemesan: John Doe
Email: john@example.com
Telepon: +62812xxxxxxx

Jadwal:
📅 2026-05-10
🕐 09:00 - 12:00 (3 jam)

💰 Total: Rp 396,000
Status: ✅ Pembayaran Confirmed

👉 Dashboard: https://admin.kalceria.co.id/bookings/BK-123456
```

---

## 🔄 Email Sending Workflow

### Event Notification Flow

```
1. Admin clicks "Send Notification" button
2. Set Event.isSent = 1
3. Trigger background job:
   ├─ Query all users (email verified)
   ├─ Get event details
   ├─ Render email template
   ├─ Send email in batches (to avoid rate limits)
   ├─ Log delivery status
   └─ Update isSent = 1
4. Return success message to admin
```

### Batch Sending Strategy

```javascript
// Send emails in batches (max 100 per batch)
async function sendEventNotifications(eventId) {
  const event = await Event.findUnique({ where: { id: eventId } });
  const users = await User.findMany({
    where: { emailVerified: true },
    select: { id, email, name },
  });

  const batchSize = 100;
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);

    const promises = batch.map((user) => sendEventEmail(user, event));

    await Promise.all(promises);
    await sleep(5000); // 5s delay between batches
  }

  await Event.update({
    where: { id: eventId },
    data: { isSent: true },
  });
}
```

---

## 📊 Email Logging

### Email Log Table (Optional)

```prisma
model EmailLog {
  id          String   @id
  to          String
  subject     String
  type        String   // event_notification, verification, etc
  eventId     String?
  status      String   // sent, failed, bounced
  errorMsg    String?
  sentAt      DateTime @default(now())
}
```

---

## ⚙️ Email Rendering

### Template Engine

```javascript
// Use EJS or similar
const ejs = require("ejs");
const template = fs.readFileSync("./emails/event-notification.ejs", "utf-8");

const html = ejs.render(template, {
  eventTitle: event.title,
  eventDate: event.eventDate,
  eventDescription: event.description,
  registrationLink: `https://kalceria.co.id/events/${event.id}/register`,
  userName: user.name,
});

await transporter.sendMail({
  from: process.env.GMAIL_USER,
  to: user.email,
  subject: `🚗 Kalceria Event: ${event.title}`,
  html: html,
});
```

---

## 🚀 API Endpoints (Admin)

### Send Event Notification

```
POST /api/admin/events/:id/send-notification
Authorization: Bearer {token}

Response:
{
  success: true,
  message: "Email notification queued for 150 users",
  jobId: "job123"
}
```

### Get Email Logs

```
GET /api/admin/emails?type=event_notification&days=7

Response:
[
  {
    id: "email123",
    to: "user@example.com",
    type: "event_notification",
    status: "sent",
    sentAt: "2026-05-06T10:30:00Z"
  },
  ...
]
```

---

## 🛡️ Security & Best Practices

- ✅ Never log passwords or sensitive data
- ✅ Use app-specific Gmail passwords (2FA)
- ✅ Sanitize email addresses before sending
- ✅ Rate limit: Max 100 emails per 30 seconds
- ✅ Retry logic for failed emails (3 attempts)
- ✅ Monitor email bounce rates
- ✅ Unsubscribe link (required by law)
- ✅ Use HTTPS for all email links

---

## 🚀 Future Enhancements

- [ ] SMS notifications (Twilio)
- [ ] Push notifications (Firebase Cloud Messaging)
- [ ] Email template builder (drag-drop UI)
- [ ] A/B testing (different subject lines)
- [ ] Delivery analytics (open rates, click rates)
- [ ] Automatic unsubscribe management
- [ ] Custom branding (user domain/logo)
