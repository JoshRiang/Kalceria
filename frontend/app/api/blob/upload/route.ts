import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { optimizeUploadMedia } from "@/lib/mediaOptimizer";
import { EVENT_CLIP_PREFIX, EVENT_CLIP_PURPOSE } from "@/lib/eventClipStorage";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Security Enforcement: Strictly accept allowed media formats with MIME inference for Blobs
    const mimeToExt: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
      "video/mp4": "mp4",
      "video/webm": "webm",
      "audio/webm": "webm",
      "audio/mp4": "m4a",
      "audio/m4a": "m4a",
      "audio/ogg": "ogg",
      "audio/wav": "wav",
      "audio/mpeg": "mp3",
      "audio/mp3": "mp3",
    };

    let filename = file.name || "";
    let ext = (filename.split(".").pop() || "").toLowerCase();
    if (!ext || ext === "blob" || !filename.includes(".")) {
      const declaredMime = (file.type || "").toLowerCase().split(";")[0].trim();
      ext = mimeToExt[declaredMime] || "bin";
      filename = `upload-${Date.now()}.${ext}`;
    }

    const allowedExts = ["png", "jpg", "jpeg", "webp", "gif", "mp4", "webm", "m4a", "mp3", "ogg", "wav"];
    if (!allowedExts.includes(ext)) {
      return NextResponse.json(
        { error: "Security enforcement: Only standard image, audio, and video files are allowed" },
        { status: 400 }
      );
    }

    const rawBuffer = Buffer.from(await file.arrayBuffer());
    const declaredMimeType = file.type || "application/octet-stream";

    // Server-side normalization & compression preserving 100% visual fidelity
    const optimized = await optimizeUploadMedia(rawBuffer, filename, declaredMimeType);

    // Event Live Media Feed clips live in their own dated prefix so the 24h reaper can only ever
    // touch clips; every other upload (avatars, covers, chat media) keeps the long-lived prefix.
    const purpose = String(formData.get("purpose") || "").trim().toLowerCase();
    const storedName = optimized.filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const safeFilename =
      purpose === EVENT_CLIP_PURPOSE
        ? `${EVENT_CLIP_PREFIX}${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${storedName}`
        : `events/${Date.now()}-${storedName}`;

    // Support both modern Vercel OIDC (BLOB_STORE_ID / Vercel runtime) and static BLOB_READ_WRITE_TOKEN
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    const blobStoreId = process.env.BLOB_STORE_ID;
    const isVercel = Boolean(process.env.VERCEL);

    if (blobToken || blobStoreId || isVercel) {
      try {
        const options: {
          access: "public" | "private";
          token?: string;
          contentType?: string;
          addRandomSuffix: boolean;
        } = {
          access: "public",
          contentType: optimized.contentType,
          addRandomSuffix: true,
        };
        if (blobToken) {
          options.token = blobToken;
        }

        let blob;
        let isPrivate = false;
        try {
          blob = await put(safeFilename, optimized.buffer, options);
        } catch (firstErr: unknown) {
          const msg = firstErr instanceof Error ? firstErr.message : "";
          // If store is configured with private access, seamlessly retry with private access
          if (msg.includes("Cannot use public access on a private store") || msg.includes("private store")) {
            options.access = "private";
            blob = await put(safeFilename, optimized.buffer, options);
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

    // Graceful fallback for local development or when token is pending configuration:
    // Convert to normalized base64 data URL so user can immediately preview and submit
    const dataUrl = `data:${optimized.contentType};base64,${optimized.buffer.toString("base64")}`;

    return NextResponse.json({
      success: true,
      url: dataUrl,
      provider: "local-preview-fallback",
      message: "BLOB_READ_WRITE_TOKEN not yet detected. Using normalized preview fallback.",
      optimization: {
        originalSize: optimized.originalSize,
        optimizedSize: optimized.optimizedSize,
        reductionPercent: optimized.reductionPercent,
        dimensions: optimized.dimensions,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to upload file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
