export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { ROLES } from "@/lib/roles";

/**
 * GET /api/admin/ai-actions/registry
 * 从 Preset(ai_action_registry) 加载全部已注册动作，
 * 合并 AiActionConfig 中的配置状态，返回完整列表。
 */
export async function GET() {
  if (!(await requireRole([ROLES.TEACHER, ROLES.RD_MANAGER, ROLES.ADMIN]))) {
    return forbiddenResponse();
  }

  // 1. 从 Preset 加载动作注册表
  const registryPresets = await prisma.preset.findMany({
    where: { category: "ai_action_registry", isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { name: true, value: true },
  });

  // 2. 加载已配置的动作
  const configs = await prisma.aiActionConfig.findMany({
    select: { actionKey: true },
  });
  const configuredKeys = new Set(configs.map((c) => c.actionKey));

  // 3. 合并
  const actions = registryPresets.map((p) => {
    let label = p.name;
    let type = "text";
    try {
      const parsed = JSON.parse(p.value);
      label = parsed.label ?? p.name;
      type = parsed.type ?? "text";
    } catch { /* use defaults */ }

    return {
      key: p.name,
      label,
      type,
      configured: configuredKeys.has(p.name),
    };
  });

  return NextResponse.json({ data: actions });
}
