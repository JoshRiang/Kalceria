/**
 * Pure Nous Research Hermes-inspired continuous architectural wire routing engine.
 * Connects all 5 Minigame artifacts in 5 distinct sequential loop segments (1 -> 2 -> 3 -> 4 -> 5)
 * tailored per device family (mobile, tablet/iPad, half-desktop, desktop, landscape).
 * Strictly continuous curves only — zero slop (+, -, stray particles).
 */

function edgePoint(slot, rx, ry) {
  return {
    x: slot.leftPx + slot.widthPx * rx,
    y: slot.topPx + slot.heightPx * ry,
  };
}

function fmt(n) {
  return Number(n).toFixed(1);
}

function quad(p0, c, p1) {
  return `M ${fmt(p0.x)} ${fmt(p0.y)} Q ${fmt(c.x)} ${fmt(c.y)} ${fmt(p1.x)} ${fmt(p1.y)}`;
}

function cubic(p0, c1, c2, p1) {
  return `M ${fmt(p0.x)} ${fmt(p0.y)} C ${fmt(c1.x)} ${fmt(c1.y)}, ${fmt(c2.x)} ${fmt(c2.y)}, ${fmt(p1.x)} ${fmt(p1.y)}`;
}

// 5 sequential step delays so each inter-element segment draws in cleanly one after another
const SEGMENT_DELAYS = {
  1: 0.85,
  2: 1.32,
  3: 1.79,
  4: 2.26,
  5: 2.73,
};

