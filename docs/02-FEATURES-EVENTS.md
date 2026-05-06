# Features: Main Events System

Sistem event utama yang dihosting oleh Kalceria (admin).

---

## 🎯 Event Overview

**Main Events** adalah acara-acara yang dihosting oleh Kalceria sebagai organizational host. Users dapat mendaftar, membayar, dan berpartisipasi dalam event-event ini.

---

## 📋 Event Registration Flow

```
1. Admin membuat event (via Admin Dashboard)
2. Event dilisting di Events page
3. User melihat event dan klik register
4. User fill registration form (jika diperlukan)
5. User memilih session (jika ada multiple sessions)
6. User melakukan pembayaran (virtual account BCA, OVO, etc)
7. Email konfirmasi dikirim
8. User confirm pembayaran
9. Transaction tercatat di database
```

---

## 🔑 Event Schema

### Event Table Fields

| Field               | Type          | Deskripsi                                |
| ------------------- | ------------- | ---------------------------------------- |
| `id`                | String (UUID) | Unique event identifier                  |
| `title`             | String        | Event name                               |
| `description`       | String        | Event details                            |
| `registrationStart` | DateTime      | Mulai registrasi                         |
| `registrationEnd`   | DateTime      | Tutup registrasi                         |
| `eventDate`         | DateTime      | Tanggal event                            |
| `displayPhoto`      | Blob          | Event poster/media                       |
| `registrationLink`  | String        | Link ke form (Google Form atau internal) |
| `isSent`            | Boolean       | Email notification sent flag (0→1)       |
| `sessions`          | String[]      | Multiple sessions (jika ada)             |
| `createdBy`         | String        | Admin user ID                            |

---

## 💳 Registration & Payment

### Option A: Google Form + Database Sync (Deprecated)

- User submit form → Google Form collects data
- API watches sheet untuk new submissions
- Webhook triggers: Insert ke `UserEvent` table
- ❌ Less control, external dependency

### Option B: Internal Registration Form (Recommended)

```
Flow:
1. User logs in & clicks "Register"
2. Form shows:
   - Email (pre-filled)
   - Session selector (dropdown, jika event ada multiple sessions)
   - Payment info
3. Submit → Generates Virtual Account (BCA, OVO, GCash)
4. Invoice ditampilkan (standar Google Play)
5. User dapat membayar
6. Payment confirmation webhook
7. Update UserEvent.paymentStatus → confirmed
```

### Payment Session Selection

**Constraint**: "Pengisian hanya berlaku untuk satu sesi" — user hanya bisa daftar di satu session.

```
Example: Event "Car Gathering 2026"
- Session 1: Pagi (08:00-12:00)
- Session 2: Siang (12:00-16:00)
- Session 3: Malam (16:00-20:00)

User picks ONE session.
```

### Virtual Account Integration

```
Providers Supported:
- BCA Virtual Account (SNAP/XENDIT)
- OVO
- GCash (PH)
- Other payment gateways

Process:
1. Generate unique VA for user
2. Store in UserEvent.virtualAccount (encrypted)
3. Payment via provider
4. Webhook: Payment confirmed → Update transaction status
5. Email confirmation sent
```

### Invoice Standard

**Minimal invoice fields** (per Google Play standard):

```
┌─────────────────────────────────┐
│   KALCERIA EVENT INVOICE        │
├─────────────────────────────────┤
│ Event: Car Gathering 2026       │
│ Session: Pagi (08:00-12:00)     │
├─────────────────────────────────┤
│ Registration Fee: Rp 150.000    │
│ Virtual Account: [BCA XXXX]     │
│ Amount Due: Rp 150.000          │
├─────────────────────────────────┤
│ Instructions:                   │
│ Transfer ke VA before 24:00     │
└─────────────────────────────────┘
```

---

## 📧 Email Notification System

### Email Triggered on `isSent` Flag

**When**: Admin creates event → sets `isSent = 0`
**What**: Event notification sent to all active users
**Content**: Infografis + deskripsi + registrasi link

