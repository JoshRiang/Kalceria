/**
 * Pure Page Background Asset Registry for SeeJourney (V5.8) & Minigame (V6.0).
 * Served globally from Cloudflare R2 Edge CDN with automatic local fallbacks.
 * Zero React/DOM/alias dependencies so it executes natively in both Next.js and Node --test.
 */

export const PAGE_BG_CDN_BASE = "https://cdn.kalceria.id/media/page-bg/v58";
export const PAGE_BG_LOCAL_BASE = "/BG_IMPROVE_FOR_MAP/v58";

export const MINIGAME_V60_CDN_BASE = "https://cdn.kalceria.id/media/page-bg/v60";
export const MINIGAME_V60_LOCAL_BASE = "/BG_IMPROVE_FOR_MAP/v60";

function makeMinigameBaseSet(modeTag) {
  const fDesk = `BG_Minigame_Base_Desktop_${modeTag}.webp`;
  const fHalf = `BG_Minigame_Base_Half_${modeTag}.webp`;
  const fTab = `BG_Minigame_Base_Tablet_${modeTag}.webp`;
  const fMob = `BG_Minigame_Base_Mobile_${modeTag}.webp`;
  return {
    desktop: `${MINIGAME_V60_CDN_BASE}/${fDesk}`,
    half: `${MINIGAME_V60_CDN_BASE}/${fHalf}`,
    tablet: `${MINIGAME_V60_CDN_BASE}/${fTab}`,
    mobile: `${MINIGAME_V60_CDN_BASE}/${fMob}`,
    localDesktop: `${MINIGAME_V60_LOCAL_BASE}/${fDesk}`,
    localHalf: `${MINIGAME_V60_LOCAL_BASE}/${fHalf}`,
    localTablet: `${MINIGAME_V60_LOCAL_BASE}/${fTab}`,
    localMobile: `${MINIGAME_V60_LOCAL_BASE}/${fMob}`,
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
    light: `${MINIGAME_V60_CDN_BASE}/${fLight}`,
    dark: `${MINIGAME_V60_CDN_BASE}/${fDark}`,
    localLight: `${MINIGAME_V60_LOCAL_BASE}/${fLight}`,
    localDark: `${MINIGAME_V60_LOCAL_BASE}/${fDark}`,
  };
}

export const MINIGAME_BG_THEMES = {
  // Light Idle Scheme: White base + Gold & Royal Cobalt Blue (4 device families)
  light: makeMinigameBaseSet("Light"),
  // Dark Playing Scheme: Black base + Neon Pink & Luminous Gold (4 device families)
  dark: makeMinigameBaseSet("Dark"),
};

export const MINIGAME_ELEMENT_IDS = ["book", "compass", "lantern", "globe", "cards"];

export const MINIGAME_ELEMENTS = {
  book: makeElementPair("book"),
  compass: makeElementPair("compass"),
  lantern: makeElementPair("lantern"),
  globe: makeElementPair("globe"),
  cards: makeElementPair("cards"),
};

export const MINIGAME_TRAILER_CHARACTERS = {
  left: {
    cdn: `${MINIGAME_V60_CDN_BASE}/MG_Trailer_Peek_Left.webp`,
    local: `${MINIGAME_V60_LOCAL_BASE}/MG_Trailer_Peek_Left.webp`,
  },
  right: {
    cdn: `${MINIGAME_V60_CDN_BASE}/MG_Trailer_Peek_Right.webp`,
    local: `${MINIGAME_V60_LOCAL_BASE}/MG_Trailer_Peek_Right.webp`,
  },
};

export const JOURNEY_INTRO_CDN_BASE = "https://cdn.kalceria.id/media/journey-intro";

export const JOURNEY_INTRO_VIDEOS = {
  // 1280x720 compressed HD B&W road-trip convoy video for Desktop & Half-Desktop landscape
  desktop: `${JOURNEY_INTRO_CDN_BASE}/journey-intro-desktop-bw.mp4`,
  // 720x1280 compressed HD B&W curvy-road sports car trip video for Mobile & Portrait Tablet
  portrait: `${JOURNEY_INTRO_CDN_BASE}/journey-intro-portrait-bw.mp4`,
  localFallback: "/vid_abt1.mp4",
};

export function getJourneyIntroVideoUrl(family = "desktop") {
  if (family === "mobile" || family === "tablet") {
    return JOURNEY_INTRO_VIDEOS.portrait;
  }
  return JOURNEY_INTRO_VIDEOS.desktop;
}

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

export function getMinigameBaseBgUrls(family = "desktop") {
  const safeFamily = FAMILY_TO_LOCAL_KEY[family] ? family : "desktop";
  const localKey = FAMILY_TO_LOCAL_KEY[safeFamily];
  return {
    light: MINIGAME_BG_THEMES.light[safeFamily],
    dark: MINIGAME_BG_THEMES.dark[safeFamily],
    localLight: MINIGAME_BG_THEMES.light[localKey],
    localDark: MINIGAME_BG_THEMES.dark[localKey],
  };
}

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
