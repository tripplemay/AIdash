export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { COURSE_RND_ROLES } from "@/lib/permissions";
import { getProviderAndModel } from "@/lib/ai/provider";
import { calculateCallCostFromDb } from "@/lib/ai/pricing-service";
import { reviseFrameworkPrompt, getBaselinePrompt } from "@/lib/ai/prompts";
import { getSystemPrompt, type TemplateContext } from "@/lib/ai/template-engine";

// POST /api/course-rnd/projects/[id]/revise-framework
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(COURSE_RND_ROLES);
  if (!session) return forbiddenResponse();

  const { id } = await params;
  const userId = (session.user as { id?: string })?.id;

  const body = await request.json();
  const { feedback } = body;
  if (!feedback) {
    return NextResponse.json({ error: "请输入修改意见" }, { status: 400 });
  }

  // 1. Load project
  const project = await prisma.courseRndProject.findUnique({
    where: { id },
    select: {
      title: true,
      courseDirection: true,
      ageRange: true,
      level: true,
      orgForm: true,
      deliverableType: true,
      deliverableName: true,
      coreDeliverable: true,
      imageStylePrompt: true,
      coreNeeds: true,
      constraints: true,
      currentDirectionVersionId: true,
    },
  });
  if (!project) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  // 2. Load current framework
  if (!project.currentDirectionVersionId) {
    return NextResponse.json({ error: "尚未生成框架" }, { status: 400 });
  }
  const currentVersion = await prisma.courseRndDirectionVersion.findUnique({
    where: { id: project.currentDirectionVersionId },
    select: { frameworkJson: true, summary: true },
  });
  if (!currentVersion?.frameworkJson) {
    return NextResponse.json({ error: "当前框架数据不存在" }, { status: 400 });
  }

  // 3. Get AI provider
  let provider, model;
  try {
    ({ provider, model } = await getProviderAndModel("revise_framework"));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI 服务未配置" },
      { status: 503 }
    );
  }

  // 4. Build prompts
  const templateCtx: TemplateContext = {
    title: project.title,
    courseDirection: project.courseDirection,
    ageRange: project.ageRange,
    level: project.level,
    orgForm: project.orgForm,
    deliverableType: project.deliverableType,
    deliverableName: project.deliverableName ?? project.coreDeliverable,
    coreNeeds: project.coreNeeds,
    constraints: project.constraints,
    imageStylePrompt: project.imageStylePrompt,
    feedback,
  };
  const dbPrompt = await getSystemPrompt("revise_framework", templateCtx);
  const systemPrompt = dbPrompt ?? (getBaselinePrompt() + reviseFrameworkPrompt());

  const userMessage = `课程信息：
课程标题：${project.title}
课程方向：${project.courseDirection ?? "未指定"}
年龄段：${project.ageRange ?? "未指定"}
级别：${project.level ?? "未指定"}
课程组织形态：${project.orgForm ?? "未指定"}
产出物类型：${project.deliverableType ?? "未指定"}
核心诉求：${project.coreNeeds ?? "无"}
补充约束：${project.constraints ?? "无"}

当前框架：
${currentVersion.frameworkJson}

修改意见：${feedback}

请根据修改意见调整框架，保持未被提及的部分不变。只输出 JSON。`;

  // 5. Call AI
  const result = await provider.chat({ systemPrompt, userMessage, model });

  // 6. Parse output
  let parsed: {
    summary: string;
    framework: Array<{ lessonNo: number; title: string; overview: string }>;
  };
  try {
    let raw = result.content;
    raw = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "");
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI 输出中未找到 JSON");
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return NextResponse.json(
      { error: "AI 输出解析失败，请重试", raw: result.content },
      { status: 502 }
    );
  }

  // 7. Create new direction version
  const maxVersion = await prisma.courseRndDirectionVersion.findFirst({
    where: { projectId: id },
    orderBy: { versionNo: "desc" },
    select: { versionNo: true },
  });
  const nextVersionNo = (maxVersion?.versionNo ?? 0) + 1;

  const version = await prisma.courseRndDirectionVersion.create({
    data: {
      projectId: id,
      versionNo: nextVersionNo,
      summary: parsed.summary,
      frameworkJson: JSON.stringify(parsed.framework),
      isSelected: true,
      promptSnapshot: `[SYSTEM PROMPT]\n${systemPrompt}\n\n[USER MESSAGE]\n${userMessage}`,
      modelName: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    },
  });

  // 8. Update project pointer
  await prisma.courseRndProject.update({
    where: { id },
    data: { currentDirectionVersionId: version.id },
  });

  // 9. Log AI call
  const cost = await calculateCallCostFromDb(
    "revise_framework",
    result.inputTokens,
    result.outputTokens
  );
  await prisma.courseRndAiCallLog.create({
    data: {
      projectId: id,
      pageKey: "direction",
      actionType: "revise_framework",
      modelName: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      estimatedCost: cost,
      userId: userId ?? null,
    },
  });

  return NextResponse.json({
    data: {
      directionVersionId: version.id,
      versionNo: nextVersionNo,
      summary: parsed.summary,
      framework: parsed.framework,
      tokens: { input: result.inputTokens, output: result.outputTokens },
      cost,
    },
  });
}
