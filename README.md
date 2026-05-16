<div align="center">
  <h1 align="center">KALCERIA</h1>
  <p align="center">
    <strong>A High-Fidelity Cyber-Automotive Community Platform</strong>
    <br />
    <br />
    <a href="#features">Explore Features</a>
    ·
    <a href="#getting-started">Getting Started</a>
    ·
    <a href="#roadmap">View Roadmap</a>
  </p>

  <div>
    <img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=nodedotjs" alt="Node.js" />
    <img src="https://img.shields.io/badge/PostgreSQL-Prisma-4169E1?style=for-the-badge&logo=postgresql" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/Redis-Caching-DC382D?style=for-the-badge&logo=redis" alt="Redis" />
  </div>
</div>

---

## 📖 About The Project

Kalceria is a state-of-the-art automotive community platform designed to push the boundaries of web UI. Built with a visual DNA inspired by **Forza Horizon**, **Hack The Box (HTB)**, and **ROG Aggressiveness**, Kalceria delivers a premium, immersive interactive experience for automotive enthusiasts.

Beyond its striking glassmorphism aesthetics, Kalceria serves as a robust engine for real-time telemetry, community event management, and seamless social networking.

### 🌟 Core Features

- 🗺️ **Tactical SnapMap**: Real-time user telemetry utilizing Leaflet. Includes cinematic cloud-loading, Discord-inspired profile cards, and dynamic 24-hour map broadcasting.
- 🔐 **Bulletproof Auth**: Argon2 password hashing coupled with blazing-fast, Redis-backed OTP email verification via Resend.
- 🎫 **Event Management**: High-fidelity dynamic event carousels with fully integrated session selection and registration pipelines.
- 📸 **Kalceria Services**: Seamless booking engine for automotive shooting, event organizing, and hosting with automated scheduling.
- 🎛️ **Single Pane Admin**: A centralized, dark-mode glassmorphism administrative dashboard to effortlessly manage users, events, and service bookings.
- ⚡ **Optimized Performance**: Strict adherence to React hydration safety, leveraging GPU-accelerated Framer Motion and Canvas-based particle systems.

---

## 🏗️ Architecture & Tech Stack

The platform utilizes a modern, decoupled architecture:

- **Frontend:** Next.js 14, React, TailwindCSS, Framer Motion, Three.js, React-Leaflet
- **Backend:** Node.js, Express.js, Prisma ORM
- **Data Layer:** PostgreSQL (Persistent data) & Redis (Volatile data, OTP, Live Telemetry)
- **Services:** Resend API (Transactional Emails)

---

## 🛠️ Technology Stack

**Frontend**

- **Framework:** Next.js 14
- **Styling:** TailwindCSS + Custom CSS Glassmorphism
- **Animations:** Framer Motion & Three.js (Canvas)
- **Map Engine:** Leaflet (React-Leaflet)

**Backend**

- **Core:** Node.js + Express.js
- **Database:** PostgreSQL (via Prisma ORM)
- **Cache/Session:** Redis
- **Mailing:** Resend API

---

## 🚀 Getting Started

### Prerequisites

- Node.js & npm
- PostgreSQL
- Redis

### Installation

1. **Clone the Repository**
2. **Backend Setup**
   ```bash
   cd backend
   npm install
   npx prisma generate
   npm run dev
   ```
3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---

## 📋 Project Roadmap & Task List

### 1. Visual & UX DNA

- [x] Establish core theme: Forza Horizon + HTB + ROG (Cyber-Automotive)
- [x] Integrate primary typography (ROGBOLD) and color palette (Obsidian Black, Magenta, Golden Yellow)
- [x] Apply glassmorphism and sharp-cut UI components globally
- [x] Implement Motherboard Maze Grid (dynamic background grid with glowing sine-wave transitions)

### 2. Events System (Main Host: Kalceria)

- [x] Build `SeeEvent` UI with high-fidelity carousels, dynamic gradients, and Sticker Bomb aesthetics
- [x] Complete Database Integration (link session selection and registration to `Event` and `UserEvent` models)
- [x] Dynamic event listings fetching from the backend

### 3. Users Map & Telemetry

- [x] Implement tactical Leaflet-based SnapMap
- [x] Build Discord-style profile popups (online/offline status)
- [x] Add dynamic background atmospheric blobs and cinematic cloud-split loading sequence
- [x] Handle global modal rendering for offline users to bypass scroll clipping
- [x] Setup backend telemetry endpoints and Redis caching

### 4. Mini Events & Broadcasts

- [x] Define `MiniEvent` and `UserBroadcast` database schemas
- [x] Implement interactive map broadcasts (24h lifespan)
- [x] Map UI integration for broadcasts and ping events

### 5. Notification & Verification

- [x] Setup basic Cron worker architecture
- [x] Integrate Resend API for transactional emails
- [x] Implement Redis-backed OTP generation and caching
- [x] Build Auth Page with OTP verification flow blocking registration until verified

### 6. Kalceria Services (Shooting, EO, Host)

- [x] Develop `NeedUsForm` booking UI
- [x] Implement automated WA Pretext JSON conversion
- [x] Setup 7-day office hour (09:00-00:00) heartbeat/timekeeper logic

### 7. Admin Dashboard (Single Pane of Glass)

- [x] Build centralized administrative dashboard
- [x] Implement glassmorphism styling and dark mode components
- [x] Complete CRUD operations for Users, Events, and Service Bookings
- [x] Build CRUD modules for Merchandise (with Sold Out flags) and Media Posts

### 8. About Us & FAQ

- [x] Build the "Tokoh Pendiri" 3 Founders page with flipping letter animations
- [x] Implement vintage 90s TV spectrum effects
- [x] Develop the "Asus Zenfone 9 scale" Support Us section
