# Database Schema - Kalceria

Comprehensive Prisma schema untuk Kalceria platform.

---

## 📊 Core Tables

### A. User (Tabel Utama)

```prisma
model User {
  id              String        @id @default(cuid())
  email           String        @unique
  username        String?       @unique
  password        String        // Hashed with Argon2

  // Personal Info
  name            String
  dateOfBirth     DateTime
  gender          String?
  phone           String
  profilePhoto    Bytes?        // Blob storage

  // Location
  domicileLat     Float
  domicileLng     Float
  allowLiveLocation Boolean     @default(false)
  district        String?       // Privacy: hanya sampai kecamatan

  // Social Media (Optional - nullable)
  whatsapp        String?
  instagram       String?
  facebook        String?

  // Email Verification
  emailVerified   Boolean       @default(false)
  verificationPin String?

  // Relationships
  events          UserEvent[]
  broadcasts      UserBroadcast[]
  bookings        ServiceBooking[]
  transactions    Transaction[]

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}
```

### B. Event (Main Event - Kalceria Hosted)

```prisma
model Event {
  id              String        @id @default(cuid())
  title           String
  description     String

  // Timing
  registrationStart DateTime
  registrationEnd DateTime
  eventDate       DateTime

  // Media
  displayPhoto    Bytes         // Blob storage

  // Registration
  registrationLink String       // Google Form or internal form
  isSent          Boolean       @default(false) // Email sent flag

  // Sessions (if multiple)
  sessions        String[]      // Array of session names/times

  // Admin
  createdBy       String        // Admin user ID

  // Relationships
  users           UserEvent[]

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}
```

### C. UserEvent (Event Registration)

```prisma
model UserEvent {
  id              String        @id @default(cuid())
  userId          String
  eventId         String

  // Session Selection
  selectedSession String?       // Which session user registered for

  // Payment
  registrationFee Decimal
  paidAmount      Decimal       @default(0)
  paymentStatus   String        @default("pending") // pending, confirmed, failed

  // Virtual Account (BCA, etc)
  virtualAccount  String?

  // Relationships
  user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  event           Event         @relation(fields: [eventId], references: [id], onDelete: Cascade)
  transaction     Transaction?

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@unique([userId, eventId])
}
```

### D. Transaction (Payment - Encrypted)

```prisma
model Transaction {
  id              String        @id @default(cuid())
  userId          String
  userEventId     String        @unique

  // Payment Details (Encrypted)
  amount          Decimal       // Stored encrypted
  paymentMethod   String        // encrypted: OVO, GCash, BCA, etc

  // Virtual Account
  virtualAccount  String?       // encrypted

  // Payment Status
  status          String        @default("pending") // pending, confirmed, expired

  // Relationships
  user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  userEvent       UserEvent     @relation(fields: [userEventId], references: [id], onDelete: Cascade)

  createdAt       DateTime      @default(now())
  confirmedAt     DateTime?
  expiresAt       DateTime
}
```

---

## 🗺️ Location & Telemetry Tables

### E. LiveLocation (Wide Column Store - Redis backed)

```
// Redis Schema (TTL-based):
key: "live:user:{userId}"
value: {
  userId: string
  lat: float
  lng: float
  timestamp: timestamp
  pollingCount: number (1-5)
  isStale: boolean
}

// Logic:
- On login + location enabled: Create live location entry
- Poll every 1 minute (max 5 times)
- If same location: Don't drop data
- If COUNT = 5 AND new location: Replace old, reset count
- Auto-expire after 30 minutes of inactivity
```

### F. MiniEvent (User-hosted informal events)

```prisma
model MiniEvent {
  id              String        @id @default(cuid())
  userId          String

  // Content
  title           String
  description     String

  // Location (from User.domicileLat/Lng)
  lat             Float
  lng             Float

  // Lifespan (24 hours)
  createdAt       DateTime      @default(now())
  expiresAt       DateTime      // now() + 24h
  isActive        Boolean       @default(true)

  // Relationships
  user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
}
```

### G. UserBroadcast (Status broadcasts)

