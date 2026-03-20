import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptApiKey } from "@/lib/crypto";

/**
 * Verify the export API bearer token.
 * Token is stored encrypted in SystemConfig (key: "export_api_token").
 */
export async function verifyExportToken(request: Request): Promise<boolean> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;

  const token = authHeader.slice(7);
  if (!token) return false;

  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: "export_api_token" },
    });
    if (!config?.value) return false;

    const storedToken = decryptApiKey(config.value);
    if (!storedToken) return false;

    // Constant-time comparison to prevent timing attacks
    const a = Buffer.from(token);
    const b = Buffer.from(storedToken);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { error: "Invalid or missing export token" },
    { status: 401 }
  );
}
