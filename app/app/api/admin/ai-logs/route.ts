export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { ROLES } from "@/lib/roles";

// GET /api/admin/ai-logs — 分页查询 AI 调用记录
export async function GET(request: Request) {
  const session = await requireRole([ROLES.ADMIN, ROLES.RD_MANAGER]);
  if (!session) return forbiddenResponse();

  const role = (session.user as { role?: string })?.role;
  const userId = (session.user as { id?: string })?.id;

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "20", 10)));
  const projectId = url.searchParams.get("projectId") || undefined;
  const actionType = url.searchParams.get("actionType") || undefined;
  const range = url.searchParams.get("range") ?? "all";

  // 时间过滤
  const now = new Date();
  let createdAtFilter: { gte: Date } | undefined;
  if (range === "today") {
    createdAtFilter = { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) };
  } else if (range === "week") {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    createdAtFilter = { gte: start };
  } else if (range === "month") {
    const start = new Date(now);
    start.setMonth(start.getMonth() - 1);
    createdAtFilter = { gte: start };
  }

  // rd_manager 只能看自己项目的日志
  let allowedProjectIds: string[] | undefined;
  if (role === ROLES.RD_MANAGER && userId) {
    const myProjects = await prisma.courseRndProject.findMany({
      where: { createdById: userId },
      select: { id: true },
    });
    allowedProjectIds = myProjects.map(p => p.id);
  }

  const where = {
    ...(projectId && { projectId }),
    ...(actionType && { actionType }),
    ...(createdAtFilter && { createdAt: createdAtFilter }),
    ...(allowedProjectIds && { projectId: { in: allowedProjectIds } }),
  };

  const [logs, total] = await Promise.all([
    prisma.courseRndAiCallLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        projectId: true,
        actionType: true,
        modelName: true,
        inputTokens: true,
        outputTokens: true,
        estimatedCost: true,
        createdAt: true,
        promptLog: false,
        messageLog: false,
      },
    }),
    prisma.courseRndAiCallLog.count({ where }),
  ]);

  // 查询项目标题
  const projectIds = [...new Set(logs.map(l => l.projectId).filter((id): id is string => id != null))];
  const projects = projectIds.length > 0
    ? await prisma.courseRndProject.findMany({
        where: { id: { in: projectIds } },
        select: { id: true, title: true },
      })
    : [];
  const titleMap = new Map(projects.map(p => [p.id, p.title]));

  const data = logs.map(l => ({
    ...l,
    projectTitle: l.projectId ? (titleMap.get(l.projectId) ?? "未知项目") : "AI 对话",
  }));

  return NextResponse.json({ data, total, page, pageSize });
}

// DELETE /api/admin/ai-logs — 清理旧日志（仅 admin）
export async function DELETE(request: Request) {
  if (!(await requireRole([ROLES.ADMIN]))) return forbiddenResponse();

  const body = await request.json();
  const { olderThanDays } = body;

  if (![30, 60, 90].includes(olderThanDays)) {
    return NextResponse.json({ error: "请选择 30、60 或 90 天" }, { status: 400 });
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);

  const result = await prisma.courseRndAiCallLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  return NextResponse.json({ data: { deleted: result.count } });
}