```prisma
model UserBroadcast {
  id              String        @id @default(cuid())
  userId          String        @unique // One broadcast per user

  // Content
  message         String

  // Timing
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  expiresAt       DateTime      // now() + 24h

  // State
  isActive        Boolean       @default(true)
  isEdited        Boolean       @default(false)

  // Relationships
  user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

---

## 🛠️ Services & Booking Tables

### H. Service (Service offerings)

```prisma
model Service {
  id              String        @id @default(cuid())
  name            String        // "Shooting", "Event Hosting", etc
  description     String
  basePrice       Decimal       // Per hour

  // Availability
  operatingHoursStart Int       // 09:00 = 9
  operatingHoursEnd Int         // 00:00 = 0 (midnight)

  // Relationships
  bookings        ServiceBooking[]

  createdAt       DateTime      @default(now())
}
```

### I. ServiceBooking (Service reservations)

```prisma
model ServiceBooking {
  id              String        @id @default(cuid())
  userId          String
  serviceId       String

  // Booking Details
  requestedDate   DateTime      // Max 7 days ahead
  startTime       Int           // Hour (09-23)
  endTime         Int           // Hour (09-00)

  // Pricing
  hoursBooked     Int
  totalPrice      Decimal       // basePrice * hoursBooked
  transactionId   String?

  // Status
  status          String        @default("pending") // pending, confirmed, rejected, completed

  // WhatsApp Notification
  whatsappSent    Boolean       @default(false)

  // Relationships
  user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  service         Service       @relation(fields: [serviceId], references: [id])

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([userId])
  @@index([requestedDate])
}
```

---

## 🛍️ Merchandise Tables

### J. Merch (Merchandise)

```prisma
model Merch {
  id              String        @id @default(cuid())
  name            String
  description     String?
  photo           Bytes         // Product photo

  // Links
  tokopediaLink   String?
  shopeeLink      String?

  // Display Logic
  isLatest        Boolean       @default(true) // IsSeven: last 7 days
  isPicked        Boolean       @default(false) // Random selection flag

  // Tracking
  displayCount    Int           @default(0)

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([isLatest])
}
```

---

## 🔐 Session & Token Management

### K. SessionToken (Redis-backed via Prisma)

```prisma
model SessionToken {
  id              String        @id @default(cuid())
  userId          String
  token           String        @unique

  // Validation
  isValid         Boolean       @default(true)
  expiresAt       DateTime      // 20 minutes from creation

  // Event Context
  linkedEventId   String?       // For event registration redirect

  createdAt       DateTime      @default(now())
}
```

---

## 📋 Admin Tables

### L. AdminLog (Audit trail)

```prisma
model AdminLog {
  id              String        @id @default(cuid())
  adminId         String
  action          String        // CREATE_EVENT, UPDATE_MERCH, DELETE_EVENT, etc

  entityType      String        // Event, Merch, Service, etc
  entityId        String
  changes         Json          // Before/after diff

  timestamp       DateTime      @default(now())
}
```

---

## 🔌 Database Configuration

### Prisma Setup

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// All models above...
```

### Environment

```bash
# .env
DATABASE_URL="postgresql://user:password@host:5432/kalceria"
REDIS_URL="redis://localhost:6379"
```

---

## 📊 Indexes & Performance

```sql
-- User searches
CREATE INDEX idx_user_email ON "User"(email);
CREATE INDEX idx_user_domicile ON "User"(domicileLat, domicileLng);

-- Event queries
CREATE INDEX idx_event_date ON "Event"(eventDate);
CREATE INDEX idx_event_registration ON "Event"(registrationStart, registrationEnd);

-- Service bookings
CREATE INDEX idx_booking_date ON "ServiceBooking"(requestedDate);
CREATE INDEX idx_booking_user ON "ServiceBooking"(userId);

-- Mini events expiry
CREATE INDEX idx_minievents_expiry ON "MiniEvent"(expiresAt) WHERE isActive = true;

-- Transaction tracking
CREATE INDEX idx_transaction_user ON "Transaction"(userId);
CREATE INDEX idx_transaction_status ON "Transaction"(status);
```

---

## 🔄 Relationships Summary

```
User
  ├── UserEvent (1:M)
  ├── UserBroadcast (1:1)
  ├── MiniEvent (1:M)
  ├── ServiceBooking (1:M)
  └── Transaction (1:M)

Event
  └── UserEvent (1:M)

Service
  └── ServiceBooking (1:M)

Merch
  (Independent - no direct relations)
```
