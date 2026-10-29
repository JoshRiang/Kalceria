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
  <video src="docs/assets/demos/kalceria-landing.mp4" width="100%" controls playsinline></video>
  <p><em>Desktop landing experience walkthrough</em></p>
</div>

### Tactical Map and Parallel Event Telemetry

Demonstration of the spatial telemetry interface, featuring the zero-leak startup sequence, parallel multi-event card exploration, and live multimedia feeds with dynamic glass backdrop filters.

<div align="center">
  <video src="docs/assets/demos/kalceria-map.mp4" width="100%" controls playsinline></video>
  <p><em>Tactical map telemetry and parallel event popups walkthrough</em></p>
</div>

### Mobile Viewport Architecture

Demonstration of the touch-first mobile interface, adaptive sliding drawer telemetry, and compact navigation HUD.

<div align="center">
  <video src="docs/assets/demos/kalceria-mobile.mp4" width="60%" controls playsinline></video>
  <p><em>Mobile responsive layout walkthrough</em></p>
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