/**
 * Generates clean, continuous Hermes routing wires connecting the 5 artifact slots
 * across 5 ordered segments (`segment: 1..5`).
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

  const wires = [];
  const junctions = [];

  if (isPortrait) {
    // 5-segment closed clockwise circuit (HP & iPad Portrait):
    // Seg 1: Book -> Compass | Seg 2: Compass -> Globe | Seg 3: Globe -> Cards | Seg 4: Cards -> Lantern | Seg 5: Lantern -> Book
    const bR = edgePoint(book, 0.96, 0.48);
    const bB = edgePoint(book, 0.42, 0.96);
    const cL = edgePoint(compass, 0.04, 0.48);
    const cB = edgePoint(compass, 0.58, 0.96);
    const lT = edgePoint(lantern, 0.46, 0.04);
    const lB = edgePoint(lantern, 0.62, 0.96);
    const gT = edgePoint(globe, 0.54, 0.04);
    const gB = edgePoint(globe, 0.38, 0.96);
    const kL = edgePoint(cards, 0.06, 0.54);
    const kR = edgePoint(cards, 0.94, 0.54);

    // Segment 1: Book -> Compass
    wires.push({
      id: "p-seg1-main",
      segment: 1,
      d: quad(bR, { x: W * 0.5, y: Math.max(6, Math.min(bR.y, cL.y) - H * 0.024) }, cL),
      weight: 1.25,
      tone: "A",
      delay: SEGMENT_DELAYS[1],
    });
    wires.push({
      id: "p-seg1-echo",
      segment: 1,
      d: quad(
        edgePoint(book, 0.94, 0.62),
        { x: W * 0.5, y: Math.max(12, Math.min(bR.y, cL.y) - H * 0.008) },
        edgePoint(compass, 0.06, 0.62)
      ),
      weight: 0.75,
      tone: "B",
      delay: SEGMENT_DELAYS[1] + 0.08,
    });

    // Segment 2: Compass -> Globe
    wires.push({
      id: "p-seg2-main",
      segment: 2,
      d: cubic(
        cB,
        { x: Math.min(W - 6, cB.x + W * 0.06), y: cB.y + (gT.y - cB.y) * 0.32 },
        { x: Math.min(W - 6, gT.x + W * 0.05), y: cB.y + (gT.y - cB.y) * 0.7 },
        gT
      ),
      weight: 1.25,
      tone: "B",
      delay: SEGMENT_DELAYS[2],
    });
    wires.push({
      id: "p-seg2-echo",
      segment: 2,
      d: cubic(
        edgePoint(compass, 0.44, 0.96),
        { x: cB.x - W * 0.02, y: cB.y + (gT.y - cB.y) * 0.35 },
        { x: gT.x - W * 0.03, y: cB.y + (gT.y - cB.y) * 0.68 },
        edgePoint(globe, 0.38, 0.06)
      ),
      weight: 0.75,
      tone: "A",
      delay: SEGMENT_DELAYS[2] + 0.08,
    });

    // Segment 3: Globe -> Cards
    wires.push({
      id: "p-seg3-main",
      segment: 3,
      d: quad(gB, { x: gB.x - (gB.x - kR.x) * 0.25, y: kR.y + H * 0.02 }, kR),
      weight: 1.25,
      tone: "B",
      delay: SEGMENT_DELAYS[3],
    });
    wires.push({
      id: "p-seg3-echo",
      segment: 3,
      d: quad(
        edgePoint(globe, 0.26, 0.92),
        { x: gB.x - (gB.x - kR.x) * 0.4, y: kR.y - H * 0.015 },
        edgePoint(cards, 0.92, 0.42)
      ),
      weight: 0.75,
      tone: "A",
      delay: SEGMENT_DELAYS[3] + 0.08,
    });

    // Segment 4: Cards -> Lantern
    wires.push({
      id: "p-seg4-main",
      segment: 4,
      d: quad(kL, { x: lB.x + (kL.x - lB.x) * 0.25, y: kL.y + H * 0.02 }, lB),
      weight: 1.25,
      tone: "A",
      delay: SEGMENT_DELAYS[4],
    });
    wires.push({
      id: "p-seg4-echo",
      segment: 4,
      d: quad(
        edgePoint(cards, 0.08, 0.42),
        { x: lB.x + (kL.x - lB.x) * 0.4, y: kL.y - H * 0.015 },
        edgePoint(lantern, 0.74, 0.92)
      ),
      weight: 0.75,
      tone: "B",
      delay: SEGMENT_DELAYS[4] + 0.08,
    });

    // Segment 5: Lantern -> Book (closes the 5-segment circuit)
    wires.push({
      id: "p-seg5-main",
      segment: 5,
      d: cubic(
        lT,
        { x: Math.max(6, lT.x - W * 0.05), y: bB.y + (lT.y - bB.y) * 0.7 },
        { x: Math.max(6, bB.x - W * 0.06), y: bB.y + (lT.y - bB.y) * 0.32 },
        bB
      ),
      weight: 1.25,
      tone: "A",
      delay: SEGMENT_DELAYS[5],
    });
    wires.push({
      id: "p-seg5-echo",
      segment: 5,
      d: cubic(
        edgePoint(lantern, 0.62, 0.06),
        { x: lT.x + W * 0.03, y: bB.y + (lT.y - bB.y) * 0.68 },
        { x: bB.x + W * 0.02, y: bB.y + (lT.y - bB.y) * 0.35 },
        edgePoint(book, 0.56, 0.96)
      ),
      weight: 0.75,
      tone: "B",
      delay: SEGMENT_DELAYS[5] + 0.08,
    });

    junctions.push(
      { ...bR, tone: "A", delay: SEGMENT_DELAYS[1] },
      { ...cL, tone: "B", delay: SEGMENT_DELAYS[1] + 0.32 },
      { ...gT, tone: "B", delay: SEGMENT_DELAYS[2] + 0.32 },
      { ...kR, tone: "B", delay: SEGMENT_DELAYS[3] + 0.32 },
      { ...lB, tone: "A", delay: SEGMENT_DELAYS[4] + 0.32 },
      { ...bB, tone: "A", delay: SEGMENT_DELAYS[5] + 0.32 }
    );
  } else {
    // 5-segment closed clockwise circuit (Desktop, Half-Desktop, iPad Landscape, HP Landscape):
    // Seg 1: Lantern -> Globe | Seg 2: Globe -> Compass | Seg 3: Compass -> Cards | Seg 4: Cards -> Book | Seg 5: Book -> Lantern
    const lR = edgePoint(lantern, 0.96, 0.42);
    const lB = edgePoint(lantern, 0.48, 0.96);
    const gL = edgePoint(globe, 0.04, 0.42);
    const gB = edgePoint(globe, 0.52, 0.96);
    const bT = edgePoint(book, 0.42, 0.05);
    const bR = edgePoint(book, 0.96, 0.52);
    const cT = edgePoint(compass, 0.56, 0.05);
    const cL = edgePoint(compass, 0.04, 0.54);
    const kL = edgePoint(cards, 0.04, 0.56);
    const kR = edgePoint(cards, 0.96, 0.56);

    // Segment 1: Lantern -> Globe
    wires.push({
      id: "d-seg1-main",
      segment: 1,
      d: quad(lR, { x: W * 0.5, y: Math.max(8, Math.min(lR.y, gL.y) - H * 0.1) }, gL),
      weight: 1.3,
      tone: "A",
      delay: SEGMENT_DELAYS[1],
    });
    wires.push({
      id: "d-seg1-echo",
      segment: 1,
      d: quad(
        edgePoint(lantern, 0.95, 0.56),
        { x: W * 0.5, y: Math.max(16, Math.min(lR.y, gL.y) - H * 0.06) },
        edgePoint(globe, 0.05, 0.56)
      ),
      weight: 0.75,
      tone: "B",
      delay: SEGMENT_DELAYS[1] + 0.08,
    });

    // Segment 2: Globe -> Compass
    wires.push({
      id: "d-seg2-main",
      segment: 2,
      d: cubic(
        gB,
        { x: Math.min(W - 8, gB.x + W * 0.03), y: gB.y + (cT.y - gB.y) * 0.35 },
        { x: Math.min(W - 8, cT.x + W * 0.03), y: gB.y + (cT.y - gB.y) * 0.68 },
        cT
      ),
      weight: 1.3,
      tone: "B",
      delay: SEGMENT_DELAYS[2],
    });
    wires.push({
      id: "d-seg2-echo",
      segment: 2,
      d: cubic(
        edgePoint(globe, 0.36, 0.95),
        { x: gB.x - W * 0.025, y: gB.y + (cT.y - gB.y) * 0.38 },
        { x: cT.x - W * 0.028, y: gB.y + (cT.y - gB.y) * 0.65 },
        edgePoint(compass, 0.42, 0.06)
      ),
      weight: 0.75,
      tone: "A",
      delay: SEGMENT_DELAYS[2] + 0.08,
    });

    // Segment 3: Compass -> Cards
    wires.push({
      id: "d-seg3-main",
      segment: 3,
      d: cubic(
        cL,
        { x: kR.x + (cL.x - kR.x) * 0.62, y: cL.y - H * 0.04 },
        { x: kR.x + (cL.x - kR.x) * 0.38, y: kR.y + H * 0.04 },
        kR
      ),
      weight: 1.3,
      tone: "B",
      delay: SEGMENT_DELAYS[3],
    });
    wires.push({
      id: "d-seg3-echo",
      segment: 3,
      d: cubic(
        edgePoint(compass, 0.06, 0.7),
        { x: kR.x + (cL.x - kR.x) * 0.66, y: cL.y + H * 0.04 },
        { x: kR.x + (cL.x - kR.x) * 0.34, y: kR.y - H * 0.025 },
        edgePoint(cards, 0.95, 0.7)
      ),
      weight: 0.75,
      tone: "A",
      delay: SEGMENT_DELAYS[3] + 0.08,
    });

    // Segment 4: Cards -> Book
    wires.push({
      id: "d-seg4-main",
      segment: 4,
      d: cubic(
        kL,
        { x: bR.x + (kL.x - bR.x) * 0.62, y: kL.y + H * 0.04 },
        { x: bR.x + (kL.x - bR.x) * 0.42, y: bR.y - H * 0.04 },
        bR
      ),
      weight: 1.3,
      tone: "A",
      delay: SEGMENT_DELAYS[4],
    });
    wires.push({
      id: "d-seg4-echo",
      segment: 4,
      d: cubic(
        edgePoint(cards, 0.05, 0.7),
        { x: bR.x + (kL.x - bR.x) * 0.68, y: kL.y - H * 0.025 },
        { x: bR.x + (kL.x - bR.x) * 0.38, y: bR.y + H * 0.04 },
        edgePoint(book, 0.94, 0.68)
      ),
      weight: 0.75,
      tone: "B",
      delay: SEGMENT_DELAYS[4] + 0.08,
    });

    // Segment 5: Book -> Lantern (closes the 5-segment circuit)
    wires.push({
      id: "d-seg5-main",
      segment: 5,
      d: cubic(
        bT,
        { x: Math.max(8, bT.x - W * 0.03), y: lB.y + (bT.y - lB.y) * 0.68 },
        { x: Math.max(8, lB.x - W * 0.03), y: lB.y + (bT.y - lB.y) * 0.35 },
        lB
      ),
      weight: 1.3,
      tone: "A",
      delay: SEGMENT_DELAYS[5],
    });
    wires.push({
      id: "d-seg5-echo",
      segment: 5,
      d: cubic(
        edgePoint(book, 0.56, 0.06),
        { x: bT.x + W * 0.028, y: lB.y + (bT.y - lB.y) * 0.65 },
        { x: lB.x + W * 0.025, y: lB.y + (bT.y - lB.y) * 0.38 },
        edgePoint(lantern, 0.64, 0.95)
      ),
      weight: 0.75,
      tone: "B",
      delay: SEGMENT_DELAYS[5] + 0.08,
    });

    junctions.push(
      { ...lR, tone: "A", delay: SEGMENT_DELAYS[1] },
      { ...gL, tone: "B", delay: SEGMENT_DELAYS[1] + 0.34 },
      { ...cT, tone: "B", delay: SEGMENT_DELAYS[2] + 0.34 },
      { ...kR, tone: "B", delay: SEGMENT_DELAYS[3] + 0.34 },
      { ...bR, tone: "A", delay: SEGMENT_DELAYS[4] + 0.34 },
      { ...lB, tone: "A", delay: SEGMENT_DELAYS[5] + 0.34 }
    );
  }

  return { wires, junctions };
}
