/**
 * Pure Responsive Device-Family Selector & Minigame 5-Element Non-Overlapping Layout Engine.
 * Supports ALL device families:
 * - mobile (portrait HP: 360x640 .. 480x932)
 * - mobile-landscape (landscape HP: 667x375 .. 896x414)
 * - tablet (portrait iPad / Fold / tall Half-Desktop: 640x900 .. 1024x1366)
 * - half (landscape iPad / Half-Desktop / small laptop: 768x600 .. 1279x900)
 * - desktop (standard laptop, Full HD, QHD, ultrawide: >= 1280px landscape)
 *
 * Zero React/DOM/alias dependencies so it executes natively in both Next.js and Node --test.
 */

export const DEFAULT_MINIGAME_ASPECTS = {
  book: 1.42,
  compass: 1.0,
  lantern: 0.62,
  globe: 0.8,
  cards: 1.22,
};

/**
 * Resolves the canonical 4-family background bucket for SeeJourney & Minigame base layers:
 * 'mobile' | 'tablet' | 'half' | 'desktop'
 */
export function resolveResponsiveBgFamily(viewportWidth, viewportHeight) {
  const w = Math.max(320, Number(viewportWidth) || 1280);
  const h = Math.max(320, Number(viewportHeight) || 720);
  const aspect = w / h;

  // Landscape mobile (e.g. 844x390) uses widescreen framing so horizon isn't clipped vertically
  if (h < 540 && aspect >= 1.35) {
    return "desktop";
  }

  // Wide Desktop (>= 1280px landscape)
  if (w >= 1280 && aspect >= 1.2) {
    return "desktop";
  }

  // Landscape Tablet / iPad Pro Landscape / Half-Desktop (aspect >= 1.12)
  if (w >= 640 && aspect >= 1.12) {
    return "half";
  }

  // Portrait Tablet / iPad Portrait / Fold / Tall Half-Desktop (640px+ or near-square)
  if (w >= 640 || aspect >= 0.72) {
    return "tablet";
  }

  // Portrait Phone (HP: 360-639px, aspect < 0.72)
  return "mobile";
}

/**
 * Detailed Minigame layout profile including compact landscape mobile protection.
 */
export function resolveMinigameLayoutProfile(viewportWidth, viewportHeight) {
  const w = Math.max(320, Number(viewportWidth) || 1280);
  const h = Math.max(320, Number(viewportHeight) || 720);
  const aspect = w / h;

  if (h < 540 && aspect >= 1.15) return "mobile-landscape";
  if (w >= 1280 && aspect >= 1.15) return "desktop";
  if (w >= 640 && aspect >= 1.12) return "half";
  if (w >= 640 || aspect >= 0.72) return "tablet";
  return "mobile";
}

const SLOT_SPECS_BY_PROFILE = {
  mobile: [
    { id: "book", alignX: "left", xFrac: 0.025, alignY: "top", yFrac: 0.022, maxWFrac: 0.34, maxHFrac: 0.165, rotateDeg: -6 },
    { id: "compass", alignX: "right", xFrac: 0.975, alignY: "top", yFrac: 0.022, maxWFrac: 0.27, maxHFrac: 0.165, rotateDeg: 4 },
    { id: "lantern", alignX: "left", xFrac: 0.025, alignY: "top", yFrac: 0.56, maxWFrac: 0.215, maxHFrac: 0.2, rotateDeg: 4 },
    { id: "globe", alignX: "right", xFrac: 0.975, alignY: "top", yFrac: 0.56, maxWFrac: 0.235, maxHFrac: 0.195, rotateDeg: -3 },
    { id: "cards", alignX: "center", xFrac: 0.5, alignY: "bottom", yFrac: 0.982, maxWFrac: 0.43, maxHFrac: 0.205, rotateDeg: 0 },
  ],
  tablet: [
    { id: "book", alignX: "left", xFrac: 0.03, alignY: "top", yFrac: 0.028, maxWFrac: 0.27, maxHFrac: 0.195, rotateDeg: -6 },
    { id: "compass", alignX: "right", xFrac: 0.97, alignY: "top", yFrac: 0.028, maxWFrac: 0.21, maxHFrac: 0.195, rotateDeg: 4 },
    { id: "lantern", alignX: "left", xFrac: 0.03, alignY: "top", yFrac: 0.54, maxWFrac: 0.165, maxHFrac: 0.235, rotateDeg: 4 },
    { id: "globe", alignX: "right", xFrac: 0.97, alignY: "top", yFrac: 0.54, maxWFrac: 0.195, maxHFrac: 0.225, rotateDeg: -3 },
    { id: "cards", alignX: "center", xFrac: 0.5, alignY: "bottom", yFrac: 0.978, maxWFrac: 0.34, maxHFrac: 0.235, rotateDeg: 0 },
  ],
  "mobile-landscape": [
    { id: "lantern", alignX: "left", xFrac: 0.02, alignY: "top", yFrac: 0.04, maxWFrac: 0.12, maxHFrac: 0.37, rotateDeg: 4 },
    { id: "globe", alignX: "right", xFrac: 0.98, alignY: "top", yFrac: 0.04, maxWFrac: 0.14, maxHFrac: 0.37, rotateDeg: -3 },
    { id: "book", alignX: "left", xFrac: 0.025, alignY: "bottom", yFrac: 0.96, maxWFrac: 0.18, maxHFrac: 0.34, rotateDeg: -5 },
    { id: "compass", alignX: "right", xFrac: 0.975, alignY: "bottom", yFrac: 0.84, maxWFrac: 0.13, maxHFrac: 0.34, rotateDeg: 4 },
    { id: "cards", alignX: "center", xFrac: 0.5, alignY: "bottom", yFrac: 0.98, maxWFrac: 0.2, maxHFrac: 0.34, rotateDeg: 0 },
  ],
  half: [
    { id: "lantern", alignX: "left", xFrac: 0.028, alignY: "top", yFrac: 0.04, maxWFrac: 0.155, maxHFrac: 0.355, rotateDeg: 4 },
    { id: "globe", alignX: "right", xFrac: 0.972, alignY: "top", yFrac: 0.04, maxWFrac: 0.175, maxHFrac: 0.345, rotateDeg: -3 },
    { id: "book", alignX: "left", xFrac: 0.025, alignY: "bottom", yFrac: 0.96, maxWFrac: 0.23, maxHFrac: 0.32, rotateDeg: -5 },
    { id: "compass", alignX: "right", xFrac: 0.975, alignY: "bottom", yFrac: 0.875, maxWFrac: 0.185, maxHFrac: 0.31, rotateDeg: 4 },
    { id: "cards", alignX: "center", xFrac: 0.5, alignY: "bottom", yFrac: 0.978, maxWFrac: 0.275, maxHFrac: 0.315, rotateDeg: 0 },
  ],
  desktop: [
    { id: "lantern", alignX: "left", xFrac: 0.03, alignY: "top", yFrac: 0.045, maxWFrac: 0.145, maxHFrac: 0.375, rotateDeg: 4 },
    { id: "globe", alignX: "right", xFrac: 0.97, alignY: "top", yFrac: 0.045, maxWFrac: 0.165, maxHFrac: 0.365, rotateDeg: -3 },
    { id: "book", alignX: "left", xFrac: 0.025, alignY: "bottom", yFrac: 0.965, maxWFrac: 0.225, maxHFrac: 0.345, rotateDeg: -5 },
    { id: "compass", alignX: "right", xFrac: 0.975, alignY: "bottom", yFrac: 0.875, maxWFrac: 0.175, maxHFrac: 0.335, rotateDeg: 4 },
    { id: "cards", alignX: "center", xFrac: 0.5, alignY: "bottom", yFrac: 0.982, maxWFrac: 0.265, maxHFrac: 0.345, rotateDeg: 0 },
  ],
};

