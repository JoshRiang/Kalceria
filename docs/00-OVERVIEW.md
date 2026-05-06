# Kalceria - Architectural Overview

**High-Fidelity Automotive Community Platform**

Kalceria adalah platform komunitas otomotif dengan fokus pada pelacakan anggota, manajemen event, dan showcase media berkualitas tinggi.

---

## 🎯 Tema & DNA Desain

- **Inspirasi Visual**: Forza Horizon + Hack The Box (HTB) + ROG Aggressiveness
- **Warna Utama**: Obsidian Black, Magenta, Golden Yellow
- **Tipografi**: ROGBOLD (font signature)
- **Elemen Dinamis**: Grid motherboard/chip maze dengan glow animasi (Kuning-Emas-Magenta-Emas-Kuning)

---

## 📋 Fitur Utama

### Backend Core Features

1. **Events** - Main host: Kalceria (admin)
2. **Media Showcase** - Hot Collection, Recent Post, Older Treasure
3. **Users Map** - Pelacakan "Kalcerian nearby me"
4. **Mini Events** - User broadcasts sederhana pada map
5. **Notification System** - Email notifications terautomasi
6. **Services** - Shooting, Event Hosting, Konsultasi langsung (via WA)
7. **Admin Dashboard** - Single pane of glass untuk manajemen
8. **About Us** - Info founder Kalceria
9. **FAQ** - Pertanyaan umum
10. **Support Us!** - Showcase merch & social media feeds

### Frontend Core Features

- Login page dengan video backgrounds
- Landing page dengan intro animation
- Merch showcase dengan random rotation
- Service form (Shooting) dengan calendar & payment
- User map dengan Google Maps integration
- About Us & FAQ pages
- Support Us section dengan TikTok/Instagram feed

---

## 🗄️ Database Architecture

| Tabel              | Fungsi                      | Keterangan                        |
| ------------------ | --------------------------- | --------------------------------- |
| **User**           | User registration & profile | Email, domicile, contact info     |
| **Event**          | Main events                 | Hosting, registration link, media |
| **UserEvent**      | Event registration tracker  | User-Event relationship           |
| **Transaction**    | Payment tracking            | Encrypted (PCI DSS compliant)     |
| **MiniEvent**      | User broadcasts on map      | 24hr lifespan, auto-delete        |
| **UserBroadcast**  | Broadcast content           | Timestamp-based expiry            |
| **Service**        | Service offerings           | Shooting, Event Hosting           |
| **ServiceBooking** | Service reservations        | Calendar, payment tracking        |
| **Merch**          | Merchandise items           | Tokopedia, Shopee integration     |
| **RedisTokens**    | Session management          | 20-minute token validity          |

---

## 🔐 Security Requirements

- **Authentication**: RSA-based tokens (20-minute validity)
- **Password**: Min 8 chars, uppercase, numbers, special chars, hashed with Argon2
- **Email Verification**: PIN-based challenge-response
- **PCI DSS**: Encrypted transaction data (separate table)
- **Rate Limiting**: Prevent DDOS, SQL Injection, Request Smuggling
- **DKIM/SPF/DMARC**: Email authentication setup

---

## 🛠️ Technology Stack

**Backend:**

- Node.js (Express.js)
- PostgreSQL (primary DB)
- Redis (token management, live telemetry)
- Prisma (ORM)
- Nodemailer (email service)

**Frontend:**

- Next.js (React framework)
- Three.js (3D animations)
- Google Maps API (location tracking)
- Framer Motion (animations)
- TailwindCSS (styling)

**Infrastructure:**

- Vercel (deployment)
- PostgreSQL (managed)
- Redis (managed or self-hosted)

---

## 📁 Documentation Structure

- `01-DATABASE-SCHEMA.md` - Detailed Prisma schema
- `02-FEATURES-EVENTS.md` - Event system & registration
- `03-FEATURES-MAP.md` - Users map & live telemetry
- `04-FEATURES-SERVICES.md` - Service booking system
- `05-FEATURES-NOTIFICATIONS.md` - Email & notification system
- `06-ADMIN-DASHBOARD.md` - Admin panel capabilities
- `07-FRONTEND-UI.md` - UI components & animations
- `08-API-ROUTES.md` - Backend API endpoints
- `09-SECURITY.md` - Authentication & security measures
