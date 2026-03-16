export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { ROLES } from "@/lib/roles";

// GET /api/admin/ai-actions — 动作配置列表
export async function GET() {
  if (!(await requireRole([ROLES.ADMIN]))) return forbiddenResponse();

  const actions = await prisma.aiActionConfig.findMany({
    include: { provider: { select: { id: true, name: true } } },
    orderBy: { actionKey: "asc" },
  });

  return NextResponse.json({ data: actions });
}

// POST /api/admin/ai-actions — 新增/更新动作配置（upsert）
export async function POST(request: Request) {
  if (!(await requireRole([ROLES.ADMIN]))) return forbiddenResponse();

  const body = await request.json();
  const { actionKey, actionLabel, actionType, providerId, modelName } = body;

  if (!actionKey || !actionLabel || !actionType || !providerId || !modelName) {
    return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
  }

  const config = await prisma.aiActionConfig.upsert({
    where: { actionKey },
    create: { actionKey, actionLabel, actionType, providerId, modelName },
    update: { actionLabel, actionType, providerId, modelName },
  });

  return NextResponse.json({ data: config });
}
