/**
 * Pure Chat Box 5-Slide Nongskuy Background Carousel Configuration & Index Helpers.
 * Zero framework/alias dependencies so it runs natively in both Next.js and Node --test.
 */

export const CHAT_BG_STORAGE_KEY = "kalceria:chat_bg_slide_idx";
export const CHAT_BG_AUTO_ROTATE_MS = 22_000;

export const CHAT_BG_CAROUSEL_SLIDES = [
  {
    id: "ngopi-santai",
    label: "Ngopi Santai",
    dark: "/BG_IMPROVE_FOR_MAP/BG_PersonalChat_1_Dark.webp?v=53",
    light: "/BG_IMPROVE_FOR_MAP/BG_PersonalChat_1_Light.webp?v=53",
  },
  {
    id: "kopi-sore",
    label: "Kopi Sore",
    dark: "/BG_IMPROVE_FOR_MAP/BG_PersonalChat_2_Dark.webp?v=53",
    light: "/BG_IMPROVE_FOR_MAP/BG_PersonalChat_2_Light.webp?v=53",
  },
  {
    id: "malam-akustik",
    label: "Malam Akustik",
    dark: "/BG_IMPROVE_FOR_MAP/BG_PersonalChat_3_Dark.webp?v=53",
    light: "/BG_IMPROVE_FOR_MAP/BG_PersonalChat_3_Light.webp?v=53",
  },
  {
    id: "spot-malam",
    label: "Spot Malam",
    dark: "/BG_IMPROVE_FOR_MAP/BG_PersonalChat_4_Dark.webp?v=53",
    light: "/BG_IMPROVE_FOR_MAP/BG_PersonalChat_4_Light.webp?v=53",
  },
  {
    id: "nongs-chat",
    label: "Nongs & Chat",
    dark: "/BG_IMPROVE_FOR_MAP/BG_PersonalChat_5_Dark.webp?v=53",
    light: "/BG_IMPROVE_FOR_MAP/BG_PersonalChat_5_Light.webp?v=53",
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

export function getChatBgSlideUrl(index, isDark) {
  const safeIdx = normalizeChatBgSlideIndex(index);
  const slide = CHAT_BG_CAROUSEL_SLIDES[safeIdx] || CHAT_BG_CAROUSEL_SLIDES[0];
  return isDark ? slide.dark : slide.light;
}
