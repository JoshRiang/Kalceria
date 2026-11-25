/**
 * Pure Chat Box 5-Slide Nongskuy Background Carousel Configuration & Random Index Helpers.
 * Zero framework/alias dependencies so it runs natively in both Next.js and Node --test.
 *
 * Served via Cloudflare R2 Edge CDN (`https://cdn.kalceria.id/media/ui-bg/v53/...`) with
 * local fallback paths in `/BG_IMPROVE_FOR_MAP/...` handled by `mapBgCache.js`.
 */

export const CHAT_BG_CDN_BASE = "https://cdn.kalceria.id/media/ui-bg/v53";

export const CHAT_BG_CAROUSEL_SLIDES = [
  {
    id: "ngopi-santai",
    label: "Ngopi Santai",
    dark: `${CHAT_BG_CDN_BASE}/BG_PersonalChat_1_Dark.webp`,
    light: `${CHAT_BG_CDN_BASE}/BG_PersonalChat_1_Light.webp`,
    localDark: "/BG_IMPROVE_FOR_MAP/BG_PersonalChat_1_Dark.webp",
    localLight: "/BG_IMPROVE_FOR_MAP/BG_PersonalChat_1_Light.webp",
  },
  {
    id: "kopi-sore",
    label: "Kopi Sore",
    dark: `${CHAT_BG_CDN_BASE}/BG_PersonalChat_2_Dark.webp`,
    light: `${CHAT_BG_CDN_BASE}/BG_PersonalChat_2_Light.webp`,
    localDark: "/BG_IMPROVE_FOR_MAP/BG_PersonalChat_2_Dark.webp",
    localLight: "/BG_IMPROVE_FOR_MAP/BG_PersonalChat_2_Light.webp",
  },
  {
    id: "malam-akustik",
    label: "Malam Akustik",
    dark: `${CHAT_BG_CDN_BASE}/BG_PersonalChat_3_Dark.webp`,
    light: `${CHAT_BG_CDN_BASE}/BG_PersonalChat_3_Light.webp`,
    localDark: "/BG_IMPROVE_FOR_MAP/BG_PersonalChat_3_Dark.webp",
    localLight: "/BG_IMPROVE_FOR_MAP/BG_PersonalChat_3_Light.webp",
  },
  {
    id: "spot-malam",
    label: "Spot Malam",
    dark: `${CHAT_BG_CDN_BASE}/BG_PersonalChat_4_Dark.webp`,
    light: `${CHAT_BG_CDN_BASE}/BG_PersonalChat_4_Light.webp`,
    localDark: "/BG_IMPROVE_FOR_MAP/BG_PersonalChat_4_Dark.webp",
    localLight: "/BG_IMPROVE_FOR_MAP/BG_PersonalChat_4_Light.webp",
  },
  {
    id: "nongs-chat",
    label: "Nongs & Chat",
    dark: `${CHAT_BG_CDN_BASE}/BG_PersonalChat_5_Dark.webp`,
    light: `${CHAT_BG_CDN_BASE}/BG_PersonalChat_5_Light.webp`,
    localDark: "/BG_IMPROVE_FOR_MAP/BG_PersonalChat_5_Dark.webp",
    localLight: "/BG_IMPROVE_FOR_MAP/BG_PersonalChat_5_Light.webp",
  },
];

export function normalizeChatBgSlideIndex(index, total = CHAT_BG_CAROUSEL_SLIDES.length) {
  const safeTotal = Number.isInteger(total) && total > 0 ? total : CHAT_BG_CAROUSEL_SLIDES.length;
  const num = Number(index);
  if (!Number.isFinite(num)) return 0;
  const floored = Math.floor(num);
  return ((floored % safeTotal) + safeTotal) % safeTotal;
}

export function getNextChatBgSlideIndex(currentIndex, step = 1, total = CHAT_BG_CAROUSEL_SLIDES.length) {
  return normalizeChatBgSlideIndex((Number(currentIndex) || 0) + step, total);
}

/**
 * Uniform 1/N random carousel selector (1/5 = 20% probability across all 5 Nongskuy backgrounds).
 * Called once per chatbox open/target switch and persisted while the chatbox remains open.
 */
export function pickRandomChatBgSlideIndex(total = CHAT_BG_CAROUSEL_SLIDES.length, rng = Math.random) {
  const safeTotal = Number.isInteger(total) && total > 0 ? total : CHAT_BG_CAROUSEL_SLIDES.length;
  const sample = typeof rng === "function" ? Number(rng()) : Math.random();
  if (!Number.isFinite(sample)) return 0;
  const clamped = Math.min(0.999999999999, Math.max(0, sample));
  return Math.floor(clamped * safeTotal);
}

export function getChatBgSlideUrl(index, isDark) {
  const safeIdx = normalizeChatBgSlideIndex(index);
  const slide = CHAT_BG_CAROUSEL_SLIDES[safeIdx] || CHAT_BG_CAROUSEL_SLIDES[0];
  return isDark ? slide.dark : slide.light;
}

