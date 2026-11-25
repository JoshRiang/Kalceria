/**
 * Pure Page Background Asset Registry for Minigame & SeeJourney (Top 3 Segments).
 * Served globally from Cloudflare R2 Edge CDN (`https://cdn.kalceria.id/media/page-bg/v57/...`)
 * with automatic local fallback (`/BG_IMPROVE_FOR_MAP/...`).
 * Zero React/DOM/alias dependencies so it executes natively in both Next.js and Node --test.
 */

export const PAGE_BG_CDN_BASE = "https://cdn.kalceria.id/media/page-bg/v57";
export const PAGE_BG_LOCAL_BASE = "/BG_IMPROVE_FOR_MAP";

function makePair(desktopFile, mobileFile) {
  return {
    desktop: `${PAGE_BG_CDN_BASE}/${desktopFile}`,
    mobile: `${PAGE_BG_CDN_BASE}/${mobileFile}`,
    localDesktop: `${PAGE_BG_LOCAL_BASE}/${desktopFile}`,
    localMobile: `${PAGE_BG_LOCAL_BASE}/${mobileFile}`,
  };
}

export const MINIGAME_BG_THEMES = {
  // Light Idle Scheme: White base + Gold & Royal Cobalt Blue
  light: makePair("BG_Minigame_Light.webp", "BG_Minigame_Mobile_Light.webp"),
  // Dark Playing Scheme: Black base + Neon Pink & Luminous Gold
  dark: makePair("BG_Minigame_Dark.webp", "BG_Minigame_Mobile_Dark.webp"),
};

export const JOURNEY_SEGMENT_BG_THEMES = {
  // Segment 1 (Mist): Navy Blue + Bright Green
  1: {
    light: makePair("BG_Journey1_Light.webp", "BG_Journey1_Mobile_Light.webp"),
    dark: makePair("BG_Journey1_Dark.webp", "BG_Journey1_Mobile_Dark.webp"),
  },
  // Segment 2 (UI Racing Team): Golden + Orange
  2: {
    light: makePair("BG_Journey2_Light.webp", "BG_Journey2_Mobile_Light.webp"),
    dark: makePair("BG_Journey2_Dark.webp", "BG_Journey2_Mobile_Dark.webp"),
  },
  // Segment 3 (Dream Shift Labs): Yellow + Black (Light) / White (Dark)
  3: {
    light: makePair("BG_Journey3_Light.webp", "BG_Journey3_Mobile_Light.webp"),
    dark: makePair("BG_Journey3_Dark.webp", "BG_Journey3_Mobile_Dark.webp"),
  },
};

export function getJourneySegmentBgUrls(segmentIndex, isMobileOrTablet) {
  const seg = JOURNEY_SEGMENT_BG_THEMES[segmentIndex];
  if (!seg) return { light: "", dark: "", localLight: "", localDark: "" };
  return {
    light: isMobileOrTablet ? seg.light.mobile : seg.light.desktop,
    dark: isMobileOrTablet ? seg.dark.mobile : seg.dark.desktop,
    localLight: isMobileOrTablet ? seg.light.localMobile : seg.light.localDesktop,
    localDark: isMobileOrTablet ? seg.dark.localMobile : seg.dark.localDesktop,
  };
}
