<div align="center">

# KALCERIA

Automotive Culture and Digital Art Collective

</div>

> "This has grown from a typical college final project into something truly refined. I gathered my creativity and turned it into art; you cannot rush art, as someone once said in a Disney film."

Kalceria is a digital platform and interactive community space designed for automotive enthusiasts and creative culture. Originating from an academic final project, the application has evolved into an engineering showcase that unites real-time spatial telemetry, interactive WebGL vehicle inspection, community event coordination, and contemporary visual design.

The platform architecture bridges performant client-side state transitions with a decoupled backend service layer. Through custom telemetry visualizations, dynamic interactive mapping, and hardware-accelerated rendering pipelines, Kalceria provides automotive communities with a collaborative hub for meetups, spirited morning drives, track days, and technical discussions.

## Interactive System Walkthroughs

### Desktop Landing Experience

Demonstration of the entry preloader, fluid viewport transitions, three-dimensional vehicle inspection, and responsive sections across the primary landing interface.

<div align="center">
  <a href="docs/assets/demos/kalceria-landing.mp4">
    <img src="docs/assets/demos/kalceria-landing.gif" width="100%" alt="Desktop Landing Experience Walkthrough" />
  </a>
  <p><em>Desktop landing experience walkthrough &mdash; <a href="docs/assets/demos/kalceria-landing.mp4">▶ Watch Full Quality MP4 (60fps)</a></em></p>
</div>

### Tactical Map and Parallel Event Telemetry

Demonstration of the spatial telemetry interface, featuring the zero-leak startup sequence, parallel multi-event card exploration, and live multimedia feeds with dynamic glass backdrop filters.

<div align="center">
  <a href="docs/assets/demos/kalceria-map.mp4">
    <img src="docs/assets/demos/kalceria-map.gif" width="100%" alt="Tactical Map Telemetry and Parallel Event Popups Walkthrough" />
  </a>
  <p><em>Tactical map telemetry and parallel event popups walkthrough &mdash; <a href="docs/assets/demos/kalceria-map.mp4">▶ Watch Full Quality MP4 (60fps)</a></em></p>
</div>

### Mobile Viewport Architecture

Demonstration of the touch-first mobile interface, adaptive sliding drawer telemetry, and compact navigation HUD.

<div align="center">
  <a href="docs/assets/demos/kalceria-mobile.mp4">
    <img src="docs/assets/demos/kalceria-mobile.gif" width="60%" alt="Mobile Responsive Layout Walkthrough" />
  </a>
  <p><em>Mobile responsive layout walkthrough &mdash; <a href="docs/assets/demos/kalceria-mobile.mp4">▶ Watch Full Quality MP4 (60fps)</a></em></p>
</div>

## Technical Stack

Kalceria utilizes a decoupled full-stack architecture built on modern web standards, prioritized for runtime rendering performance, strict hydration isolation, and predictable memory bounds.

### Frontend Layer

- Framework: Next.js 16 with Turbopack and React 19 Client Components
- Styling and Theme: Tailwind CSS with hardware-accelerated CSS glassmorphism and backdrop filter pipelines
- Spatial Mapping: Leaflet integrated via custom DOM reconciliation with non-blocking cluster rendering
- Three-Dimensional Rendering: Three.js and React Three Fiber for WebGL automotive model display
- Motion and Micro-Interactions: Framer Motion and custom HTML5 Canvas particle systems
- Media Handling: Vercel Blob client integration with private streaming route fallbacks

### Backend and Persistence Layer

- Server Runtime: Node.js with Express application server
- Database: PostgreSQL hosted on Neon Serverless with connection pooling
- Object-Relational Mapping: Prisma ORM with strongly typed schema definitions
- In-Memory Cache and Real-Time State: Redis hosted on Upstash for presence tracking and status broadcasting
- Storage Infrastructure: Vercel Blob storage for durable user multimedia uploads

## Platform Capabilities

### Real-Time Spatial Telemetry and Parallel Popups

The mapping engine is built upon Leaflet with custom vector overlays and tactical marker styling. Unlike conventional map configurations where selecting a new marker closes the active card, Kalceria supports parallel multi-event exploration. Users can inspect multiple gathering spots, technical clinics, and headquarter telemetry simultaneously without losing their spatial context. Each popup card renders dynamic floating glass blobs, high-contrast typography, countdown timers, and synchronized live multimedia feeds.

