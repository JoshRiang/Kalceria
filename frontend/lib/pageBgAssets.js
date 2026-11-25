/**
 * Pure Page Background Asset Registry (V5.8) for Minigame & SeeJourney (Top 3 Segments).
 * Served globally from Cloudflare R2 Edge CDN (`https://cdn.kalceria.id/media/page-bg/v58/...`)
 * with automatic local fallback (`/BG_IMPROVE_FOR_MAP/v58/...`).
 *
 * Supports ALL 4 device families:
 * - desktop (1920x1080 widescreen)
 * - half    (1600x1100 landscape tablet / half-desktop)
 * - tablet  (1200x1500 portrait tablet / iPad / Fold)
 * - mobile  (1080x1920 portrait phone)
 *
 * Zero React/DOM/alias dependencies so it executes natively in both Next.js and Node --test.
 */

export const PAGE_BG_CDN_BASE = "https://cdn.kalceria.id/media/page-bg/v58";
export const PAGE_BG_LOCAL_BASE = "/BG_IMPROVE_FOR_MAP/v58";

function makeBasePair(desktopFile, portraitFile) {
  return {
    desktop: `${PAGE_BG_CDN_BASE}/${desktopFile}`,
    mobile: `${PAGE_BG_CDN_BASE}/${portraitFile}`,
    localDesktop: `${PAGE_BG_LOCAL_BASE}/${desktopFile}`,
    localMobile: `${PAGE_BG_LOCAL_BASE}/${portraitFile}`,
  };
}

function makeJourneyFamilySet(segNum, modeTag) {
  const fDesk = `BG_Journey${segNum}_Desktop_${modeTag}.webp`;
  const fHalf = `BG_Journey${segNum}_Half_${modeTag}.webp`;
  const fTab = `BG_Journey${segNum}_Tablet_${modeTag}.webp`;
  const fMob = `BG_Journey${segNum}_Mobile_${modeTag}.webp`;
  return {
    desktop: `${PAGE_BG_CDN_BASE}/${fDesk}`,
    half: `${PAGE_BG_CDN_BASE}/${fHalf}`,
    tablet: `${PAGE_BG_CDN_BASE}/${fTab}`,
    mobile: `${PAGE_BG_CDN_BASE}/${fMob}`,
    localDesktop: `${PAGE_BG_LOCAL_BASE}/${fDesk}`,
    localHalf: `${PAGE_BG_LOCAL_BASE}/${fHalf}`,
    localTablet: `${PAGE_BG_LOCAL_BASE}/${fTab}`,
    localMobile: `${PAGE_BG_LOCAL_BASE}/${fMob}`,
  };
}

function makeElementPair(id) {
  const fLight = `MG_Elem_${id}_Light.webp`;
  const fDark = `MG_Elem_${id}_Dark.webp`;
  return {
    id,
    light: `${PAGE_BG_CDN_BASE}/${fLight}`,
    dark: `${PAGE_BG_CDN_BASE}/${fDark}`,
    localLight: `${PAGE_BG_LOCAL_BASE}/${fLight}`,
    localDark: `${PAGE_BG_LOCAL_BASE}/${fDark}`,
  };
}

export const MINIGAME_BG_THEMES = {
  // Light Idle Scheme: White base + Gold & Royal Cobalt Blue
  light: makeBasePair("BG_Minigame_Base_Light.webp", "BG_Minigame_Base_Portrait_Light.webp"),
  // Dark Playing Scheme: Black base + Neon Pink & Luminous Gold
  dark: makeBasePair("BG_Minigame_Base_Dark.webp", "BG_Minigame_Base_Portrait_Dark.webp"),
};

export const MINIGAME_ELEMENT_IDS = ["book", "compass", "lantern", "globe", "cards"];

export const MINIGAME_ELEMENTS = {
  book: makeElementPair("book"),
  compass: makeElementPair("compass"),
  lantern: makeElementPair("lantern"),
  globe: makeElementPair("globe"),
  cards: makeElementPair("cards"),
};

export const JOURNEY_SEGMENT_BG_THEMES = {
  // Segment 1 (Mist): Unified Ferrari 488 + Budapest Chain Bridge — Navy Blue + Bright Green
  1: {
    light: makeJourneyFamilySet(1, "Light"),
    dark: makeJourneyFamilySet(1, "Dark"),
  },
  // Segment 2 (UI Racing Team): Unified Porsche 356 + Midtown Manhattan — Golden + Orange
  2: {
    light: makeJourneyFamilySet(2, "Light"),
    dark: makeJourneyFamilySet(2, "Dark"),
  },
  // Segment 3 (Dream Shift Labs): Unified Skyline GT-R R34 + Shibuya 109 — Yellow + Black/White
  3: {
    light: makeJourneyFamilySet(3, "Light"),
    dark: makeJourneyFamilySet(3, "Dark"),
  },
};

const FAMILY_TO_LOCAL_KEY = {
  desktop: "localDesktop",
  half: "localHalf",
  tablet: "localTablet",
  mobile: "localMobile",
};

/**
 * Resolves CDN + local fallback Light/Dark URLs for a Journey segment across all 4 device families.
 * Also preserves backwards compatibility if a boolean (`isMobileOrTablet`) is passed.
 */
export function getJourneySegmentBgUrls(segmentIndex, familyOrMobile = "desktop") {
  const seg = JOURNEY_SEGMENT_BG_THEMES[segmentIndex];
  if (!seg) return { light: "", dark: "", localLight: "", localDark: "" };

  const family =
    typeof familyOrMobile === "boolean"
      ? familyOrMobile
        ? "mobile"
        : "desktop"
      : FAMILY_TO_LOCAL_KEY[familyOrMobile]
        ? familyOrMobile
        : "desktop";

  const localKey = FAMILY_TO_LOCAL_KEY[family];
  return {
    light: seg.light[family],
    dark: seg.dark[family],
    localLight: seg.light[localKey],
    localDark: seg.dark[localKey],
  };
}
