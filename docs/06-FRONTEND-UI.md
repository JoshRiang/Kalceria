# Frontend: UI Components & Design System

Arsitektur frontend dengan animasi, tema, dan komponen interaktif.

---

## 🎨 Design DNA

**Tema**: Forza Horizon + Hack The Box (HTB) + ROG Aggressiveness

### Color Palette

```
Primary:
- Obsidian Black: #0a0e27
- Deep Black: #000000

Accent:
- Neon Magenta: #ff006e
- Golden Yellow: #ffd60a
- Gold: #ffc300

Secondary:
- Dark Gray: #2a2d42
- Light Gray: #8896aa
- White: #ffffff
```

### Typography

- **Headers**: ROGBOLD (or similar aggressive sans-serif)
- **Body**: Inter, Roboto
- **Monospace**: JetBrains Mono

### Visual Elements

- Sharp-cut UI corners (minimal rounded)
- Grid backgrounds (motherboard/chip maze style)
- Glow effects (neon colors)
- Sine-wave smooth transitions

---

## 🏠 Landing Page Layout

### 1. Intro Animation (Entry Point)

**Background**: Black (#0a0e27)

**Sequence**:

```
1. Fade in: Kalceria logo
   - Duration: 500ms fade-in
   - Timing: Analyze background color for smooth transition
   - Font: ROGBOLD, large size

2. After 2s delay: Fire particle effect
   - From: Bottom-left corner
   - To: Toward Kalceria logo
   - Style: Semi-transparent sparks (not covering logo)
   - Duration: 3s
   - Library: Three.js or custom Canvas

3. After 3s: Subtitle fade-in
   - Text: "Coki Anyway" (placeholder)
   - Speed: 1.25x fade-in
   - Position: Below logo

4. After 4s: Gears animation
   - Structure: 3 gears in golden ratio
     └─ Gear 1: Largest
     └─ Gear 2: Medium
     └─ Gear 3: Smallest
   - Animation: Rotate continuously
   - Trigger: Rotation continues until backend loaded
   - Color: Golden Yellow with glow

5. Trigger condition: Backend ready (boolean)
   - Poll API health: /api/health
   - On success: Mark backend as loaded
   - Gears stop rotating
   - Fade to main landing page
```

**Code Structure**:

```typescript
// components/IntroAnimation.tsx
export default function IntroAnimation() {
  const [backendReady, setBackendReady] = useState(false);

  useEffect(() => {
    // Check backend health
    fetch('/api/health')
      .then(() => setBackendReady(true))
      .catch(console.error);
  }, []);

  return (
    <div className="intro-container">
      <Logo className="fade-in" />
      <FireParticles />
      <Subtitle delay={3000} />
      <GearAnimation isLoading={!backendReady} />
    </div>
  );
}
```

---

### 2. Main Landing Page

**Navigation Bar** (Top):

```
Kalceria Logo | Home | Events | Merch | About | Support | [Login/Profile]
```

**Hero Section**:

- Background: Video (automotive theme)
- Text overlay: "Welcome to Kalceria Community"
- CTA buttons: [Join Now] [Explore Events]

**Featured Events Section**:

- Grid of recent events
- Each card: Image, title, date, "Register" button

**Get to Know Us Button**:

- Large CTA button
- Text: "Get to Know Us!"
- Action: Redirect to `/about` with animation
- Animation: Smooth fade-out landing page → fade-in about page

---

### 3. Merchandise Section

**Grid Layout**: Zigzag pattern, alternating left-right

```
┌─────────────────────────────────────────┐
│  [Image]  Description                   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Description  [Image]                   │
└─────────────────────────────────────────┘

(Pattern repeats)
```

**Merch Card Features**:

- Product image (background: white)
- Product name & short description
- Auto-rotation: Fade in/out every 5 seconds
- Display logic: 4 cards max per cycle
  - Random shuffle (not seeded) from latest 7 days
  - Backend NullIt function: Reset IsPilch flag after cycle

**Bottom Section**:

```
[Tokopedia Logo] [Shopee Logo]
Tokopedia - Kalcero  Shopee - Kalces

Logo hover effect:
- Gray → Colored
- Scale: 1 → 1.1
- Smooth transition
```

**Background**: Dark mode (gray-to-black gradient)

**Dynamic Element**: Motherboard maze grid

```
- 6 grid elements positioned at:
  ├─ Top edge center
  ├─ Photo card 1 background
  ├─ Bottom-left corner
  ├─ Photo card 2 background
  ├─ Photo card 4 background
  └─ Footer area

- Color animation: Kuning → Emas → Magenta → Emas → Kuning
- Effect: Glow on grid lines
- Animation: Sine-wave smooth, timer-based
- 3D grid effect with perspective
```

---

### 4. Support Us Section

**Layout**: Mini HP (phone mockup) + Social feed

**Title**: "Support Us!"

- Font: HTB-style firm subtitle
- Animation: Typing effect
  ```
  1. Type forward: T→y→p→e→s→u→p→p→o→r→t→U→s→!
  2. Stay 3 seconds
  3. Backspace all characters
  4. Loop forever
  ```

**Phone Mockup**:

- Device frame: iPhone-like no background
- Screen: Video feed (TikTok/Instagram Reels)
- Video sources: 5+ videos from Coki/Reyhan Batara
- Auto-scroll: After 1s before video ends
  └─ Scroll to next video
- Scroll animation: "Road arrow sign" pointing up
  └─ Transparent, white-ish color
  └─ Animated upward during scroll

**Social Icons**:

```
[TikTok Logo] [Instagram Logo]
(Gray when idle, colored on hover)

On hover:
- logo_tiktokabu.png → logo_tiktokterang.png
- logo_igrabu.png → logo_igterang.png
- Scale & glow effect
```

**Click Action**:

- TikTok: Open @kalceria TikTok profile
- Instagram: Open @kalceria Instagram profile

---

### 5. About Us Page

**Page Title**: "About Us!"

- Animation: Letter flipping
  ```
  Each letter flips (3D rotate) in sequence
  A → B → O → U → T → U → S → !
  Until all letters settled
  ```

**Founder Photos**:

- Background: Founder photo (spectrum: gold, yellow, magenta overlay)
- Text overlay: Founder descriptions
- Layout: 3 founder cards (one per founder)
  - Horizontal layout with descriptions

**FAQ Section**:

- Background: Dark mode (gray to black)
- Questions:
  1. "What is Kalceria?"
  2. "Who is Reyhan Batara?"
  3. "Where is Kalceria HQ?" (Fresh Market Bintaro)

- Dropdown/Accordion UI:
  - Click Q → Show answer
  - Answer: Title + description text
  - Photo card auto-rotates (3 photos per Q, changes every 3s)
  - Caption updates with photo

---

### 6. Login Page

**Background**: Video rotation

- Multiple videos: video_login1.mp4, video_login2.mp4, etc.
- Auto-transition: Smooth fade between videos
- Timer: Each video ~5-10 seconds

**Form**: Center overlay

- Email input
- Password input
- [Login] button
- Link: "Forgot password?" | "Sign up"

**Theme**: Professional Microsoft-style

- Not gaming-style
- Clean, minimal
- Dark theme with accent colors

---

## 🎬 Animation Library

### Framer Motion Setup

```typescript
// components/animations.tsx
import { motion } from "framer-motion";

// Fade in animation
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.5 },
};

// Type writer animation
export const typewriter = {
  initial: { scaleX: 0 },
  animate: { scaleX: 1 },
  transition: { duration: 0.1 },
};

// Rotating gears
export const rotate = {
  animate: { rotate: 360 },
  transition: { duration: 4, repeat: Infinity, linear: true },
};
```

---

## 🔌 Component Structure

```
components/
├── IntroPreloader.jsx      (Intro + gears)
├── LandingPage.jsx         (Main landing)
├── MerchShowcase.jsx       (Merch grid + rotation)
├── AboutUs.jsx             (Founders + FAQ)
├── AuthPage.jsx            (Login + signup + OTP Verify)
├── SnapMap.jsx             (Users map via Leaflet)
├── SeeEvent.jsx            (Event listing)
├── NeedUsForm.jsx          (Shooting booking)
├── map/
│   ├── UserPopup.jsx       (Discord-style profile)
│   └── UserIcon.jsx
└── ui/
    ├── Input.jsx
    └── Button.jsx
```

---

## 🖼️ Asset Requirements

```
public/
├── images/
│   ├── logo-kalceria.png
│   ├── merch_1.jpg to merch_N.jpg
│   ├── event_poster_1.jpg to N
│   ├── founders-photo.jpg
│   ├── FAQ-photo-1.jpg to 6
│   ├── hp-device-frame.png (no background)
│   ├── logo-tokopedia.png (gray & colored)
│   ├── logo-shopee.png (gray & colored)
│   ├── logo-tiktok-abu.png (gray)
│   ├── logo-tiktok-terang.png (colored)
│   ├── logo-ig-abu.png (gray)
│   └── logo-ig-terang.png (colored)
├── videos/
│   ├── video_login1.mp4 to N
│   ├── video_support1.mp4 to N (Reels)
│   └── background_hero.mp4
└── fonts/
    ├── ROGBOLD.ttf
    └── others...
```

---

## 🎯 Performance Optimizations

- **Image optimization**: Next.js Image component
- **Lazy loading**: Intersection Observer for off-screen components
- **Code splitting**: Dynamic imports for heavy components (e.g. Leaflet)
- **Video optimization**: Preload + WebM format
- **Animation perf**: Use transform/opacity only (GPU accelerated)
- **Hydration Safety**: Defer all randomized rendering (`Math.random()`, dynamic DOM nodes) to client-side `useEffect` hooks to prevent React HTML hydration mismatches.

---

## 📱 Responsive Design

- Mobile-first approach
- Breakpoints: 640px (sm), 768px (md), 1024px (lg), 1280px (xl)
- Touch-friendly buttons (min 44px)
- Font scaling for readability

---

## 🔗 Page Routing

```
/                  → Landing page
/login             → Login/signup
/events            → Events listing
/events/:id        → Event details
/events/:id/register → Registration form
/merch             → Merchandise
/map               → Users map
/about             → About + FAQ
/profile           → User profile
/admin             → Admin dashboard
/admin/events      → Admin event management
/admin/merch       → Admin merch management
/admin/bookings    → Admin service bookings
```

---

## 🚀 Future Enhancements

- [ ] Dark/Light theme toggle
- [ ] Accessibility improvements (WCAG 2.1 AA)
- [ ] Progressive Web App (PWA) support
- [ ] Offline mode
- [ ] Real-time chat (socket.io)
- [ ] Payment UI integration (Stripe/SNAP)
- [ ] Advanced filters on events/merch
- [ ] User notifications panel
