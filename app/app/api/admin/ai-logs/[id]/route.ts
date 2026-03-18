export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { ROLES } from "@/lib/roles";

// GET /api/admin/ai-logs/[id] — 获取单条调用详情（含完整 prompt）
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireRole([ROLES.ADMIN, ROLES.RD_MANAGER]);
  if (!session) return forbiddenResponse();

  const { id } = await params;
  const role = (session.user as { role?: string })?.role;
  const userId = (session.user as { id?: string })?.id;

  const log = await prisma.courseRndAiCallLog.findUnique({
    where: { id },
  });

  if (!log) {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }

  // rd_manager 只能查看自己项目的日志
  if (role === ROLES.RD_MANAGER && userId) {
    const project = await prisma.courseRndProject.findUnique({
      where: { id: log.projectId },
      select: { createdById: true },
    });
    if (project?.createdById !== userId) {
      return forbiddenResponse();
    }
  }

  return NextResponse.json({
    data: {
      id: log.id,
      projectId: log.projectId,
      actionType: log.actionType,
      modelName: log.modelName,
      inputTokens: log.inputTokens,
      outputTokens: log.outputTokens,
      estimatedCost: log.estimatedCost,
      promptLog: log.promptLog,
      messageLog: log.messageLog,
      createdAt: log.createdAt,
    },
  });
}
