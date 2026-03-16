export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { ROLES } from "@/lib/roles";
import { encryptApiKey, maskApiKey, decryptApiKey } from "@/lib/crypto";

function normalizeBaseUrl(url: string): string {
  return url
    .replace(/\/(chat\/completions|models|images\/generations|completions)\/?$/i, "")
    .replace(/\/+$/, "");
}

type RouteParams = { params: Promise<{ id: string }> };

// PATCH /api/admin/ai-providers/[id] — 编辑提供商
export async function PATCH(request: Request, { params }: RouteParams) {
  if (!(await requireRole([ROLES.ADMIN]))) return forbiddenResponse();

  const { id } = await params;
  const body = await request.json();
  const { name, baseUrl, apiKey, supportText, supportImage, protocol, isActive } = body;

  const existing = await prisma.aiProvider.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "服务商不存在" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (baseUrl !== undefined) data.baseUrl = normalizeBaseUrl(baseUrl as string);
  if (protocol !== undefined) data.protocol = protocol;
  if (supportText !== undefined) data.supportText = supportText;
  if (supportImage !== undefined) data.supportImage = supportImage;
  if (isActive !== undefined) data.isActive = isActive;
  if (apiKey) data.apiKeyEnc = encryptApiKey(apiKey);

  const updated = await prisma.aiProvider.update({
    where: { id },
    data,
  });

  const plainKey = apiKey ?? decryptApiKey(updated.apiKeyEnc);
  return NextResponse.json({
    data: { ...updated, apiKeyEnc: undefined, apiKeyMasked: maskApiKey(plainKey) },
  });
}

// DELETE /api/admin/ai-providers/[id] — 删除提供商
export async function DELETE(_request: Request, { params }: RouteParams) {
  if (!(await requireRole([ROLES.ADMIN]))) return forbiddenResponse();

  const { id } = await params;

  const existing = await prisma.aiProvider.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "服务商不存在" }, { status: 404 });
  }

  // 检查是否有关联的动作配置
  const linkedActions = await prisma.aiActionConfig.findMany({
    where: { providerId: id },
    select: { actionKey: true, actionLabel: true },
  });

  if (linkedActions.length > 0) {
    const labels = linkedActions.map(a => a.actionLabel).join("、");
    return NextResponse.json(
      { error: `无法删除：以下动作仍在使用该服务商 — ${labels}。请先修改动作映射。` },
      { status: 409 },
    );
  }

  await prisma.aiProvider.delete({ where: { id } });
  return NextResponse.json({ data: { id } });
}
