import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "public", "logo-avatar.png");
    if (fs.existsSync(filePath)) {
      const imageBuffer = fs.readFileSync(filePath);
      return new NextResponse(imageBuffer, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
    return NextResponse.redirect("https://kalceria.id/logo-avatar.png", 307);
  } catch {
    return NextResponse.redirect("https://kalceria.id/logo-avatar.png", 307);
  }
}
