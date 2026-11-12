import { resolvePersistentAvatarUrl } from "@/lib/profileIdentity";

export const avatarUrl = (user) => resolvePersistentAvatarUrl(user);

export const FIND_TITLE_LETTERS = "Find other Kalcerians".split("");

export const titleWaveContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.022,
      delayChildren: 0.05,
    },
  },
};

export const titleLetterVariant = {
  hidden: {
    opacity: 0,
    x: -14,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      type: "spring",
      damping: 15,
      stiffness: 160,
    },
  },
};

export function cleanDesc(value) {
  return String(value || "")
    .replace(/\[CAT:[a-z_]+\]\s*/gi, "")
    .replace(/\[MEDIA:[^\]]+\]\s*/gi, "")
    .trim();
}

// Device Family Character Limits for Name, Username, and Broadcast Status
export const FAMILY_LIMITS = {
  hp: {
    name: 12,        // e.g. "Alwahib Raf..."
    username: 13,    // e.g. "alwahib_raf..."
    broadcast: 36,   // 2 compact lines
  },
  tab: {
    name: 20,
    username: 22,
    broadcast: 65,
  },
  ipad: {
    name: 13,        // fixed width sidebar (340px)
    username: 14,
    broadcast: 38,
  },
  desktop: {
    name: 16,        // fixed width sidebar (360px)
    username: 17,
    broadcast: 48,
  },
};

export function truncateWithEllipsis(str, maxLen) {
  if (!str) return "";
  const s = String(str).trim();
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen).trimEnd() + "...";
}

// 24-hour broadcast freshness check (stripping [MEDIA:...] tags so raw base64 never leaks into card status)
export function getActiveBroadcast(user) {
  const b = user?.broadcast;
  if (!b) return null;
  const rawMsg = typeof b === "string" ? b.trim() : (b.message || "").trim();
  if (!rawMsg) return null;
  if (b.expiresAt && new Date(b.expiresAt).getTime() < Date.now()) return null;
  if (b.createdAt) {
    const age = Date.now() - new Date(b.createdAt).getTime();
    if (age > 24 * 60 * 60 * 1000) return null;
  }
  const cleanMsg = cleanDesc(rawMsg);
  return cleanMsg || null;
}
