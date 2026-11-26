/**
 * Pure Nous Research Hermes-inspired continuous architectural wire routing engine.
 * Connects all 5 Minigame artifacts into one unified editorial schematic composition
 * tailored per device family (mobile, tablet/iPad, half-desktop, desktop, landscape).
 * Strictly continuous curves only — zero slop (+, -, stray particles).
 */

function slotCenter(slot) {
  return {
    x: slot.leftPx + slot.widthPx / 2,
    y: slot.topPx + slot.heightPx / 2,
  };
}

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

/**
 * Generates clean, continuous Hermes routing wires connecting the 5 artifact slots.
 * Returns { wires: Array<{ id, d, weight, tone, delay }>, junctions: Array<{ x, y, tone, delay }> }
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
    // Portrait topology (HP & iPad Portrait): Book(TL), Compass(TR), Lantern(ML), Globe(MR), Cards(BC)
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

    // Top crown arc linking Book -> Compass
    wires.push({
      id: "p-top-primary",
      d: quad(bR, { x: W * 0.5, y: Math.max(6, Math.min(bR.y, cL.y) - H * 0.025) }, cL),
      weight: 1.25,
      tone: "A",
      delay: 0.72,
    });
    wires.push({
      id: "p-top-echo",
      d: quad(
        edgePoint(book, 0.94, 0.62),
        { x: W * 0.5, y: Math.max(12, Math.min(bR.y, cL.y) - H * 0.008) },
        edgePoint(compass, 0.06, 0.62)
      ),
      weight: 0.75,
      tone: "B",
      delay: 0.82,
    });

    // Left spine conduit: Book -> Lantern (twin parallel Hermes trace)
    wires.push({
      id: "p-left-outer",
      d: cubic(
        bB,
        { x: Math.max(6, bB.x - W * 0.06), y: bB.y + (lT.y - bB.y) * 0.32 },
        { x: Math.max(6, lT.x - W * 0.05), y: bB.y + (lT.y - bB.y) * 0.7 },
        lT
      ),
      weight: 1.25,
      tone: "A",
      delay: 0.86,
    });
    wires.push({
      id: "p-left-inner",
      d: cubic(
        edgePoint(book, 0.56, 0.96),
        { x: bB.x + W * 0.02, y: bB.y + (lT.y - bB.y) * 0.35 },
        { x: lT.x + W * 0.03, y: bB.y + (lT.y - bB.y) * 0.68 },
        edgePoint(lantern, 0.62, 0.06)
      ),
      weight: 0.75,
      tone: "B",
      delay: 0.95,
    });

    // Right spine conduit: Compass -> Globe (twin parallel Hermes trace)
    wires.push({
      id: "p-right-outer",
      d: cubic(
        cB,
        { x: Math.min(W - 6, cB.x + W * 0.06), y: cB.y + (gT.y - cB.y) * 0.32 },
        { x: Math.min(W - 6, gT.x + W * 0.05), y: cB.y + (gT.y - cB.y) * 0.7 },
        gT
      ),
      weight: 1.25,
      tone: "B",
      delay: 0.88,
    });
    wires.push({
      id: "p-right-inner",
      d: cubic(
        edgePoint(compass, 0.44, 0.96),
        { x: cB.x - W * 0.02, y: cB.y + (gT.y - cB.y) * 0.35 },
        { x: gT.x - W * 0.03, y: cB.y + (gT.y - cB.y) * 0.68 },
        edgePoint(globe, 0.38, 0.06)
      ),
      weight: 0.75,
      tone: "A",
      delay: 0.97,
    });

    // Lower cradle arcs: Lantern -> Cards & Globe -> Cards
    wires.push({
      id: "p-low-left",
      d: quad(lB, { x: lB.x + (kL.x - lB.x) * 0.25, y: kL.y + H * 0.02 }, kL),
      weight: 1.25,
      tone: "A",
      delay: 1.05,
    });
    wires.push({
      id: "p-low-right",
      d: quad(gB, { x: gB.x - (gB.x - kR.x) * 0.25, y: kR.y + H * 0.02 }, kR),
      weight: 1.25,
      tone: "B",
      delay: 1.07,
    });

    // Subtle harmonic upper-to-lower sweeping filament unifying left & right hemispheres
    wires.push({
      id: "p-orbital-sweep",
      d: cubic(
        edgePoint(lantern, 0.92, 0.36),
        { x: W * 0.28, y: H * 0.44 },
        { x: W * 0.72, y: H * 0.44 },
        edgePoint(globe, 0.08, 0.36)
      ),
      weight: 0.7,
      tone: "mix",
      delay: 1.15,
    });

    junctions.push(
      { ...bR, tone: "A", delay: 0.72 },
      { ...cL, tone: "B", delay: 0.78 },
      { ...lT, tone: "A", delay: 0.9 },
      { ...gT, tone: "B", delay: 0.92 },
      { ...kL, tone: "A", delay: 1.08 },
      { ...kR, tone: "B", delay: 1.1 }
    );
  } else {
    // Landscape topology (Desktop, Half-Desktop, iPad Landscape, HP Landscape):
    // Lantern(TL), Globe(TR), Book(BL), Cards(BC), Compass(BR)
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
    const kT = slotCenter(cards);

    // Upper sweeping Hermes arch: Lantern -> Globe (clears top title cleanly)
    wires.push({
      id: "d-top-arch",
      d: quad(lR, { x: W * 0.5, y: Math.max(8, Math.min(lR.y, gL.y) - H * 0.1) }, gL),
      weight: 1.3,
      tone: "A",
      delay: 0.74,
    });
    wires.push({
      id: "d-top-arch-echo",
      d: quad(
        edgePoint(lantern, 0.95, 0.56),
        { x: W * 0.5, y: Math.max(16, Math.min(lR.y, gL.y) - H * 0.06) },
        edgePoint(globe, 0.05, 0.56)
      ),
      weight: 0.75,
      tone: "B",
      delay: 0.84,
    });

    // Left vertical conduit: Lantern -> Book
    wires.push({
      id: "d-left-main",
      d: cubic(
        lB,
        { x: Math.max(8, lB.x - W * 0.03), y: lB.y + (bT.y - lB.y) * 0.35 },
        { x: Math.max(8, bT.x - W * 0.03), y: lB.y + (bT.y - lB.y) * 0.68 },
        bT
      ),
      weight: 1.3,
      tone: "A",
      delay: 0.86,
    });
    wires.push({
      id: "d-left-echo",
      d: cubic(
        edgePoint(lantern, 0.64, 0.95),
        { x: lB.x + W * 0.025, y: lB.y + (bT.y - lB.y) * 0.38 },
        { x: bT.x + W * 0.028, y: lB.y + (bT.y - lB.y) * 0.65 },
        edgePoint(book, 0.56, 0.06)
      ),
      weight: 0.75,
      tone: "B",
      delay: 0.94,
    });

    // Right vertical conduit: Globe -> Compass
    wires.push({
      id: "d-right-main",
      d: cubic(
        gB,
        { x: Math.min(W - 8, gB.x + W * 0.03), y: gB.y + (cT.y - gB.y) * 0.35 },
        { x: Math.min(W - 8, cT.x + W * 0.03), y: gB.y + (cT.y - gB.y) * 0.68 },
        cT
      ),
      weight: 1.3,
      tone: "B",
      delay: 0.88,
    });
    wires.push({
      id: "d-right-echo",
      d: cubic(
        edgePoint(globe, 0.36, 0.95),
        { x: gB.x - W * 0.025, y: gB.y + (cT.y - gB.y) * 0.38 },
        { x: cT.x - W * 0.028, y: gB.y + (cT.y - gB.y) * 0.65 },
        edgePoint(compass, 0.42, 0.06)
      ),
      weight: 0.75,
      tone: "A",
      delay: 0.96,
    });

    // Lower braided routing bus: Book -> Cards -> Compass
    wires.push({
      id: "d-bot-left-main",
      d: cubic(
        bR,
        { x: bR.x + (kL.x - bR.x) * 0.42, y: bR.y - H * 0.04 },
        { x: bR.x + (kL.x - bR.x) * 0.62, y: kL.y + H * 0.04 },
        kL
      ),
      weight: 1.3,
      tone: "A",
      delay: 1.02,
    });
    wires.push({
      id: "d-bot-left-echo",
      d: cubic(
        edgePoint(book, 0.94, 0.68),
        { x: bR.x + (kL.x - bR.x) * 0.38, y: bR.y + H * 0.04 },
        { x: bR.x + (kL.x - bR.x) * 0.68, y: kL.y - H * 0.025 },
        edgePoint(cards, 0.05, 0.7)
      ),
      weight: 0.75,
      tone: "B",
      delay: 1.1,
    });

    wires.push({
      id: "d-bot-right-main",
      d: cubic(
        kR,
        { x: kR.x + (cL.x - kR.x) * 0.38, y: kR.y + H * 0.04 },
        { x: kR.x + (cL.x - kR.x) * 0.62, y: cL.y - H * 0.04 },
        cL
      ),
      weight: 1.3,
      tone: "B",
      delay: 1.04,
    });
    wires.push({
      id: "d-bot-right-echo",
      d: cubic(
        edgePoint(cards, 0.95, 0.7),
        { x: kR.x + (cL.x - kR.x) * 0.34, y: kR.y - H * 0.025 },
        { x: kR.x + (cL.x - kR.x) * 0.66, y: cL.y + H * 0.04 },
        edgePoint(compass, 0.06, 0.7)
      ),
      weight: 0.75,
      tone: "A",
      delay: 1.12,
    });

    // Subtle wide inner celestial arc linking Lantern -> Cards halo -> Globe
    wires.push({
      id: "d-inner-harmonic-l",
      d: quad(
        edgePoint(lantern, 0.9, 0.84),
        { x: W * 0.25, y: H * 0.62 },
        edgePoint(cards, 0.16, 0.14)
      ),
      weight: 0.7,
      tone: "mix",
      delay: 1.16,
    });
    wires.push({
      id: "d-inner-harmonic-r",
      d: quad(
        edgePoint(globe, 0.1, 0.84),
        { x: W * 0.75, y: H * 0.62 },
        edgePoint(cards, 0.84, 0.14)
      ),
      weight: 0.7,
      tone: "mix",
      delay: 1.18,
    });

    // Keep unused helper reference clean via center anchor metadata
    junctions.push(
      { ...lR, tone: "A", delay: 0.74 },
      { ...gL, tone: "B", delay: 0.8 },
      { ...bT, tone: "A", delay: 0.9 },
      { ...cT, tone: "B", delay: 0.92 },
      { ...kL, tone: "A", delay: 1.06 },
      { ...kR, tone: "B", delay: 1.08 },
      { x: kT.x, y: cards.topPx + 4, tone: "mix", delay: 1.2, subtle: true }
    );
  }

  return { wires, junctions };
}

