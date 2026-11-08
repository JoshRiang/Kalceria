import { NextRequest, NextResponse } from "next/server";
import { del, list } from "@vercel/blob";
import {
  EVENT_CLIP_PREFIX,
  EVENT_CLIP_REAP_GRACE_MS,
  EVENT_CLIP_TTL_MS,
} from "@/lib/eventClipStorage";

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
 * Daily storage hygiene: deletes only event clip blobs (`event-clips/`) that are older than the
 * 24h clip lifetime plus grace. Each clip is removed individually by its own age, so a long-lived
 * event never loses a newer clip because an older one expired.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = Date.now() - EVENT_CLIP_TTL_MS - EVENT_CLIP_REAP_GRACE_MS;
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  let cursor: string | undefined;
  let scanned = 0;
  let deleted = 0;

  try {
    for (let page = 0; page < MAX_PAGES_PER_RUN; page += 1) {
      const result = await list({
        prefix: EVENT_CLIP_PREFIX,
        limit: 1000,
        cursor,
        ...(token ? { token } : {}),
      });

      const expiredUrls = result.blobs
        .filter((blob) => new Date(blob.uploadedAt).getTime() < cutoff)
        .map((blob) => blob.url);
      scanned += result.blobs.length;

      for (let i = 0; i < expiredUrls.length; i += DELETE_BATCH_SIZE) {
        const batch = expiredUrls.slice(i, i + DELETE_BATCH_SIZE);
        await del(batch, token ? { token } : undefined);
        deleted += batch.length;
      }

      if (!result.hasMore || !result.cursor) break;
      cursor = result.cursor;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Reaper failed";
    return NextResponse.json({ error: message, scanned, deleted }, { status: 500 });
  }

  return NextResponse.json({ ok: true, scanned, deleted });
}

