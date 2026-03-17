export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { ROLES } from "@/lib/roles";

// GET /api/admin/ai-usage?range=today|week|month|all
export async function GET(request: Request) {
  if (!(await requireRole([ROLES.TEACHER, ROLES.RD_MANAGER, ROLES.ADMIN]))) return forbiddenResponse();

  const url = new URL(request.url);
  const range = url.searchParams.get("range") ?? "all";

  // 构建时间过滤
  const now = new Date();
  let createdAtFilter: { gte: Date } | undefined;

  if (range === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    createdAtFilter = { gte: start };
  } else if (range === "week") {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    createdAtFilter = { gte: start };
  } else if (range === "month") {
    const start = new Date(now);
    start.setMonth(start.getMonth() - 1);
    createdAtFilter = { gte: start };
  }

  const where = createdAtFilter ? { createdAt: createdAtFilter } : {};

  const [usageByModel, usageByAction, totalUsage] = await Promise.all([
    prisma.courseRndAiCallLog.groupBy({
      by: ["modelName"],
      where,
      _sum: { inputTokens: true, outputTokens: true, estimatedCost: true },
      _count: true,
    }),
    prisma.courseRndAiCallLog.groupBy({
      by: ["actionType"],
      where,
      _sum: { inputTokens: true, outputTokens: true, estimatedCost: true },
      _count: true,
    }),
    prisma.courseRndAiCallLog.aggregate({
      where,
      _sum: { estimatedCost: true },
      _count: true,
    }),
  ]);

  return NextResponse.json({
    data: {
      byModel: usageByModel.map(u => ({
        model: u.modelName,
        calls: u._count,
        tokens: (u._sum.inputTokens ?? 0) + (u._sum.outputTokens ?? 0),
        cost: u._sum.estimatedCost ?? 0,
      })),
      byAction: usageByAction.map(u => ({
        action: u.actionType,
        calls: u._count,
        tokens: (u._sum.inputTokens ?? 0) + (u._sum.outputTokens ?? 0),
        cost: u._sum.estimatedCost ?? 0,
      })),
      totalCost: totalUsage._sum.estimatedCost ?? 0,
      totalCalls: totalUsage._count,
    },
  });
}
