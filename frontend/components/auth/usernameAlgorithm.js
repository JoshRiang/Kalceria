// ─── Username Suggestion Algorithm ──────────────────────────────────────────
// Generates intelligent username candidates based on user's name & email:
// 1. Prioritizes 2-word title case if name has multiple words (e.g. "Reyhan Batara")
// 2. Uses 1-word title case if name has 1 word (e.g. "Reyhan")
// 3. Appends numeric suffixes (e.g. "Reyhan123", "Reyhan1") if primary is taken.

function toTitleCase(str) {
  if (!str) return "";
  return str
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function generateUsernameCandidates(name = "", email = "", bornYear = "") {
  const candidates = [];
  const words = (name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  let primary = "";
  if (words.length >= 2) {
    // Priority: 2 words Title Case
    primary = `${toTitleCase(words[0])} ${toTitleCase(words[1])}`;
  } else if (words.length === 1) {
    primary = toTitleCase(words[0]);
  } else if (email) {
    const emailPrefix = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "");
    primary = toTitleCase(emailPrefix);
  } else {
    primary = "Kalcerian";
  }

  // 1. Primary candidate
  candidates.push(primary);

  // 2. Primary without space if it has space
  if (primary.includes(" ")) {
    candidates.push(primary.replace(/\s+/g, ""));
  }

  // 3. Primary with born year if available
  if (bornYear && String(bornYear).length === 4) {
    candidates.push(`${primary}${bornYear.slice(2)}`);
    candidates.push(`${primary.replace(/\s+/g, "")}${bornYear}`);
  }

  // 4. Primary with numeric suffixes
  const numSuffixes = ["123", "1", "7", "99", "88", "777", "01"];
  for (const suf of numSuffixes) {
    candidates.push(`${primary}${suf}`);
    if (primary.includes(" ")) {
      candidates.push(`${primary.replace(/\s+/g, "")}${suf}`);
    }
  }

  // Remove duplicates
  return Array.from(new Set(candidates));
}

export async function findFirstAvailableUsername(candidates, checkAvailabilityFn) {
  for (const candidate of candidates) {
    try {
      const isAvailable = await checkAvailabilityFn(candidate);
      if (isAvailable) {
        return candidate;
      }
    } catch {
      // Continue to next candidate on error
    }
  }
  return candidates[0] || "Kalcerian";
}
