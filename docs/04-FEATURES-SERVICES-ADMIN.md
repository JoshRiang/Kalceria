# Features: Services & Admin Dashboard

Sistem booking layanan dan admin panel untuk manajemen Kalceria.

---

## 🛠️ Services System

### Available Services

Currently: **Shooting** (Photography services)

```
Service: Shooting
- Photography untuk automotive events, car meets, dll
- Pricing: Rp 120.000 per jam
- Duration: Min 1 jam, max sesuai ketersediaan
- Location: Kalceria HQ (Fresh Market Bintaro)
- Time: 09:00 - 00:00
```

### Service Booking Flow

```
1. User opens "Need Us?" form
2. Form is SEQUENTIAL (langkah demi langkah)
3. Step 1: Enter Gmail (auto-join with user data)
4. Step 2: Choose service (now: Shooting only)
5. Step 3: Select date (max 7 days ahead, 2026)
6. Step 4: Select start time (09:00-23:59)
7. Step 5: Select end time (10:00-00:00, after start)
8. Step 6: Review & confirm
9. Payment via invoice (Google Play standard)
10. WhatsApp notification sent to admin
```

### Sequential Form UI

**Visual**: Lower sections appear greyed out (disabled) until upper sections filled

```
┌─────────────────────────────────────┐
│ Step 1: Email ✓                     │
│ your@email.com                      │
├─────────────────────────────────────┤
│ Step 2: Service                     │
│ [•] Shooting                        │
├─────────────────────────────────────┤
│ Step 3: Date (Disabled until Step2) │ (Greyed out)
│ [Calendar widget]                   │
├─────────────────────────────────────┤
│ Step 4: Start Time (Disabled)       │ (Greyed out)
│ [Time picker]                       │
├─────────────────────────────────────┤
│ Step 5: End Time (Disabled)         │ (Greyed out)
│ [Time picker]                       │
├─────────────────────────────────────┤
│ [ CONFIRM ] [ CANCEL ]              │
└─────────────────────────────────────┘
```

---

## 📅 Calendar & Scheduling

### Date Constraints

- **Min**: Today (system timestamp)
- **Max**: Today + 7 days
- **Year**: 2026 (hardcoded or system-based)
- **Format**: Professional (not gaming-style)

### Time Constraints

- **Office Hours**: 09:00 - 00:00 (15 hours operational)
- **Start Time**: 09:00 - 23:00
- **End Time**: Must be after start time
- **Resolution**: Hourly (09:00, 10:00, etc)

### Backend Logic

```javascript
// Validate booking request
function validateServiceBooking(startTime, endTime, requestedDate) {
  const today = new Date();
  const maxDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Check date
  if (requestedDate < today || requestedDate > maxDate) {
    throw new Error("Date must be within 7 days");
  }

  // Check times
  if (startTime < 9 || startTime >= 24) {
    throw new Error("Start time must be 09:00 - 23:00");
  }

  if (endTime <= startTime || endTime > 24) {
    throw new Error("End time must be after start time");
  }

  const hoursBooked = endTime - startTime;
  if (hoursBooked < 1 || hoursBooked > 15) {
    throw new Error("Invalid booking duration");
  }

  return hoursBooked;
}
```

---

## 💰 Invoice & Payment

### Invoice Standard

```
┌──────────────────────────────────────┐
│        KALCERIA BOOKING INVOICE       │
├──────────────────────────────────────┤
│ Date: 2026-05-06                     │
│ Service: Shooting                    │
├──────────────────────────────────────┤
│ Session Details:                     │
│ - Date: 2026-05-10                   │
│ - Start: 09:00                       │
│ - End: 12:00                         │
│ - Duration: 3 hours                  │
├──────────────────────────────────────┤
│ Pricing:                             │
│ - Rate: Rp 120,000 / hour            │
│ - Hours: 3                           │
│ - Subtotal: Rp 360,000               │
│ - Tax (10%): Rp 36,000               │
│ - TOTAL: Rp 396,000                  │
├──────────────────────────────────────┤
│ Payment Method:                      │
│ [ ] BCA Transfer                     │
│ [ ] OVO                              │
│ [ ] GCash                            │
├──────────────────────────────────────┤
│ Due Date: 2026-05-08 23:59:59        │
│                                      │
│ [ CONFIRM PAYMENT ]                  │
└──────────────────────────────────────┘
```

### Pricing Calculation

```
hoursBooked = endTime - startTime
basePrice = Rp 120,000
totalPrice = hoursBooked * basePrice
tax = totalPrice * 0.10 (jika applicable)
finalPrice = totalPrice + tax (atau tanpa tax)
```

---

## 📨 WhatsApp Business Notification

### Auto Message to Admin

When user confirms booking:

```
Trigger: ServiceBooking.status → "confirmed"
Send to: Kalceria WhatsApp Business account
Message Template:

"🚗 PESANAN BARU MASUK

Layanan: Shooting
Pemesan: [User Name]
Email: [user@email.com]
Telepon: [User Phone]

Jadwal:
📅 2026-05-10
🕐 09:00 - 12:00 (3 jam)

💰 Total: Rp 396,000

Status: ✅ Pembayaran Confirmed

👉 Akses booking: [Dashboard Link]
"
```

### Message Structure

- Professional tone
- Clear formatting (emoji for UX)
- Actionable link to admin dashboard
- All booking details in message

---

## 👨‍💼 Admin Dashboard

### Admin Features

Admins dapat manage:

1. **Events** (CRUD)
2. **Merchandise** (CRUD)
3. **Service Bookings** (View, Approve, Reject, Complete)
4. **Users** (View, Ban, Reset password)
5. **Analytics** (View statistics)

