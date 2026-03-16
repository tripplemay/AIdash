export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { ROLES } from "@/lib/roles";
import { encryptApiKey, maskApiKey, decryptApiKey } from "@/lib/crypto";

// GET /api/admin/ai-providers — 列表（脱敏）
export async function GET() {
  if (!(await requireRole([ROLES.ADMIN]))) return forbiddenResponse();

  const providers = await prisma.aiProvider.findMany({
    orderBy: { createdAt: "asc" },
  });

  // 脱敏 API Key
  const masked = providers.map(p => ({
    ...p,
    apiKeyEnc: undefined,
    apiKeyMasked: maskApiKey(decryptApiKey(p.apiKeyEnc)),
  }));

  return NextResponse.json({ data: masked });
}

// POST /api/admin/ai-providers — 新增
export async function POST(request: Request) {
  if (!(await requireRole([ROLES.ADMIN]))) return forbiddenResponse();

  const body = await request.json();
  const { name, baseUrl, apiKey, protocol, supportText, supportImage } = body;

  if (!name || !baseUrl || !apiKey) {
    return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
  }

  const provider = await prisma.aiProvider.create({
    data: {
      name,
      baseUrl,
      apiKeyEnc: encryptApiKey(apiKey),
      protocol: protocol ?? "openai",
      supportText: supportText ?? true,
      supportImage: supportImage ?? false,
    },
  });

  return NextResponse.json({
    data: { ...provider, apiKeyEnc: undefined, apiKeyMasked: maskApiKey(apiKey) },
  }, { status: 201 });
}