/**
 * Computes exact pixel and percentage bounding boxes for all 5 Minigame background elements
 * (including their organic dotted boundary rings) for any viewport size.
 */
export function computeMinigameElementSlots(
  viewportWidth,
  viewportHeight,
  aspects = DEFAULT_MINIGAME_ASPECTS
) {
  const w = Math.max(320, Number(viewportWidth) || 1280);
  const h = Math.max(320, Number(viewportHeight) || 720);
  const profile = resolveMinigameLayoutProfile(w, h);
  const specs = SLOT_SPECS_BY_PROFILE[profile] || SLOT_SPECS_BY_PROFILE.desktop;

  return specs.map((spec) => {
    const ar = Number(aspects?.[spec.id]) || DEFAULT_MINIGAME_ASPECTS[spec.id] || 1;
    const boxW = Math.min(w * spec.maxWFrac, h * spec.maxHFrac * ar);
    const boxH = boxW / ar;

    let leftPx = 0;
    if (spec.alignX === "left") leftPx = w * spec.xFrac;
    else if (spec.alignX === "right") leftPx = w * spec.xFrac - boxW;
    else leftPx = w * spec.xFrac - boxW / 2;

    let topPx = 0;
    if (spec.alignY === "top") topPx = h * spec.yFrac;
    else if (spec.alignY === "bottom") topPx = h * spec.yFrac - boxH;
    else topPx = h * spec.yFrac - boxH / 2;

    // Clamp cleanly inside viewport bounds with small safe margin so dots never clip at edge
    const safePad = Math.max(4, Math.min(10, Math.min(w, h) * 0.01));
    leftPx = Math.max(safePad, Math.min(w - boxW - safePad, leftPx));
    topPx = Math.max(safePad, Math.min(h - boxH - safePad, topPx));

    return {
      id: spec.id,
      profile,
      leftPx,
      topPx,
      widthPx: boxW,
      heightPx: boxH,
      leftPct: (leftPx / w) * 100,
      topPct: (topPx / h) * 100,
      widthPct: (boxW / w) * 100,
      heightPct: (boxH / h) * 100,
      rotateDeg: spec.rotateDeg,
    };
  });
}

/**
 * Pure geometry check: verifies that no two Minigame element slots overlap on a given viewport.
 */
export function hasAnySlotOverlap(slots, minGapPx = 0) {
  for (let i = 0; i < slots.length; i++) {
    const a = slots[i];
    for (let j = i + 1; j < slots.length; j++) {
      const b = slots[j];
      const horizOverlap = a.leftPx < b.leftPx + b.widthPx + minGapPx && a.leftPx + a.widthPx + minGapPx > b.leftPx;
      const vertOverlap = a.topPx < b.topPx + b.heightPx + minGapPx && a.topPx + a.heightPx + minGapPx > b.topPx;
      if (horizOverlap && vertOverlap) return true;
    }
  }
  return false;
}

