"use client";

export const BASE_PROFILE_COLORS = [
  "#1b4332", // Forest Green
  "#1e3a5f", // Deep Navy
  "#2d6a4f", // Vibrant Emerald Green
  "#0284c7", // Sky Blue
  "#0d9488", // Deep Teal
  "#7c3aed", // Rich Violet
  "#c2410c", // Terracotta Rust
  "#d97706", // Warm Amber
  "#b91c1c", // Deep Crimson
  "#4338ca", // Royal Indigo
  "#047857", // Lush Pine
  "#db2777", // Vibrant Rose
];

function getUserIdentityKey(user) {
  if (!user) return "anon";
  const raw =
    user.id ||
    user.userId ||
    user.nickname ||
    user.username ||
    user.email ||
    user.name ||
    "anon";
  return String(raw).trim().replace(/^@/, "").toLowerCase();
}

/**
 * Resolves a user's persistent avatar URL.
 * Guarantees that KalcerianProfileCard, EditProfileModal, MapHeaderHud, and KalceriansPanel
 * always render the exact same avatar and persist it across sessions & backend syncs.
 */
export function resolvePersistentAvatarUrl(user) {
  if (!user) {
    return "https://api.dicebear.com/7.x/avataaars/svg?seed=anon";
  }

  const key = getUserIdentityKey(user);
  const storageKey = `kalceria_avatar_v1:${key}`;

  if (user.profilePicture && typeof user.profilePicture === "string" && user.profilePicture.trim()) {
    const pic = user.profilePicture.trim();
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(storageKey, pic);
      } catch {}
    }
    return pic;
  }

  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(storageKey);
      if (cached) return cached;
    } catch {}
  }

  const seed = String(
    user.nickname || user.username || user.id || user.name || "anon"
  ).replace(/^@/, "");
  const generated = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(storageKey, generated);
    } catch {}
  }

  return generated;
}

/**
 * Resolves a user's persistent cover background (custom image/video/gif or deterministic base color).
 * Guarantees that KalcerianProfileCard and EditProfileModal always show the exact same background.
 */
export function resolvePersistentCover(user) {
  if (!user) return BASE_PROFILE_COLORS[0];

  const key = getUserIdentityKey(user);
  const storageKey = `kalceria_cover_v1:${key}`;

  const customCover =
    user.coverImage ||
    user.coverUrl ||
    user.cover ||
    user.profileCover ||
    user.bannerUrl ||
    null;

  if (customCover && typeof customCover === "string" && customCover.trim()) {
    const trimmed = customCover.trim();
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(storageKey, trimmed);
      } catch {}
    }
    return trimmed;
  }

  const lowerName = String(user.name || user.nickname || "").toLowerCase();
  if (lowerName.includes("ahmad")) {
    return "/media/gifs/event_spec_1.mp4";
  }
  if (lowerName.includes("adit")) {
    return "/media/gifs/event_spec_1.gif";
  }

  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(storageKey);
      if (cached) return cached;
    } catch {}
  }

  const idStr = String(user.id || user.nickname || user.username || user.name || "kalcerian");
  const num =
    Math.abs(idStr.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)) %
    BASE_PROFILE_COLORS.length;
  const color = BASE_PROFILE_COLORS[num];

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(storageKey, color);
    } catch {}
  }

  return color;
}

/**
 * Explicitly updates the local persistence cache when the user saves changes in EditProfileModal.
 */
export function persistProfileIdentityCache(user, { profilePicture, coverImage, coverType } = {}) {
  if (typeof window === "undefined" || !user) return;
  const key = getUserIdentityKey(user);
  try {
    if (profilePicture) {
      localStorage.setItem(`kalceria_avatar_v1:${key}`, profilePicture);
    }
    if (coverImage) {
      localStorage.setItem(`kalceria_cover_v1:${key}`, coverImage);
    }
    if (coverType) {
      localStorage.setItem(`kalceria_cover_type_v1:${key}`, coverType);
    }
  } catch {}
}

