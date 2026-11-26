import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { optimizeUploadMedia } from "@/lib/mediaOptimizer";
import { EVENT_CLIP_PREFIX, EVENT_CLIP_PURPOSE } from "@/lib/eventClipStorage";
import {
  buildR2ObjectKey,
  deleteR2Objects,
  getR2ObjectBuffer,
  isR2Configured,
  putR2Object,
} from "@/lib/r2Storage";

export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB hard cap
const MAX_CHUNK_BYTES = 4 * 1024 * 1024; // Each individual chunk stays safely under Vercel's 4.5 MB limit
const MAX_CHUNK_COUNT = 4;

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/x-m4v": "m4v",
  "video/mp4v-es": "mp4",
  "video/quicktime": "mov",
  "video/3gpp": "3gp",
  "video/webm": "webm",
  "video/x-matroska": "mkv",
  "audio/webm": "webm",
  "audio/mp4": "m4a",
  "audio/m4a": "m4a",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
};

const ALLOWED_EXTS = [
  "png", "jpg", "jpeg", "webp", "gif",
  "mp4", "m4v", "mp4v", "mpg4", "mov", "3gp", "webm", "mkv",
  "m4a", "mp3", "ogg", "wav",
];

function validateAndNormalizeFileMeta(rawName: string, rawType: string) {
  let filename = rawName || "";
  let ext = (filename.split(".").pop() || "").toLowerCase();
  const declaredMime = (rawType || "").toLowerCase().split(";")[0].trim();
  if (!ext || ext === "blob" || !filename.includes(".")) {
    ext = MIME_TO_EXT[declaredMime] || (declaredMime.startsWith("video/") ? "mp4" : "bin");
    filename = `upload-${Date.now()}.${ext}`;
  }
  const allowed =
    ALLOWED_EXTS.includes(ext) ||
    declaredMime.startsWith("video/") ||
    declaredMime.startsWith("image/") ||
    declaredMime.startsWith("audio/");
  return { allowed, filename, ext, declaredMimeType: rawType || "application/octet-stream" };
}

