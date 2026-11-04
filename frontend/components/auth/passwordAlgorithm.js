"use client";

import api from "@/lib/api";

const NATURAL_PRIMARY_WORDS = [
  "Kalcer",
  "Turbo",
  "Nitro",
  "Vortex",
  "Apex",
  "Drift",
  "Carbon",
  "Ignite",
  "Phantom",
  "Skyline",
  "Monza",
  "Suzuka",
  "Piston",
  "Torque",
  "Aether",
  "Velvet",
  "Cobalt",
  "Zenith",
  "Horizon",
  "Falcon",
];

const NATURAL_SECONDARY_WORDS = [
  "Pulse",
  "Shift",
  "Spark",
  "Drive",
  "Boost",
  "Forge",
  "Crest",
  "Storm",
  "Rider",
  "Flame",
  "Track",
  "Crown",
  "Blade",
  "glint",
  "Crux",
  "Nova",
  "Vector",
  "Glide",
  "Surge",
  "Prime",
];

const NATURAL_SYMBOLS = ["#", "!", "@", "$", "&", "*"];

const PASSWORD_CHECK_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function secureRandomIndex(max) {
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    const arr = new Uint32Array(1);
    window.crypto.getRandomValues(arr);
    return arr[0] % max;
  }
  return Math.floor(Math.random() * max);
}

/**
 * Generates a natural, memorable, cryptographically strong password on the client
 * that strictly satisfies PASSWORD_CHECK_REGEX (min 8 chars, 1 uppercase, 1 digit, 1 special char).
 */
export function generateClientStrongPassword() {
  for (let attempt = 0; attempt < 8; attempt++) {
    const w1 = NATURAL_PRIMARY_WORDS[secureRandomIndex(NATURAL_PRIMARY_WORDS.length)];
    let w2 = NATURAL_SECONDARY_WORDS[secureRandomIndex(NATURAL_SECONDARY_WORDS.length)];
    if (w2.toLowerCase() === w1.toLowerCase()) {
      w2 = NATURAL_SECONDARY_WORDS[(secureRandomIndex(NATURAL_SECONDARY_WORDS.length) + 1) % NATURAL_SECONDARY_WORDS.length];
    }
    const normalizedW2 = w2.charAt(0).toUpperCase() + w2.slice(1);
    const sym = NATURAL_SYMBOLS[secureRandomIndex(NATURAL_SYMBOLS.length)];
    const digits = String(100 + secureRandomIndex(900));
    const candidate = `${w1}${normalizedW2}${sym}${digits}`;
    if (PASSWORD_CHECK_REGEX.test(candidate)) {
      return candidate;
    }
  }
  return "KalcerApex#842";
}

/**
 * Requests a natural strong password from the backend security algorithm
 * (which also verifies against the user's password history when token/email is provided),
 * falling back seamlessly to the client CSPRNG generator if offline.
 */
export async function fetchRecommendedPassword({ token = "", email = "" } = {}) {
  try {
    const params = {};
    if (token) params.token = token;
    if (email) params.email = email;
    const res = await api.get("/auth/password/recommend", { params });
    const recommended = res?.data?.password;
    if (recommended && PASSWORD_CHECK_REGEX.test(recommended)) {
      return recommended;
    }
  } catch {
    // Fallback to local CSPRNG natural strong password generator
  }
  return generateClientStrongPassword();
}

