/**
 * Pure Nous Research Hermes-inspired continuous dual-rail closed-loop wire routing engine.
 * Two parallel continuous curves start at Point A (behind Artifact 1), weave smoothly
 * behind every artifact in clockwise perimeter order (1 -> 2 -> 3 -> 4 -> 5 -> Point A),
 * and close seamlessly back at Point A with C1 tangent continuity and ZERO endpoint dots.
 * Responsive across all device families (mobile, tablet/iPad, half-desktop, desktop, landscape).
 */

function fmt(n) {
  return Number(n).toFixed(1);
}

function centerOf(slot) {
  return {
    x: slot.leftPx + slot.widthPx * 0.5,
    y: slot.topPx + slot.heightPx * 0.5,
  };
}

/**
 * Computes C1-continuous closed cubic Bezier segments through a cyclic ring of points
 * using Catmull-Rom spline conversion, offset slightly outward/inward from the centroid
 * so two distinct parallel closed loops orbit behind all 5 artifacts and return to Point A.
 */
function buildClosedLoopSegments(points, centroid, radialOffsetPx, tension = 0.28) {
  const n = points.length;
  if (n < 3) return [];

  const offsetPts = points.map((p) => {
    const dx = p.x - centroid.x;
    const dy = p.y - centroid.y;
    const len = Math.hypot(dx, dy) || 1;
    return {
      x: p.x + (dx / len) * radialOffsetPx,
      y: p.y + (dy / len) * radialOffsetPx,
    };
  });

  const segments = [];
  for (let i = 0; i < n; i++) {
    const pPrev = offsetPts[(i - 1 + n) % n];
    const p0 = offsetPts[i];
    const p1 = offsetPts[(i + 1) % n];
    const pNext = offsetPts[(i + 2) % n];

    const c1 = {
      x: p0.x + (p1.x - pPrev.x) * tension,
      y: p0.y + (p1.y - pPrev.y) * tension,
    };
    const c2 = {
      x: p1.x - (pNext.x - p0.x) * tension,
      y: p1.y - (pNext.y - p0.y) * tension,
    };

    segments.push({
      segment: i + 1,
      d: `M ${fmt(p0.x)} ${fmt(p0.y)} C ${fmt(c1.x)} ${fmt(c1.y)}, ${fmt(c2.x)} ${fmt(c2.y)}, ${fmt(p1.x)} ${fmt(p1.y)}`,
    });
  }
  return segments;
}

// 5 crisp sequential step delays so the dual closed circuit traces from Point A back to Point A
const SEGMENT_DELAYS = {
  1: 0.42,
  2: 0.76,
  3: 1.1,
  4: 1.44,
  5: 1.78,
};

/**
 * Generates two unbroken, C1-continuous closed loops passing behind all 5 Minigame artifacts
 * across 5 ordered segments (`segment: 1..5`). Always returns `junctions: []` (zero endpoint dots).
 */
export function buildHermesWireGraph(slots, viewportWidth, viewportHeight) {
  const byId = {};
  for (const s of slots || []) byId[s.id] = s;
  const { book, compass, lantern, globe, cards } = byId;
  if (!book || !compass || !lantern || !globe || !cards) {
    return { wires: [], junctions: [] };
  }

  const W = Math.max(320, Number(viewportWidth) || 1280);
  const H = Math.max(320, Number(viewportHeight) || 720);
  const profile = slots[0]?.profile || "desktop";
  const isPortrait = profile === "mobile" || profile === "tablet";

  // Ordered clockwise ring starting at Point A and closing seamlessly back at Point A
  const ringSlots = isPortrait
    ? [book, compass, globe, cards, lantern]
    : [lantern, globe, compass, cards, book];

  const centers = ringSlots.map(centerOf);
  const centroid = {
    x: centers.reduce((acc, p) => acc + p.x, 0) / centers.length,
    y: centers.reduce((acc, p) => acc + p.y, 0) / centers.length,
  };

  // Scale rail separation proportionally to viewport so dual loops stay crisp across HP, iPad, Half, and Desktop
  const minDim = Math.min(W, H);
  const outerOffset = Math.max(7, Math.min(20, minDim * 0.018));
  const innerOffset = -Math.max(7, Math.min(20, minDim * 0.018));
  const tension = isPortrait ? 0.25 : 0.27;

  const railOuter = buildClosedLoopSegments(centers, centroid, outerOffset, tension);
  const railInner = buildClosedLoopSegments(centers, centroid, innerOffset, tension);

  const prefix = isPortrait ? "p" : "d";
  const wires = [];

  for (let i = 0; i < 5; i++) {
    const segNum = i + 1;
    const baseDelay = SEGMENT_DELAYS[segNum];
    wires.push({
      id: `${prefix}-seg${segNum}-main`,
      segment: segNum,
      rail: "outer",
      d: railOuter[i].d,
      weight: isPortrait ? 1.2 : 1.3,
      tone: segNum % 2 === 1 ? "A" : "B",
      delay: baseDelay,
    });
    wires.push({
      id: `${prefix}-seg${segNum}-echo`,
      segment: segNum,
      rail: "inner",
      d: railInner[i].d,
      weight: 0.85,
      tone: segNum % 2 === 1 ? "B" : "A",
      delay: Number((baseDelay + 0.07).toFixed(2)),
    });
  }

  return { wires, junctions: [] };
}
