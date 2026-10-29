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

    // If Vercel Blob Token is configured, upload directly to Vercel Blob
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

    if (blobToken) {
      const blob = await put(filename, file, {
        access: "public",
        token: blobToken,
      });

      return NextResponse.json({
        success: true,
        url: blob.url,
        provider: "vercel-blob",
      });
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

