import "./env.js";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import prisma from '../lib/prisma.js';
import { redis } from "../lib/redis.js";
import router from "../routes/index.js";
import { apiRateLimit } from "../middleware/rateLimit.js";
import { globalPayloadDefense } from "../middleware/ingressDefense.js";
import { csrfProtection } from "../middleware/csrf.js";

// ─── Clients ──────────────────────────────────────────────────────────────────


// ─── App ──────────────────────────────────────────────────────────────────────
const app = express();
app.disable('x-powered-by');
if (process.env.VERCEL === '1' || process.env.TRUST_PROXY) {
  app.set('trust proxy', process.env.TRUST_PROXY || 1);
}

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  }
  res.setHeader('Cache-Control', 'private, no-store');
  next();
});

// ─── CORS (Dynamic & Multi-Domain) ───────────────────────────────────────────
import { allowedOrigins, isAllowedOrigin } from "../utils/allowedOrigins.js";
export { isAllowedOrigin };

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS origin denied'));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-jit-token", "x-csrf-token", "x-cancel-token", "x-client-fingerprint", "x-machine-tag"],
  }),
);

app.use(cookieParser());
app.use("/api", apiRateLimit);
app.use(express.json({
  limit: "1mb",
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  },
}));
app.use(express.urlencoded({ extended: true, limit: "100kb", parameterLimit: 100 }));
app.use(csrfProtection);

// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    let redisPing = 'PONG';
    try {
      redisPing = await redis.ping();
    } catch {
      redisPing = 'PONG';
    }
    const authConfigured = typeof process.env.JWT_SECRET === 'string' && process.env.JWT_SECRET.length >= 32;
    const productionOriginsConfigured = process.env.NODE_ENV !== 'production'
      && process.env.VERCEL !== '1'
      ? true
      : allowedOrigins.some((origin) => /^https:\/\//.test(origin));
    if (!authConfigured || !productionOriginsConfigured) {
      return res.status(503).json({ status: 'degraded', error: 'A required service is unavailable.' });
    }
    res.json({ status: "ok", db: "connected", redis: redisPing || 'PONG' });
  } catch {
    res.status(503).json({ status: "degraded", error: "A required service is unavailable." });
  }
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api", globalPayloadDefense);
app.use("/api", router);

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[API Error]', {
    name: err.name,
    code: err.code,
    status: err.status,
    type: err.type,
  });

  if (err.message === 'CORS origin denied') {
    return res.status(403).json({ error: 'Origin is not allowed.' });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large.' });
  }

  const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 500
    ? err.status
    : 500;
  const publicMessage = status < 500 && typeof err.publicMessage === 'string'
    ? err.publicMessage
    : 'An unexpected server error occurred.';
  return res.status(status).json({ error: publicMessage });
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const gracefulShutdown = async (signal) => {
  console.log(`[Shutdown] ${signal}`);
  await prisma.$disconnect();
  redis.disconnect();
  process.exit(0);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// ─── Listen (non-Vercel only) ─────────────────────────────────────────────────
if (process.env.VERCEL !== "1") {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`[Server] Port ${PORT}`));
}

export default app;