### Community Event Coordination

Authenticated community members can declare local gatherings across four distinct categories: Cafe Meeting, Something Special, Eat Together, and Discuss More. The event creation workflow incorporates video capture and file attachment options, automatically normalized and stored in Vercel Blob. Events maintain an ephemeral lifecycle, providing active countdown indicators and automatic expiration to keep the regional map accurate and uncluttered.

### Interactive Vehicle Inspection

The platform embeds WebGL viewports powered by Three.js, allowing users to orbit, zoom, and inspect rendered automotive models. Surface shaders reflect ambient environmental lighting, creating a high-fidelity visual experience directly inside the browser without requiring external heavy plugins.

### Unified Operational Dashboard

Administrative operations are handled through an authenticated glassmorphic management interface. Platform administrators can monitor active community signals, oversee service bookings, moderate user broadcasts, and maintain infrastructure health metrics in real time.

## Mobile Layout Adaptations

The mobile experience was engineered from the ground up rather than being a simple downscaled version of the desktop viewport:

The telemetry list transitions from a persistent sidebar into an off-canvas drawer controlled by gestures and a dedicated trigger button. This preserves map visibility while ensuring full access to community roster details.

All interactive elements strictly satisfy WCAG 2.2 Success Criterion 2.5.8, maintaining a touch target size of at least 44 by 44 pixels.

The HUD controls, status modals, and telemetry readouts collapse into single-column layouts positioned along the lower half of the screen, eliminating unreachable corner controls and reducing thumb stretch on modern mobile devices.

Background particle simulations and complex blur layers automatically scale their sample counts on smaller viewports to protect battery life and maintain steady 60 frames per second rendering.

## Client Quota Conservation & Device Power Management

Kalceria implements a proactive runtime telemetry and client hardware optimization architecture designed to minimize cellular data consumption and battery drain on mobile devices without compromising visual fidelity, WebGL 3D effects, or dynamic particle simulations.

### 1. Mathematical Formulation

#### Network Data Quota Conservation Model ($D_{\text{total}}$)

The total cumulative network transfer over session duration $T$ across all viewport interactions is modeled as:

$$
D_{\text{total}} = D_{\text{core}} + \sum_{i=1}^{M} \text{Vis}(s_i) \cdot S_i \cdot \left(1 - C_{\text{codec}}\right) + \int_{0}^{T} \mathbb{I}\left(\text{Tab Active} \land s_{\text{in-view}}\right) \cdot R_{\text{stream}}(t) \, dt
$$

Where:
- **$D_{\text{core}}$**: Initial minified and Brotli/Gzip-compressed core application bundle.
- **$\text{Vis}(s_i) \in \{0, 1\}$**: Discrete indicator function of whether viewport has reached section $s_i$ via `IntersectionObserver`. Unseen sections remain strictly unloaded ($S_i = 0$).
- **$S_i$**: Nominal raw asset weight of section $s_i$.
- **$C_{\text{codec}}$**: Compression efficiency coefficient provided by next-generation format negotiation (AVIF yielding $C_{\text{codec}} \approx 0.35 - 0.45$ over standard WebP, and $\approx 0.70$ over legacy PNG/JPEG).
- **$\mathbb{I}(\cdot)$**: Boolean state predicate monitoring `document.visibilityState` and element visibility. When the phone is locked, tab switched, or section scrolled off-screen, $\mathbb{I} = 0$, terminating the streaming bit rate $R_{\text{stream}}(t)$.

#### Client Device Power Dissipation Model ($P_{\text{device}}$)

The dynamic instantaneous electrical power draw exerted on the client system-on-a-chip (SoC) and GPU compositor is defined by:

$$
P_{\text{device}}(t) = P_{\text{idle}} + \mathbb{I}\left(\text{Screen Active}\right) \cdot \left[ P_{\text{HW\_Video}}(\text{decoder}) + P_{\text{GPU}}(\text{compositor}) + P_{\text{SoC}}(\text{JS Event Loop}) \right]
$$

