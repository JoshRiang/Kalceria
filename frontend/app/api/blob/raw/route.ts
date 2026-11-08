import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawBlobUrl = searchParams.get("url");
    const isDownload = searchParams.get("download") === "1";
    const rawFilename = searchParams.get("filename") || "";

    if (!rawBlobUrl) {
      return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
    }

    // Strip any client-side #t=start,end media fragments so blob lookup never 404s
    const blobUrl = rawBlobUrl.split("#")[0];
    const safeFilename = rawFilename
      ? rawFilename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120)
      : "";

    const options: { access: "private"; token?: string } = { access: "private" };
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      options.token = process.env.BLOB_READ_WRITE_TOKEN;
    }

    let result: Awaited<ReturnType<typeof get>> | null = null;
    try {
      result = await get(blobUrl, options);
    } catch {
      result = null;
    }

    // Safe fallback for public Vercel Blob URLs (strictly allowlisted to *.blob.vercel-storage.com)
    if (!result || !result.stream) {
      let parsedHost = "";
      try {
        parsedHost = new URL(blobUrl).hostname.toLowerCase();
      } catch {
        parsedHost = "";
      }
      if (parsedHost.endsWith(".blob.vercel-storage.com")) {
        const fetchHeaders: Record<string, string> = {};
        const incomingRange = req.headers.get("range");
        if (incomingRange) {
          fetchHeaders["Range"] = incomingRange;
        }
        const upstream = await fetch(blobUrl, { headers: fetchHeaders });
        if ((upstream.ok || upstream.status === 206) && upstream.body) {
          const upstreamHeaders: Record<string, string> = {
            "Content-Type": upstream.headers.get("content-type") || "application/octet-stream",
            "Cache-Control": "public, max-age=31536000, immutable",
            "Accept-Ranges": "bytes",
          };
          const upstreamLen = upstream.headers.get("content-length");
          if (upstreamLen) upstreamHeaders["Content-Length"] = upstreamLen;
          const contentRange = upstream.headers.get("content-range");
          if (contentRange) upstreamHeaders["Content-Range"] = contentRange;
          if (isDownload) {
            const dlName = safeFilename || "kalceria-media";
            upstreamHeaders["Content-Disposition"] = `attachment; filename="${dlName}"`;
          }
          return new NextResponse(upstream.body, {
            status: upstream.status,
            headers: upstreamHeaders,
          });
        }
      }
      return NextResponse.json({ error: "Blob not found" }, { status: 404 });
    }

    const totalSize = Number(result.blob.size) || 0;
    const rangeHeader = req.headers.get("range");

    if (!isDownload && rangeHeader && totalSize > 0) {
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
    if (isDownload) {
      const dlName = safeFilename || "kalceria-media";
      headers["Content-Disposition"] = `attachment; filename="${dlName}"`;
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

