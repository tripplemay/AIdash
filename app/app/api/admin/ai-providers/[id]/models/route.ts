export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { ROLES } from "@/lib/roles";
import { decryptApiKey } from "@/lib/crypto";

// GET /api/admin/ai-providers/[id]/models — 从服务商 API 拉取可用模型列表
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireRole([ROLES.ADMIN]))) return forbiddenResponse();

  const { id } = await params;

  const provider = await prisma.aiProvider.findUnique({ where: { id } });
  if (!provider) {
    return NextResponse.json({ error: "服务商不存在" }, { status: 404 });
  }

  const apiKey = decryptApiKey(provider.apiKeyEnc);

  try {
    const res = await fetch(`${provider.baseUrl}/models`, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `获取模型列表失败：${res.status}` }, { status: 502 });
    }

    const json = await res.json();
    const models: Array<{ id: string; name: string }> = (json.data ?? []).map((m: { id: string; name?: string }) => ({
      id: m.id,
      name: m.name ?? m.id,
    }));

    models.sort((a, b) => a.id.localeCompare(b.id));

    return NextResponse.json({ data: models });
  } catch (e) {
    return NextResponse.json({ error: `连接失败：${e instanceof Error ? e.message : String(e)}` }, { status: 502 });
  }
}