### Admin Panels

#### A. Events Management

**Create Event**:

```
- Title
- Description
- Registration Start/End dates
- Event date/time
- Upload poster
- Multiple sessions (optional)
```

**Update Event**:

- Modify any field
- Update poster
- Extend registration deadline
- Add/remove sessions

**Delete Event**:

- Soft delete (optional)
- Notify registered users

**Send Notification**:

- Trigger email to all users
- View delivery status
- Resend if failed

#### B. Merchandise Management

**Create Merch**:

```
- Product name
- Description
- Upload photo
- Tokopedia link
- Shopee link
- Mark as "Latest" (IsSeven: last 7 days)
```

**Update Merch**:

- Edit details
- Update photo
- Update links
- Toggle latest status
- Mark as "Sold Out"

**Delete Merch**:

- Remove from catalog

**Merch Dashboard**:

- List all products
- Filter by latest, sold out, etc
- Display count (times shown)

#### C. Service Bookings

**View Bookings**:

```
- List all pending, confirmed, completed bookings
- Filter by:
  - Status (pending, confirmed, completed, cancelled)
  - Date range
  - Service type
  - User
```

**Actions**:

- ✅ Approve booking (changes status to confirmed)
- ❌ Reject booking (with reason, sends notification)
- ✔️ Mark as completed (post-event)
- Cancel (if needed, sends refund logic)

**Booking Details Modal**:

```
Booking ID: BK123456
User: John Doe
Email: john@example.com
Phone: +62812xxxxxxx

Service: Shooting
Date: 2026-05-10
Time: 09:00 - 12:00 (3 hours)
Total: Rp 396,000

Status: Pending ⏳
Payment: Confirmed ✅

Actions:
[ APPROVE ] [ REJECT ] [ MARK COMPLETE ]
```

#### D. Users Management

**View Users**:

- List all users
- Search by email, username
- Filter by registration date, location

**User Actions**:

- View user profile
- Verify email (if unverified)
- Ban user (soft ban, disables login)
- Reset password (sends reset link)
- Assign admin role (if needed)

#### E. Analytics Dashboard

**Statistics**:

```
- Total users
- Active users (logged in last 7 days)
- Total events created
- Total registrations
- Total revenue (sum of fees)
- Pending payments
- Booking completion rate
- Merch display statistics
```

**Charts** (optional):

- User growth over time
- Event attendance trends
- Revenue trends
- Popular merchandise

---

## 🔐 Admin Authorization

### Role-Based Access Control (RBAC)

```
Admin User:
- Can access /admin dashboard
- Can create/edit/delete events
- Can manage merchandise
- Can view & manage bookings
- Can view users (limited)
- Cannot change other admins

Super Admin:
- Full access
- Can manage other admins
- Can change system settings
```

### Backend Protection

```javascript
// Middleware: Check if user is admin
async function adminMiddleware(req, res, next) {
  const userId = req.user.id;
  const user = await User.findUnique({ where: { id: userId } });

  if (!user.isAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }

  next();
}

// Route: Protected admin endpoint
router.post("/events", adminMiddleware, createEvent);
```

---

## 📊 Admin API Endpoints

### Events

```
POST   /api/admin/events              (Create)
GET    /api/admin/events              (List)
GET    /api/admin/events/:id          (Get)
PUT    /api/admin/events/:id          (Update)
DELETE /api/admin/events/:id          (Delete)
POST   /api/admin/events/:id/notify   (Send email)
```

### Merchandise

```
POST   /api/admin/merch               (Create)
GET    /api/admin/merch               (List)
PUT    /api/admin/merch/:id           (Update)
DELETE /api/admin/merch/:id           (Delete)
POST   /api/admin/merch/:id/toggle    (Toggle sold out)
```

### Service Bookings

```
GET    /api/admin/bookings            (List)
GET    /api/admin/bookings/:id        (Get)
POST   /api/admin/bookings/:id/approve (Approve)
POST   /api/admin/bookings/:id/reject  (Reject)
POST   /api/admin/bookings/:id/complete (Mark complete)
```

### Users

```
GET    /api/admin/users               (List)
GET    /api/admin/users/:id           (Get)
POST   /api/admin/users/:id/ban       (Ban user)
POST   /api/admin/users/:id/verify    (Verify email)
```

### Analytics

```
GET    /api/admin/analytics/stats     (Statistics)
GET    /api/admin/analytics/revenue   (Revenue data)
GET    /api/admin/analytics/users     (User metrics)
```

---

## 🎯 Admin Audit Log

Every admin action logged:

```prisma
model AdminLog {
  id          String
  adminId     String      // Who made the change
  action      String      // CREATE_EVENT, UPDATE_MERCH, etc
  entityType  String      // Event, Merch, ServiceBooking
  entityId    String      // ID of affected entity
  changes     Json        // Before/after diff
  timestamp   DateTime
}
```

**Example log entry**:

```json
{
  "id": "log123",
  "adminId": "admin001",
  "action": "UPDATE_EVENT",
  "entityType": "Event",
  "entityId": "event456",
  "changes": {
    "before": { "title": "Car Meet 2026" },
    "after": { "title": "Automotive Gathering 2026" }
  },
  "timestamp": "2026-05-06T10:30:00Z"
}
```

---

## 🚀 Future Admin Features

- [ ] Bulk email campaigns
- [ ] CSV export (users, bookings, revenue)
- [ ] Email template builder
- [ ] SMS notifications (integration)
- [ ] Webhook management (for external integrations)
- [ ] Backup & restore database
- [ ] System logs viewer
- [ ] Staff management (assign roles to sub-admins)
