import "./env.js";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import prisma from '../lib/prisma.js';
import { redis } from "../lib/redis.js";
import router from "../routes/index.js";

// ─── Clients ──────────────────────────────────────────────────────────────────


// ─── App ──────────────────────────────────────────────────────────────────────
const app = express();

// ─── CORS (Dynamic) ───────────────────────────────────────────────────────────
const allowedOrigins = (process.env.FRONTEND_URL || "").split(",").map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-jit-token"],
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const redisPing = await redis.ping();
    res.json({ status: "ok", db: "connected", redis: redisPing });
  } catch (err) {
    res.status(503).json({ status: "degraded", error: err.message });
  }
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api", router);

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("[Global Error]", err);
  res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
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
