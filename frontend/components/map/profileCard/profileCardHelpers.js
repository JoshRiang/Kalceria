import {
  resolvePersistentAvatarUrl,
  resolvePersistentCover,
} from "@/lib/profileIdentity";

export function formatJoinedDate(createdAt) {
  if (!createdAt) return "Joined in October 2025";
  try {
    const d = new Date(createdAt);
    if (isNaN(d.getTime())) return "Joined in October 2025";
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return `Joined in ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return "Joined in October 2025";
  }
}

export const AESTHETIC_COVERS = [
  "/jpeg/foto_abt1.jpeg",
  "/jpeg/foto_abt2.jpeg",
  "/jpeg/foto_abt3.jpeg",
  "/jpeg/foto_abt4.jpeg",
  "/jpeg/foto_abt5.jpeg",
  "/jpeg/foto_abt10.jpeg",
  "/jpeg/foto_abt11.jpeg",
  "/jpeg/bg_event.jpeg",
  "/jpeg/bg_s1ev.jpeg",
  "/jpeg/bg_s2ev.jpeg",
  "/bg_tokyo.webp",
  "/aboutus_bg1.webp",
];

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

export function getFallbackCover(user) {
  return resolvePersistentCover(user);
}

export function getLegacyFallbackCover(user) {
  const name = String(user?.name || user?.nickname || "").toLowerCase();
  if (name.includes("ahmad")) {
    return "/media/gifs/event_spec_1.mp4";
  }
  if (name.includes("adit")) {
    return "/media/gifs/event_spec_1.gif";
  }
  // User Requirement: Everyone else (including Otniel) has a random profile bg BASE COLOR (like green, etc.) with nothing added on that base color
  const idStr = String(user?.id || user?.name || user?.nickname || "kalcerian");
  const num =
    Math.abs(idStr.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)) %
    BASE_PROFILE_COLORS.length;
  return BASE_PROFILE_COLORS[num];
}

export function getAvatarUrl(user) {
  return resolvePersistentAvatarUrl(user);
}

export function getLegacyAvatarUrl(user) {
  return (
    user?.profilePicture ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
      user?.nickname || user?.name || "anon"
    )}`
  );
}
