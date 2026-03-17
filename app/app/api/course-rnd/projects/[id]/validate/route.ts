export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { COURSE_RND_ROLES } from "@/lib/permissions";
import { getProviderAndModel } from "@/lib/ai/provider";
import { calculateCallCostFromDb } from "@/lib/ai/pricing-service";
import { getBaselinePrompt, validateLessonPrompt } from "@/lib/ai/prompts";
import { getSystemPrompt, type TemplateContext } from "@/lib/ai/template-engine";
import { loadFrameworkContext } from "@/lib/ai/lesson-context";

interface DraftJson {
  title?: string;
  subtitle?: string;
  goal?: string;
  outcome?: string;
  flow?: Array<{ title?: string; time?: string }>;
  issues?: Array<unknown>;
}

/** Extract concise fields from draftJson to control token usage */
function summarizeDraft(raw: string): string {
  try {
    const parsed: DraftJson = JSON.parse(raw);
    const parts: string[] = [];
    if (parsed.title) parts.push(`标题：${parsed.title}`);
    if (parsed.subtitle) parts.push(`副标题：${parsed.subtitle}`);
    if (parsed.goal) parts.push(`目标：${parsed.goal}`);
    if (parsed.outcome) parts.push(`成果：${parsed.outcome}`);
    if (Array.isArray(parsed.flow)) {
      const flowSummary = parsed.flow
        .map(f => `${f.title ?? "未命名"}(${f.time ?? "?"})`)
        .join("、");
      parts.push(`流程：${flowSummary}`);
    }
    if (Array.isArray(parsed.issues)) {
      parts.push(`卡点数：${parsed.issues.length}`);
    }
    return parts.join("\n");
  } catch {
    return "(解析失败)";
  }
}

// POST /api/course-rnd/projects/[id]/validate
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(COURSE_RND_ROLES);
  if (!session) return forbiddenResponse();

  const { id } = await params;
  const userId = (session.user as { id?: string })?.id;

  // Load project
  const project = await prisma.courseRndProject.findUnique({
    where: { id },
    select: {
      title: true,
      ageRange: true,
      level: true,
      courseDirection: true,
      coreDeliverable: true,
      orgForm: true,
      deliverableType: true,
      coreNeeds: true,
      constraints: true,
      currentPlanVersionId: true,
      currentDirectionVersionId: true,
    },
  });

  if (!project) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  if (!project.currentPlanVersionId) {
    return NextResponse.json({ error: "无方案版本，无法审核" }, { status: 400 });
  }

  // Load lesson drafts for current plan version
  const drafts = await prisma.courseRndLessonDraft.findMany({
    where: { planVersionId: project.currentPlanVersionId },
    select: { lessonNo: true, title: true, draftJson: true },
    orderBy: { lessonNo: "asc" },
  });

  const draftsWithContent = drafts.filter(d => d.draftJson);
  if (draftsWithContent.length === 0) {
    return NextResponse.json({ error: "尚无已生成的课次方案，无法审核" }, { status: 400 });
  }

  // Load framework context
  const { summary: courseSummary } = await loadFrameworkContext(project.currentDirectionVersionId);

  // Get AI provider
  let provider, model;
  try {
    ({ provider, model } = await getProviderAndModel("validate_lesson"));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI 审核服务未配置" },
      { status: 503 }
    );
  }

  // Build system prompt (DB template fallback to hardcoded)
  const templateCtx: TemplateContext = {
    title: project.title,
    courseDirection: project.courseDirection,
    ageRange: project.ageRange,
    level: project.level,
    orgForm: project.orgForm,
    deliverableType: project.deliverableType,
    coreNeeds: project.coreNeeds,
    constraints: project.constraints,
    courseSummary,
  };
  const dbPrompt = await getSystemPrompt("validate_lesson", templateCtx);
  const systemPrompt = dbPrompt ?? (getBaselinePrompt() + validateLessonPrompt());

  // Build concise user message
  const projectInfo = [
    `课程标题：${project.title}`,
    `课程方向：${project.courseDirection ?? "未指定"}`,
    `年龄段：${project.ageRange ?? "未指定"}`,
    `级别：${project.level ?? "未指定"}`,
    `课程组织形态：${project.orgForm ?? "未指定"}`,
    `产出物类型：${project.deliverableType ?? "未指定"}`,
    `核心诉求：${project.coreNeeds ?? "无"}`,
    `补充约束：${project.constraints ?? "无"}`,
  ].join("\n");

  const lessonsText = draftsWithContent
    .map(d => `--- 第 ${d.lessonNo} 课：${d.title} ---\n${summarizeDraft(d.draftJson!)}`)
    .join("\n\n");

  const userMessage = `课程信息：\n${projectInfo}\n\n${courseSummary ? `课程整体定位：${courseSummary}\n\n` : ""}全部课次概要：\n${lessonsText}\n\n请逐项审核以上课程方案。`;

  // Call AI
  const result = await provider.chat({
    systemPrompt,
    userMessage,
    model,
    maxTokens: 4096,
  });

  // Parse JSON output
  let report: { overallPass: boolean; items: Array<{ criterion: string; status: string; detail?: string }>; summary: string };
  try {
    let raw = result.content;
    raw = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "");
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("未找到 JSON");
    report = JSON.parse(jsonMatch[0]);
  } catch {
    return NextResponse.json({ error: "AI 审核输出解析失败，请重试" }, { status: 502 });
  }

  // Log AI call
  const cost = await calculateCallCostFromDb("validate_lesson", result.inputTokens, result.outputTokens);
  await prisma.courseRndAiCallLog.create({
    data: {
      projectId: id,
      pageKey: "workbench",
      actionType: "validate_lesson",
      modelName: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      estimatedCost: cost,
      userId: userId ?? null,
    },
  });

  return NextResponse.json({
    data: {
      overallPass: report.overallPass,
      items: report.items,
      summary: report.summary,
      tokens: { input: result.inputTokens, output: result.outputTokens },
      cost,
    },
  });
}
