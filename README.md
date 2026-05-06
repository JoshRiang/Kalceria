# Kalceria - High-Fidelity Automotive Community Platform

Kalceria is a "State of the Art" automotive community platform built with a visual DNA inspired by **Forza Horizon**, **Hack The Box (HTB)**, and **ROG Aggressiveness**. It features advanced telemetries, community event management, and a premium interactive user experience.

---

## 📊 Deep Project Analysis (Based on plan.txt)

This analysis compares the core objectives defined in `plan.txt` with the current implementation status.

### 1. Visual & UX DNA
*   **Theme:** Forza Horizon + HTB + ROG (Cyber-Automotive).
*   **Status:** ✅ **Implemented.** The typography (ROGBOLD), color palette (Obsidian Black, Magenta, Golden Yellow), and sharp-cut UI components are consistent.
*   **Missing:** ❌ **Motherboard Maze Grid.** The dynamic background grid (chip/maze style) with glowing sine-wave transitions (Yellow-Gold-Magenta) has not been implemented yet.

### 2. Events System (Main Host: Kalceria)
*   **Objective:** Dynamic event listings with registration sessions and automated email notifications.
*   **Status:** 🏗️ **In Progress (UI Complete).** `SeeEvent.jsx` features a high-fidelity carousel, dynamic gradients, and "Sticker Bomb" aesthetics.
*   **Missing:** ❌ **DB Integration.** The UI currently uses dummy `EVENT_DATA`. Need to link session selection and registration to the `Event` and `UserEvent` models in the backend.

### 3. Users Map & Telemetry (The "Juru Utama")
*   **Objective:** Real-time tracking of "Kalcerians nearby", reverse polling for HP location, and privacy-focused display (District level only).
*   **Status:** 🏗️ **Backend Foundation Ready.** Prisma schema includes `domicileLat`, `domicileLng`, and `allowLiveLocation`. Telemetry controller exists.
*   **Missing:** ❌ **Frontend Implementation.** No Google Maps integration or global zoom/rotate UI yet.
*   **Missing:** ❌ **Wide Column Store / Redis Polling.** The specific logic for "5x polling calculation before drop" to minimize memory usage needs to be finalized in the backend.

### 4. Mini Events & Broadcasts
*   **Objective:** Bubble dialogs on the map for informal user-hosted gatherings (24h lifespan).
*   **Status:** ✅ **Database Schema Ready.** `MiniEvent` and `UserBroadcast` tables are defined.
*   **Missing:** ❌ **Map Interaction.** The "Bubble with inner circle and plus sign" UI on the Map is pending.

### 5. Notification & Verification
*   **Objective:** "Hai Kalcerian!" email verification and event notifications.
*   **Status:** 🏗️ **In Progress.** `cronWorker.js` handles background jobs. `isEmailVerified` and `isSentEvent` flags are in the User model.
*   **Missing:** ❌ **Email Service.** Integration with an SMTP/Email provider (Nodemailer) and the actual pretext script are pending.

### 6. About Us & FAQ
*   **Objective:** 3 Founders ("Tokoh Pendiri") with flipping letter animations and vintage 90s TV spectrum effects.
*   **Status:** ❌ **Not Started.** The actual page and the "Asus Zenfone 9 scale" Support Us section are still in the planning phase.

### 7. Kalceria Services (Shooting, EO, Host)
*   **Objective:** Sequential booking form (Timekeeper: Max 7 days) and automated WA Pretext JSON conversion.
*   **Status:** ✅ **Frontend Form Ready.** `NeedUsForm` exists.
*   **Missing:** ❌ **WA Logic.** The conversion from JSON to a normalized WA Pretext and the 7-day office hour (09:00-00:00) heartbeat logic need implementation.

### 8. Admin Dashboard (Single Pane of Glass)
*   **Objective:** CRUD for Events, Merch (with Sold Out flags), and Media Posts.
*   **Status:** ❌ **Not Started.** The entire Administrative UI is pending.

---

## ✅ Summary of Current Implementation

### Frontend (Next.js 14)
- [x] **Intro Preloader:** Gear animation + Canvas Phoenix burst + Skip logic.
- [x] **Landing Page:** Hero Video, SVG Wave Masking, Animated Mascot.
- [x] **See Event:** Cinematic panning, dynamic gradients, Sticker Bomb visual style.
- [x] **Auth:** Login/Register flow + Welcome Transition.

### Backend (Express + Prisma)
- [x] **Architecture:** Monorepo-ready structure.
- [x] **Models:** Users, Events, Bookings, Merch, Media, Broadcasts.
- [x] **Security:** Password hashing, JWT token logic.
- [x] **Workers:** Basic Cron worker setup.

---

## 🛠️ Getting Started

### Prerequisites
- Node.js & npm
- PostgreSQL (for the main DB)
- Redis (for session/token flexibility)

### Installation
1.  **Clone the Repo**
2.  **Backend Setup**
    ```bash
    cd backend
    npm install
    npx prisma generate
    npm run dev
    ```
3.  **Frontend Setup**
    ```bash
    cd frontend
    npm install
    npm run dev
    ```
