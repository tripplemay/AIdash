export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs";

const IMAGES_DIR = process.env.AI_IMAGES_DIR
  ?? path.join(process.cwd(), "public", "ai-images");

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const segments = (await params).path;
  const resolved = path.resolve(path.join(IMAGES_DIR, ...segments));

  // 防止路径穿越
  if (!resolved.startsWith(IMAGES_DIR)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = fs.readFileSync(resolved);
  const ext = path.extname(resolved).toLowerCase();
  const mime = ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "application/octet-stream";

  return new NextResponse(body, {
    headers: {
      "Content-Type": mime,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
