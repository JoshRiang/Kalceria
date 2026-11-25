import { NextRequest, NextResponse } from "next/server";
import { del, list } from "@vercel/blob";
import {
  EVENT_CLIP_PREFIX,
  EVENT_CLIP_REAP_GRACE_MS,
  EVENT_CLIP_TTL_MS,
} from "@/lib/eventClipStorage";
import { deleteR2Objects, isR2Configured, listR2Objects } from "@/lib/r2Storage";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DELETE_BATCH_SIZE = 100;
const MAX_PAGES_PER_RUN = 20;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * Daily storage hygiene: deletes only event clip objects (`event-clips/`) that are older than the
 * 24h clip lifetime plus grace across Cloudflare R2 (primary) and legacy Vercel Blob.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = Date.now() - EVENT_CLIP_TTL_MS - EVENT_CLIP_REAP_GRACE_MS;
  let scanned = 0;
  let deleted = 0;
  let r2Scanned = 0;
  let r2Deleted = 0;

  // 1. Cloudflare R2 primary reaper (complements native R2 48h bucket lifecycle rule)
  if (isR2Configured()) {
    let r2Cursor: string | undefined;
    try {
      for (let page = 0; page < MAX_PAGES_PER_RUN; page += 1) {
        const result = await listR2Objects({
          prefix: EVENT_CLIP_PREFIX,
          cursor: r2Cursor,
          limit: 500,
        });

        const expiredKeys = result.objects
          .filter((obj) => obj.uploaded && new Date(obj.uploaded).getTime() < cutoff)
          .map((obj) => obj.key);
        r2Scanned += result.objects.length;
        scanned += result.objects.length;

        for (let i = 0; i < expiredKeys.length; i += DELETE_BATCH_SIZE) {
          const batch = expiredKeys.slice(i, i + DELETE_BATCH_SIZE);
          const count = await deleteR2Objects(batch);
          r2Deleted += count;
          deleted += count;
        }

        if (!result.truncated || !result.cursor) break;
        r2Cursor = result.cursor;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "R2 reaper failed";
      return NextResponse.json({ error: message, scanned, deleted, r2Scanned, r2Deleted }, { status: 500 });
    }
  }

  // 2. Legacy Vercel Blob cleanup (best-effort; never fails R2 reaper if Vercel store is inactive)
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token) {
    let cursor: string | undefined;
    try {
      for (let page = 0; page < MAX_PAGES_PER_RUN; page += 1) {
        const result = await list({
          prefix: EVENT_CLIP_PREFIX,
          limit: 1000,
          cursor,
          token,
        });

        const expiredUrls = result.blobs
          .filter((blob) => new Date(blob.uploadedAt).getTime() < cutoff)
          .map((blob) => blob.url);
        scanned += result.blobs.length;

        for (let i = 0; i < expiredUrls.length; i += DELETE_BATCH_SIZE) {
          const batch = expiredUrls.slice(i, i + DELETE_BATCH_SIZE);
          await del(batch, { token });
          deleted += batch.length;
        }

        if (!result.hasMore || !result.cursor) break;
        cursor = result.cursor;
      }
    } catch (err: unknown) {
      console.warn("[ClipReaper] Legacy Vercel Blob sweep skipped:", err instanceof Error ? err.message : err);
    }
  }

  return NextResponse.json({ ok: true, scanned, deleted, r2Scanned, r2Deleted });
}

