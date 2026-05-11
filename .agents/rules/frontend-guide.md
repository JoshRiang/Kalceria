---
trigger: always_on
---

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

## 🎯 Performance Optimizations

- **Image optimization**: Next.js Image component
- **Lazy loading**: Intersection Observer for off-screen components
- **Code splitting**: Dynamic imports for heavy components
- **Video optimization**: Preload + WebM format
- **Animation perf**: Use transform/opacity only (GPU accelerated)

