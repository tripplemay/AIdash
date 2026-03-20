export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyExportToken, unauthorizedResponse } from "@/lib/export-auth";

/** Action type to label mapping */
const ACTION_LABELS: Record<string, string> = {
  generate_framework: "生成课程框架",
  revise_framework: "调整框架",
  regenerate_lesson: "生成/重新生成课次",
  revise_lesson: "按意见修改课次",
  rewrite_field: "单字段改写",
  rewrite_teaching_talk: "改写教师话术",
  validate_lesson: "课次审核",
  package_cover: "课程包封面图",
  generate_title: "AI 生成标题",
  chat: "AI 对话",
};

/** GET /api/export/projects/:id/prompts — full AI call chain for a project */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await verifyExportToken(request))) return unauthorizedResponse();

  const { id } = await params;

  // Verify project exists
  const project = await prisma.courseRndProject.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(200, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "50", 10)));

  const [logs, total] = await Promise.all([
    prisma.courseRndAiCallLog.findMany({
      where: { projectId: id },
      select: {
        id: true,
        actionType: true,
        modelName: true,
        inputTokens: true,
        outputTokens: true,
        estimatedCost: true,
        promptLog: true,
        messageLog: true,
        promptTemplateId: true,
        promptTemplateVersionNo: true,
        metadataJson: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.courseRndAiCallLog.count({ where: { projectId: id } }),
  ]);

  // Calculate sequence number (1-based, accounting for pagination)
  const startSequence = (page - 1) * pageSize + 1;

  const data = logs.map((log, i) => {
    // Extract lessonNo from metadataJson if available
    let lessonNo: number | null = null;
    if (log.metadataJson) {
      try {
        const meta = JSON.parse(log.metadataJson);
        if (typeof meta.lessonNo === "number") lessonNo = meta.lessonNo;
      } catch { /* ignore */ }
    }

    // Determine promptTemplateActionKey from actionType
    const promptTemplateActionKey = log.promptTemplateId ? log.actionType : null;

    return {
      id: log.id,
      sequence: startSequence + i,
      actionType: log.actionType,
      actionLabel: ACTION_LABELS[log.actionType] ?? log.actionType,
      lessonNo,
      modelName: log.modelName,
      promptTemplateId: log.promptTemplateId ?? null,
      promptTemplateActionKey,
      promptTemplateVersionNo: log.promptTemplateVersionNo ?? null,
      promptLog: log.promptLog,
      messageLog: log.messageLog,
      inputTokens: log.inputTokens,
      outputTokens: log.outputTokens,
      estimatedCost: log.estimatedCost,
      createdAt: log.createdAt,
    };
  });

  return NextResponse.json({ data, total, page, pageSize });
}
