import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const filename = `events/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    // Support both modern Vercel OIDC (BLOB_STORE_ID / Vercel runtime) and static BLOB_READ_WRITE_TOKEN
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    const blobStoreId = process.env.BLOB_STORE_ID;
    const isVercel = Boolean(process.env.VERCEL);

    if (blobToken || blobStoreId || isVercel) {
      try {
        const options: { access: "public" | "private"; token?: string } = { access: "public" };
        if (blobToken) {
          options.token = blobToken;
        }

        let blob;
        let isPrivate = false;
        try {
          blob = await put(filename, file, options);
        } catch (firstErr: unknown) {
          const msg = firstErr instanceof Error ? firstErr.message : "";
          // If store is configured with private access, seamlessly retry with private access
          if (msg.includes("Cannot use public access on a private store") || msg.includes("private store")) {
            options.access = "private";
            blob = await put(filename, file, options);
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
        });
      } catch (blobErr: unknown) {
        const errMsg = blobErr instanceof Error ? blobErr.message : "Vercel Blob upload failed";
        console.warn("Vercel Blob put failed:", errMsg);
        if (isVercel) {
          return NextResponse.json({ error: errMsg }, { status: 500 });
        }
      }
    }

    // Graceful fallback for local development or when token is pending configuration:
    // Convert to high-performance base64 data URL so user can immediately preview and submit
    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "video/mp4";
    const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;

    return NextResponse.json({
      success: true,
      url: dataUrl,
      provider: "local-preview-fallback",
      message: "BLOB_READ_WRITE_TOKEN not yet detected. Using safe preview fallback.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to upload file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

