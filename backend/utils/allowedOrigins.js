// ─── Allowed Origins & Origin Validation Utility ────────────────────────────
const envOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((o) => o.trim().replace(/\/+$/, ""))
  .filter(Boolean);

export const DEFAULT_ALLOWED_ORIGINS = [
  "https://kalceria.id",
  "https://www.kalceria.id",
  "http://kalceria.id",
  "http://www.kalceria.id",
  "https://kalceria.or.id",
  "https://www.kalceria.or.id",
  "http://kalceria.or.id",
  "http://www.kalceria.or.id",
  "https://kalceria-frontend.vercel.app",
  "https://kalceria-backend.vercel.app",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
];

export const allowedOrigins = Array.from(new Set([...DEFAULT_ALLOWED_ORIGINS, ...envOrigins]));

export function isAllowedOrigin(origin) {
  if (!origin) return true;

  const normalized = origin.trim().replace(/\/+$/, "");
  if (allowedOrigins.includes(normalized)) return true;

  try {
    const url = new URL(normalized);
    const hostname = url.hostname.toLowerCase();

    // 1. Official domain and any subdomains (*.kalceria.id, *.kalceria.or.id)
    if (
      hostname === "kalceria.id" ||
      hostname.endsWith(".kalceria.id") ||
      hostname === "kalceria.or.id" ||
      hostname.endsWith(".kalceria.or.id")
    ) {
      return true;
    }

    // 2. All Vercel deployment URLs for Kalceria
    if (hostname.endsWith(".vercel.app") && (hostname.includes("kalceria") || hostname.includes("reinathanajah"))) {
      return true;
    }

    // 3. Localhost / local dev IP
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".local")) {
      return true;
    }
  } catch {}

  return false;
}

