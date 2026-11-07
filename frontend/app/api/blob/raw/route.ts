import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const blobUrl = searchParams.get("url");

    if (!blobUrl) {
      return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
    }

    const options: { access: "private"; token?: string } = { access: "private" };
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      options.token = process.env.BLOB_READ_WRITE_TOKEN;
    }

    const result = await get(blobUrl, options);
    if (!result || !result.stream) {
      return NextResponse.json({ error: "Blob not found" }, { status: 404 });
    }

    const totalSize = Number(result.blob.size) || 0;
    const rangeHeader = req.headers.get("range");

    if (rangeHeader && totalSize > 0) {
      const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
      if (match) {
        const fullBuffer = new Uint8Array(await new Response(result.stream as ReadableStream).arrayBuffer());
        const actualTotal = fullBuffer.byteLength || totalSize;
        const start = match[1] ? parseInt(match[1], 10) : 0;
        const requestedEnd = match[2] ? parseInt(match[2], 10) : actualTotal - 1;
        const safeStart = Math.max(0, Math.min(start, actualTotal - 1));
        const safeEnd = Math.max(safeStart, Math.min(requestedEnd, actualTotal - 1));
        const sliced = fullBuffer.subarray(safeStart, safeEnd + 1);

        return new NextResponse(sliced, {
          status: 206,
          headers: {
            "Content-Type": result.blob.contentType || "application/octet-stream",
            "Cache-Control": "public, max-age=31536000, immutable",
            "Accept-Ranges": "bytes",
            "Content-Range": `bytes ${safeStart}-${safeEnd}/${actualTotal}`,
            "Content-Length": String(sliced.byteLength),
          },
        });
      }
    }

    const headers: Record<string, string> = {
      "Content-Type": result.blob.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Accept-Ranges": "bytes",
    };
    if (totalSize) {
      headers["Content-Length"] = String(totalSize);
    }

    return new NextResponse(result.stream as ReadableStream, {
      status: 200,
      headers,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to retrieve blob";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

