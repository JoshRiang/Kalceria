import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { isTrustedR2Host } from "@/lib/r2Storage";

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

    // Strip any client-side #t=start,end media fragments so lookup never 404s
    const blobUrl = rawBlobUrl.split("#")[0];
    const safeFilename = rawFilename
      ? rawFilename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120)
      : "";

    // Fast path for trusted Cloudflare R2 CDN URLs (e.g. same-origin attachment downloads & Range proxy)
    let parsedTarget: URL | null = null;
    try {
      parsedTarget = new URL(blobUrl);
    } catch {
      parsedTarget = null;
    }

    if (
      parsedTarget &&
      parsedTarget.protocol === "https:" &&
      isTrustedR2Host(parsedTarget.hostname)
    ) {
      const fetchHeaders: Record<string, string> = {};
      const incomingRange = req.headers.get("range");
      if (incomingRange) {
        fetchHeaders["Range"] = incomingRange;
      }
      const upstream = await fetch(parsedTarget.href, { headers: fetchHeaders });
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
          const dlName = safeFilename || parsedTarget.pathname.split("/").pop() || "kalceria-media";
          upstreamHeaders["Content-Disposition"] = `attachment; filename="${dlName}"`;
        }
        return new NextResponse(upstream.body, {
          status: upstream.status,
          headers: upstreamHeaders,
        });
      }
      return NextResponse.json(
        { error: "Media object not found" },
        { status: upstream.status === 404 ? 404 : 502, headers: { "Cache-Control": "no-store" } }
      );
    }

    const options: { access: "private"; token?: string } = { access: "private" };
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      options.token = process.env.BLOB_READ_WRITE_TOKEN;
    }

    let result: Awaited<ReturnType<typeof get>> | null = null;
    let blobStoreError: string | null = null;
    try {
      result = await get(blobUrl, options);
    } catch (err: unknown) {
      result = null;
      blobStoreError = err instanceof Error ? `${err.name}: ${err.message}` : String(err || "");
    }

    // Safe fallback for public Vercel Blob URLs (strictly allowlisted to *.blob.vercel-storage.com)
    if (!result || !result.stream) {
      let parsedHost = "";
      try {
        parsedHost = new URL(blobUrl).hostname.toLowerCase();
      } catch {
        parsedHost = "";
      }
      if (parsedHost.endsWith(".blob.vercel-storage.com") && !parsedHost.includes(".private.")) {
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
      // 1. Auto-heal check: if legacy Vercel Blob file was migrated to Cloudflare R2 under the same key, stream from R2
      if (parsedTarget && parsedHost.endsWith(".blob.vercel-storage.com")) {
        const cleanKey = parsedTarget.pathname.replace(/^\/+/, "");
        if (cleanKey && !cleanKey.includes("..")) {
          const r2Base = String(process.env.R2_PUBLIC_BASE_URL || "https://cdn.kalceria.id").trim().replace(/\/+$/, "");
          try {
            const r2Headers: Record<string, string> = {};
            const incomingRange = req.headers.get("range");
            if (incomingRange) r2Headers["Range"] = incomingRange;
            const r2Res = await fetch(`${r2Base}/${cleanKey}`, { headers: r2Headers });
            if ((r2Res.ok || r2Res.status === 206) && r2Res.body) {
              const outHeaders: Record<string, string> = {
                "Content-Type": r2Res.headers.get("content-type") || "application/octet-stream",
                "Cache-Control": "public, max-age=31536000, immutable",
                "Accept-Ranges": "bytes",
              };
              const uLen = r2Res.headers.get("content-length");
              if (uLen) outHeaders["Content-Length"] = uLen;
              const cRange = r2Res.headers.get("content-range");
              if (cRange) outHeaders["Content-Range"] = cRange;
              if (isDownload) {
                const dlName = safeFilename || cleanKey.split("/").pop() || "kalceria-media";
                outHeaders["Content-Disposition"] = `attachment; filename="${dlName}"`;
              }
              return new NextResponse(r2Res.body, { status: r2Res.status, headers: outHeaders });
            }
          } catch {}
        }
      }

      const isStoreSuspended = Boolean(
        blobStoreError && /suspend|inactive|quota|limit|payment|402|503|forbidden|access|blocked/i.test(blobStoreError)
      );
      if (isStoreSuspended) {
        // Prevent broken <img> icons for legacy suspended Vercel Blob avatars until the user re-uploads to R2
        const cleanPath = (parsedTarget?.pathname || "").replace(/^\/+/, "");
        if (!isDownload && /(?:^|\/)avatars?\b|avatar-/i.test(cleanPath)) {
          const rawSeed = (cleanPath.split("/").pop() || "kalcerian").replace(/\.[a-z0-9]+$/i, "");
          const safeSeed = rawSeed.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 64) || "kalcerian";
          return NextResponse.redirect(
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(safeSeed)}`,
            { status: 302, headers: { "Cache-Control": "no-store" } }
          );
        }
        console.warn("[BlobRaw] Upstream Vercel Blob store unavailable:", blobStoreError);
        return NextResponse.json(
          { error: "Media storage temporarily unavailable", code: "BLOB_STORE_UNAVAILABLE" },
          { status: 503, headers: { "Cache-Control": "no-store" } }
        );
      }
      return NextResponse.json(
        { error: "Blob not found" },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    const totalSize = Number(result.blob.size) || 0;
    const rangeHeader = req.headers.get("range");

    if (!isDownload && rangeHeader && totalSize > 0) {
      // Stream directly via upstream downloadUrl if available to avoid buffering in serverless memory
      const directDownloadUrl = (result.blob as { downloadUrl?: string })?.downloadUrl;
      if (directDownloadUrl) {
        try {
          const upstream = await fetch(directDownloadUrl, {
            headers: { Range: rangeHeader },
          });
          if ((upstream.ok || upstream.status === 206) && upstream.body) {
            const streamHeaders: Record<string, string> = {
              "Content-Type": upstream.headers.get("content-type") || result.blob.contentType || "application/octet-stream",
              "Cache-Control": "public, max-age=31536000, immutable",
              "Accept-Ranges": "bytes",
            };
            const uLen = upstream.headers.get("content-length");
            if (uLen) streamHeaders["Content-Length"] = uLen;
            const cRange = upstream.headers.get("content-range");
            if (cRange) streamHeaders["Content-Range"] = cRange;
            return new NextResponse(upstream.body, {
              status: upstream.status,
              headers: streamHeaders,
            });
          }
        } catch {}
      }

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