async function persistFinalMediaBuffer(
  rawBuffer: Buffer,
  filename: string,
  declaredMimeType: string,
  purpose: string
) {
  if (rawBuffer.byteLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "Ukuran file melebihi batas 10 MB. Mohon gunakan file dengan ukuran lebih kecil." },
      { status: 413 }
    );
  }

  // Server-side normalization & compression preserving 100% visual fidelity
  const optimized = await optimizeUploadMedia(rawBuffer, filename, declaredMimeType);

  const storedName = optimized.filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  const safeFilename =
    purpose === EVENT_CLIP_PURPOSE
      ? buildR2ObjectKey(EVENT_CLIP_PURPOSE, storedName, EVENT_CLIP_PREFIX)
      : buildR2ObjectKey(purpose || "events", storedName, EVENT_CLIP_PREFIX);

  // 1. Primary persistent edge storage: Cloudflare R2 (zero egress, global CDN, native Range 206)
  if (isR2Configured()) {
    try {
      const r2 = await putR2Object({
        key: safeFilename,
        body: optimized.buffer,
        contentType: optimized.contentType,
        timeoutMs: 30_000,
      });
      return NextResponse.json({
        success: true,
        url: r2.url,
        rawBlobUrl: r2.url,
        access: "public",
        provider: "cloudflare-r2",
        key: r2.key,
        optimization: {
          originalSize: optimized.originalSize,
          optimizedSize: optimized.optimizedSize,
          reductionPercent: optimized.reductionPercent,
          dimensions: optimized.dimensions,
        },
      });
    } catch (r2Err: unknown) {
      const errMsg = r2Err instanceof Error ? r2Err.message : "Cloudflare R2 upload failed";
      console.warn("Cloudflare R2 put failed, falling back:", errMsg);
    }
  }

  // 2. Legacy secondary fallback: Vercel Blob (only if R2 is unavailable or unconfigured)
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  const blobStoreId = process.env.BLOB_STORE_ID;
  const hasBlobCredentials = Boolean(blobToken || blobStoreId);

  if (hasBlobCredentials) {
    try {
      const options: {
        access: "public" | "private";
        token?: string;
        contentType?: string;
        addRandomSuffix: boolean;
      } = {
        access: "public",
        contentType: optimized.contentType,
        addRandomSuffix: false,
      };
      if (blobToken) {
        options.token = blobToken;
      }

      const putWithTimeout = async (putOptions: typeof options) => {
        let timerId: ReturnType<typeof setTimeout> | null = null;
        try {
          return await Promise.race([
            put(safeFilename, optimized.buffer, putOptions),
            new Promise<never>((_, reject) => {
              timerId = setTimeout(
                () => reject(new Error("Vercel Blob put operation timed out after 25000ms")),
                25000
              );
            }),
          ]);
        } finally {
          if (timerId) clearTimeout(timerId);
        }
      };

      let blob;
      let isPrivate = false;
      try {
        blob = await putWithTimeout(options);
      } catch (firstErr: unknown) {
        const msg = firstErr instanceof Error ? firstErr.message : "";
        if (msg.includes("Cannot use public access on a private store") || msg.includes("private store")) {
          options.access = "private";
          blob = await putWithTimeout(options);
          isPrivate = true;
        } else {
          throw firstErr;
        }
      }

      const finalUrl = isPrivate
        ? `/api/blob/raw?url=${encodeURIComponent(blob.url)}`
        : blob.url;

      return NextResponse.json({
        success: true,
        url: finalUrl,
        rawBlobUrl: blob.url,
        access: isPrivate ? "private" : "public",
        provider: "vercel-blob",
        optimization: {
          originalSize: optimized.originalSize,
          optimizedSize: optimized.optimizedSize,
          reductionPercent: optimized.reductionPercent,
          dimensions: optimized.dimensions,
        },
      });
    } catch (blobErr: unknown) {
      const errMsg = blobErr instanceof Error ? blobErr.message : "Vercel Blob upload failed";
      console.warn("Vercel Blob put failed, falling back to persistent payload:", errMsg);
    }
  }

  // Graceful fallback for local development without cloud storage credentials
  const dataUrl = `data:${optimized.contentType};base64,${optimized.buffer.toString("base64")}`;

  return NextResponse.json({
    success: true,
    url: dataUrl,
    provider: "local-preview-fallback",
    optimization: {
      originalSize: optimized.originalSize,
      optimizedSize: optimized.optimizedSize,
      reductionPercent: optimized.reductionPercent,
      dimensions: optimized.dimensions,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const chunkAction = String(formData.get("chunkAction") || "").trim().toLowerCase();

    // Stateless chunked R2 staging for files between 3.5 MB and 10 MB (bypasses Vercel's 4.5 MB request cap cleanly)
    if (chunkAction === "part") {
      if (!isR2Configured()) {
        return NextResponse.json(
          { error: "Cloudflare R2 belum dikonfigurasi untuk unggahan ukuran besar." },
          { status: 503 }
        );
      }
      const uploadId = String(formData.get("uploadId") || "").trim();
      const chunkIndex = Number(formData.get("chunkIndex"));
      const chunkFile = formData.get("file") as File | null;
      if (
        !/^[a-zA-Z0-9_-]{8,48}$/.test(uploadId) ||
        !Number.isInteger(chunkIndex) ||
        chunkIndex < 0 ||
        chunkIndex >= MAX_CHUNK_COUNT ||
        !chunkFile
      ) {
        return NextResponse.json({ error: "Invalid upload chunk parameters." }, { status: 400 });
      }
      const chunkBuf = Buffer.from(await chunkFile.arrayBuffer());
      if (chunkBuf.byteLength === 0 || chunkBuf.byteLength > MAX_CHUNK_BYTES) {
        return NextResponse.json({ error: "Chunk size out of bounds." }, { status: 413 });
      }
      const partKey = `_tmp-uploads/${uploadId}/part-${chunkIndex}`;
      await putR2Object({
        key: partKey,
        body: chunkBuf,
        contentType: "application/octet-stream",
        timeoutMs: 25_000,
      });
      return NextResponse.json({ success: true, chunkIndex, size: chunkBuf.byteLength });
    }

    if (chunkAction === "complete") {
      if (!isR2Configured()) {
        return NextResponse.json(
          { error: "Cloudflare R2 belum dikonfigurasi untuk unggahan ukuran besar." },
          { status: 503 }
        );
      }
      const uploadId = String(formData.get("uploadId") || "").trim();
      const totalChunks = Number(formData.get("totalChunks"));
      const rawFilename = String(formData.get("filename") || "");
      const rawContentType = String(formData.get("contentType") || "application/octet-stream");
      const purpose = String(formData.get("purpose") || "").trim().toLowerCase();

      if (
        !/^[a-zA-Z0-9_-]{8,48}$/.test(uploadId) ||
        !Number.isInteger(totalChunks) ||
        totalChunks < 1 ||
        totalChunks > MAX_CHUNK_COUNT
      ) {
        return NextResponse.json({ error: "Invalid chunk completion parameters." }, { status: 400 });
      }

      const meta = validateAndNormalizeFileMeta(rawFilename, rawContentType);
      if (!meta.allowed) {
        return NextResponse.json(
          { error: "Security enforcement: Only standard image, audio, and video files are allowed" },
          { status: 400 }
        );
      }

      const partKeys = Array.from({ length: totalChunks }, (_, idx) => `_tmp-uploads/${uploadId}/part-${idx}`);
      try {
        const partBuffers = await Promise.all(partKeys.map((k) => getR2ObjectBuffer(k, 25_000)));
        const assembled = Buffer.concat(partBuffers);
        return await persistFinalMediaBuffer(assembled, meta.filename, meta.declaredMimeType, purpose);
      } finally {
        deleteR2Objects(partKeys).catch(() => {});
      }
    }

    // Standard single-request fast path (files <= 3.5 MB)
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const meta = validateAndNormalizeFileMeta(file.name || "", file.type || "");
    if (!meta.allowed) {
      return NextResponse.json(
        { error: "Security enforcement: Only standard image, audio, and video files are allowed" },
        { status: 400 }
      );
    }

    const rawBuffer = Buffer.from(await file.arrayBuffer());
    const purpose = String(formData.get("purpose") || "").trim().toLowerCase();
    return await persistFinalMediaBuffer(rawBuffer, meta.filename, meta.declaredMimeType, purpose);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to upload file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
