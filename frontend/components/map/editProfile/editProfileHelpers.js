import { resolvePersistentCover } from "@/lib/profileIdentity";

export function getDeterministicBaseColor(user) {
  return resolvePersistentCover(user);
}

// Evenly distributed sparse CokiEditProfile icons across full 2D modal surface (no edge-line clustering)
export const EDIT_PROFILE_COKI_PATTERN = [
  { top: "12%", left: "10%", rotate: "-15deg", size: 54 },
  { top: "16%", left: "76%", rotate: "16deg", size: 52 },
  { top: "31%", left: "44%", rotate: "-10deg", size: 54 },
  { top: "44%", left: "82%", rotate: "-16deg", size: 56 },
  { top: "50%", left: "16%", rotate: "14deg", size: 52 },
  { top: "65%", left: "58%", rotate: "18deg", size: 54 },
  { top: "76%", left: "28%", rotate: "-13deg", size: 52 },
  { top: "86%", left: "79%", rotate: "12deg", size: 54 },
];

export function validateWhatsAppInput(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return { valid: true, normalized: "" };
  // Reject letters or invalid characters
  if (/[^0-9+\-\s()]/.test(trimmed)) {
    return { valid: false, normalized: trimmed };
  }
  const digitsOnly = trimmed.replace(/[\s\-()]/g, "");
  // Standard Indonesian & international mobile numbers:
  // 08xxxxxxxx (10-14 digits), +628xxxxxxxx (11-16 chars), 628xxxxxxxx (11-15 digits), or +[country][number] (10-15 digits)
  const isValidIndoOrIntl =
    /^(?:08[1-9][0-9]{7,11}|\+?628[1-9][0-9]{7,11}|\+[1-9][0-9]{8,14})$/.test(digitsOnly);
  if (!isValidIndoOrIntl) {
    return { valid: false, normalized: trimmed };
  }
  return { valid: true, normalized: digitsOnly };
}

export function validateInstagramInput(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return { valid: true, normalized: "" };

  let handle = trimmed;
  if (/^https?:\/\//i.test(handle) || /^www\.instagram\.com/i.test(handle) || /^instagram\.com/i.test(handle)) {
    try {
      const withProto = /^https?:\/\//i.test(handle) ? handle : `https://${handle}`;
      const url = new URL(withProto);
      const host = url.hostname.toLowerCase();
      if (host !== "instagram.com" && host !== "www.instagram.com") {
        return { valid: false, normalized: trimmed };
      }
      const segs = url.pathname.split("/").filter(Boolean);
      if (segs.length === 0 || ["p", "reel", "reels", "stories", "explore"].includes(segs[0].toLowerCase())) {
        return { valid: false, normalized: trimmed };
      }
      handle = segs[0];
    } catch {
      return { valid: false, normalized: trimmed };
    }
  }

  handle = handle.replace(/^@/, "");
  if (
    handle.length < 1 ||
    handle.length > 30 ||
    !/^[a-zA-Z0-9._]+$/.test(handle) ||
    handle.startsWith(".") ||
    handle.endsWith(".") ||
    handle.includes("..")
  ) {
    return { valid: false, normalized: handle };
  }

  return { valid: true, normalized: handle };
}