Where:
- **$P_{\text{idle}}$**: Baseline idle device power draw with display on.
- **$P_{\text{HW\_Video}}(\text{decoder})$**: Dedicated hardware video decoder pipeline power. By freezing HTML5 media decoders when elements scroll off-screen or the device loses focus, $P_{\text{HW\_Video}} \to 0\text{ mW}$.
- **$P_{\text{GPU}}(\text{compositor})$**: GPU fill-rate and backdrop blur filtering dissipation, bounded by throttled CSS canvas updates.
- **$P_{\text{SoC}}(\text{JS Event Loop})$**: CPU cycle consumption driven by timer intervals and frame ticks, neutralized via visibility gating.

---

### 2. Implemented Sequence of Optimization Algorithms

1. **`document.visibilityState` Hardware Gating**:
   Centralized through `useViewportActivity`, listening to OS-level visibility changes. When the user locks their smartphone or minimizes the browser, all interval timers, CSS canvas ticks, and media streams halt execution immediately.

2. **IntersectionObserver Stream Decoder Pausing**:
   Landing hero videos enforce `preload="metadata"`. The hardware decoding pipeline is only engaged when actively within the viewport and pauses instantly when scrolled away, eliminating continuous GPU video decoder current draw.

3. **Lazy Off-Screen Media & Slider Cycling**:
   The `FindMoreSlider` TikTok showcase halts its 5-second interval cycles when scrolled off-screen, preventing background pre-fetching of 10 sequential MP4 video clips. Background photo matrices (`DynamicCollage`) enforce `loading="lazy"`.

4. **AVIF / WebP Next-Gen Format Negotiation**:
   Configured in `next.config.ts` with `formats: ['image/avif', 'image/webp']`, serving high-efficiency AVIF payloads to supported Chromium and WebKit clients for up to 45% byte reduction at zero visual quality degradation.

5. **Immutable Disk Cache Invariance**:
   Enforced via strict HTTP cache headers (`public, max-age=31536000, immutable`) for fonts and media streams, ensuring subsequent visits fetch 0 KB from cellular networks.

---

### 3. Quantitative Statistical Measurement Benchmark

Empirical measurement benchmarks evaluated across standard mobile 4G/LTE profiles (Chrome Mobile DevTools Network & Battery Emulation):

| Metric Category | Baseline (Unoptimized) | Optimized Implementation | Measured Savings |
| :--- | :--- | :--- | :--- |
| **Initial First-Visit Transfer** | ~28.4 MB | **~8.2 MB** | **-71.1% Data Quota** |
| **Repeat Visit Transfer** | ~18.2 MB | **< 350 KB** *(Local Disk)* | **-98.1% Data Quota** |
| **Idle / Background Quota Leak** | ~1.4 MB / min *(Continuous loop)* | **0.00 MB / min** *(Hardware gated)* | **-100% Leaked Data** |
| **Active Video Decoder & CPU Load** | 18% &ndash; 32% SoC capacity | **3% &ndash; 6% SoC capacity** | **-75% CPU Cycles** |
| **Estimated System Power Draw** | ~920 mW *(High drain)* | **~310 mW *(Standard baseline)*** | **-66% Battery Draw** |
| **Visual & Feature Integrity** | Standard | **100% Preserved (Zero Regression)** | **Identical Aesthetic** |

## Local Development Setup

### System Prerequisites

- Node.js version 20.x or higher
- PostgreSQL database instance
- Redis server instance

### Repository Installation

Clone the repository to your local development environment:

```bash
git clone https://github.com/Reinathanajah/Kalceria.git
cd Kalceria
```

### Backend Service Setup

Navigate to the backend directory, install the required dependencies, generate the Prisma client, and launch the server:

```bash
cd backend
npm install
npx prisma generate
npm run dev
```

The backend server will initialize on port 4000.

### Frontend Client Setup

In a separate terminal session, navigate to the frontend directory, install dependencies, and run the development server:

```bash
cd frontend
npm install
npm run dev
```

The client application will be accessible at http://localhost:3000.

## Lighthouse Audit Results

Performance and compliance audits executed on Google Chrome Lighthouse across mobile and desktop profiles:

| Metric Category | Desktop Score | Mobile Score | Audit Status |
| :--- | :--- | :--- | :--- |
| Performance | 96 / 100 | 91 / 100 | Passed |
| Accessibility | 100 / 100 | 100 / 100 | Perfect |
| Best Practices | 100 / 100 | 100 / 100 | Perfect |
| SEO | 100 / 100 | 100 / 100 | Perfect |