```
From: kalceria@gmail.com
Subject: Kalceria Event Announcement 🚗

Hi Kalcerian!

Kami memiliki event menarik untuk Anda:
📍 [Event Title]
🕐 [Date] [Time]
📍 [Location]

Deskripsi singkat event...

[REGISTER NOW BUTTON/LINK]

---
Best regards,
Kalceria Team
```

### Process

1. Admin creates event in Admin Dashboard
2. Admin clicks "Send notification"
3. `isSent` flag → 1
4. Background job sends email to all users (dengan subscription)
5. Email includes:
   - Pretext (standar template)
   - Event poster (displayPhoto)
   - Event description
   - Registration link (hyperlinked poster)

---

## 🔗 Registration Link Logic

### Pre-Registration Check

```
User clicks event poster in email
↓
Check if user is logged in (session token)?
  ├─ YES: Redirect to /register/event/[eventId]
  └─ NO: Redirect to /login, then to registration
↓
Validate token (RSA, 20-min validity)
↓
Match event ID (prevent mismatches)
↓
Prevent DDOS/Injection/Smuggling via:
  - Rate limiting per user
  - Input sanitization
  - CSRF tokens
```

### Session Token Validation

```
Token stored in: Redis table
Format: RSA-encrypted
Validity: 20 minutes
Validation:
  1. Extract token from URL param
  2. Check Redis: SessionToken with linkedEventId = [eventId]
  3. Check expiry (createdAt + 20min > now)
  4. If valid: Proceed to registration
  5. If invalid/expired: Force re-login
```

---

## 📊 UserEvent Relationship

```prisma
model UserEvent {
  id              String
  userId          String      // Foreign key → User
  eventId         String      // Foreign key → Event
  selectedSession String?     // Which session user chose
  registrationFee Decimal
  paidAmount      Decimal
  paymentStatus   String      // pending, confirmed, failed
  virtualAccount  String?     // Encrypted payment account
}
```

---

## 🛡️ Security Measures

### Session Token (RSA)

- **Algorithm**: RSA-2048
- **Expiry**: 20 minutes
- **Storage**: Redis (not in URL permanently)
- **Validation**: Prevent direct link sharing

### Event Registration Constraints

- ✅ User must be logged in
- ✅ Event must exist & be open for registration
- ✅ User can't register twice for same event
- ✅ Registration deadline must not be passed
- ✅ Rate limiting: 5 registrations per minute per user

### Payment Security (PCI DSS)

- Transaction data stored encrypted (separate table)
- Virtual accounts stored encrypted
- Payment status webhook validated
- No sensitive data in logs

---

## 🎯 Event Admin Features

Via Admin Dashboard, admin dapat:

```
✅ CREATE EVENT
  - Set title, description, date
  - Upload poster (displayPhoto)
  - Set registration period
  - Define sessions (if multi-session)
  - Set max attendees (optional)

✅ UPDATE EVENT
  - Modify description, date, times
  - Add/remove sessions
  - Update poster

✅ DELETE EVENT
  - Soft delete (optional)
  - Notify registered users

✅ SEND NOTIFICATION
  - Trigger isSent = 1 → Email batch job
  - View delivery status

✅ VIEW REGISTRATIONS
  - List all UserEvent for this event
  - Download CSV export
  - Filter by session, payment status
```

---

## 📊 Event Statistics

**Dashboard shows**:

- Total events created
- Total registrations
- Total revenue (sum of registrationFee)
- Pending payments
- Event attendance (post-event)

---

## 🔄 Event Lifecycle

```
[EVENT CREATED]
     ↓
[REGISTRATION OPEN] (registrationStart → registrationEnd)
     ↓
[EVENT OCCURS] (eventDate)
     ↓
[EVENT CLOSED]
     ↓
[ARCHIVE]
```

---

## 🚀 Future Enhancements

- [ ] Multi-currency support
- [ ] Refund management
- [ ] Waitlist system (if max attendees reached)
- [ ] Batch email notifications with templates
- [ ] QR code check-in at event
- [ ] Post-event feedback survey
- [ ] Event analytics & attendance tracking
