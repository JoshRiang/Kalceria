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

- Auth page dengan video backgrounds dan sistem verifikasi OTP (Resend + Redis)
- Landing page dengan intro animation (Gear + Canvas Phoenix) dan pencegahan Hydration Error
- Kalcerians Map dengan integrasi Leaflet, profil bergaya Discord, dan cinematic loading
- Admin Dashboard dengan antarmuka Glassmorphism untuk manajemen Event, User, dan Servis
- Merch showcase dengan random rotation
- Service form (Shooting) dengan calendar & payment

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

- **Authentication**: JWT-based tokens (20-minute validity)
- **Password**: Hashed with Argon2
- **Email Verification**: Redis-backed OTP challenge-response
- **PCI DSS**: Encrypted transaction data (separate table)
- **Rate Limiting**: Prevent DDOS, SQL Injection, Request Smuggling
- **DKIM/SPF/DMARC**: Email authentication setup

---

## 🛠️ Technology Stack

**Backend:**

- Node.js (Express.js)
- PostgreSQL (primary DB)
- Redis (token management, live telemetry, OTP caching)
- Prisma (ORM)
- Resend (email service API)

**Frontend:**

- Next.js (React framework)
- Three.js (3D animations)
- Leaflet & React-Leaflet (location tracking & tactical map)
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
