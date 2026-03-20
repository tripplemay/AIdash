export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { ROLES } from "@/lib/roles";
import { encryptApiKey, decryptApiKey, maskApiKey } from "@/lib/crypto";

/** Keys that store encrypted values (API keys, secrets) */
const ENCRYPTED_KEYS = new Set(["tavily_api_key", "export_api_token"]);

/** Allowed config keys (whitelist) */
const ALLOWED_KEYS = new Set(["tavily_api_key", "export_api_token", "usd_to_cny"]);

/** GET /api/admin/system-config — list allowed config entries */
export async function GET() {
  const session = await requireRole([ROLES.ADMIN]);
  if (!session) return forbiddenResponse();

  const configs = await prisma.systemConfig.findMany({
    where: { key: { in: Array.from(ALLOWED_KEYS) } },
  });

  const data = configs.map((c) => {
    const isEncrypted = ENCRYPTED_KEYS.has(c.key);
    let displayValue = c.value;
    if (isEncrypted && c.value) {
      try {
        const decrypted = decryptApiKey(c.value);
        displayValue = maskApiKey(decrypted);
      } catch {
        displayValue = "****";
      }
    }
    return {
      key: c.key,
      value: displayValue,
      isConfigured: !!c.value,
      updatedAt: c.updatedAt,
    };
  });

  // Add missing keys as unconfigured
  for (const key of ALLOWED_KEYS) {
    if (!data.find((d) => d.key === key)) {
      data.push({ key, value: "", isConfigured: false, updatedAt: new Date() });
    }
  }

  return NextResponse.json({ data });
}

/** PUT /api/admin/system-config — update a config entry */
export async function PUT(request: Request) {
  const session = await requireRole([ROLES.ADMIN]);
  if (!session) return forbiddenResponse();

  const body = await request.json().catch(() => ({}));
  const { key, value } = body;

  if (!key || typeof key !== "string") {
    return NextResponse.json({ error: "缺少配置键" }, { status: 400 });
  }

  if (!ALLOWED_KEYS.has(key)) {
    return NextResponse.json({ error: "不允许修改此配置" }, { status: 400 });
  }

  const isEncrypted = ENCRYPTED_KEYS.has(key);
  const storedValue = isEncrypted && value ? encryptApiKey(value) : (value ?? "");

  await prisma.systemConfig.upsert({
    where: { key },
    update: { value: storedValue },
    create: { key, value: storedValue },
  });

  return NextResponse.json({ data: { key, success: true } });
}
