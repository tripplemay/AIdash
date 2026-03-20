export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { COURSE_RND_ROLES } from "@/lib/permissions";
import { getProviderAndModel } from "@/lib/ai/provider";
import { calculateCallCostFromDb } from "@/lib/ai/pricing-service";
import { generateFrameworkPrompt, getBaselinePrompt } from "@/lib/ai/prompts";
import { resolveTemplate, type TemplateContext } from "@/lib/ai/template-engine";

// POST /api/course-rnd/projects/[id]/generate-framework
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(COURSE_RND_ROLES);
  if (!session) return forbiddenResponse();

  const { id } = await params;
  const userId = (session.user as { id?: string })?.id;

  // 读取项目
  const project = await prisma.courseRndProject.findUnique({ where: { id } });
  if (!project) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  // 可选：接收前端传来的覆盖字段
  let inputData = {
    targetAudience: project.targetAudience,
    courseDirection: project.courseDirection,
    ageRange: project.ageRange,
    level: project.level,
    lessonCount: project.lessonCount,
    coreDeliverable: project.coreDeliverable,
    roughFramework: project.roughFramework,
    coreNeeds: project.coreNeeds,
    constraints: project.constraints,
    orgForm: project.orgForm,
    deliverableType: project.deliverableType,
    deliverableName: project.deliverableName,
    imageStyle: project.imageStyle,
    imageStylePrompt: project.imageStylePrompt,
  };

  try {
    const body = await request.json();
    inputData = { ...inputData, ...body };
  } catch {
    // 没有 body 也行，用项目数据
  }

  // 调用 AI
  let provider, model;
  try {
    ({ provider, model } = await getProviderAndModel("generate_framework"));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "AI 服务未配置" }, { status: 503 });
  }
  const userMessage = `请为以下课程生成框架：

课程对象：${inputData.targetAudience ?? "未指定"}
课程方向：${inputData.courseDirection ?? "未指定"}
年龄段：${inputData.ageRange ?? "未指定"}
级别：${inputData.level ?? "未指定"}
课程组织形态：${inputData.orgForm ?? "未指定"}
产出物类型：${inputData.deliverableType ?? "未指定"}
课次数：${inputData.lessonCount ?? "未指定"}
核心产出物：${inputData.coreDeliverable ?? "未指定"}
大致框架：${inputData.roughFramework ?? "无"}
核心诉求：${inputData.coreNeeds ?? "无"}
补充约束：${inputData.constraints ?? "无"}`;

  // 优先使用数据库 prompt 模板，fallback 到硬编码
  const templateCtx: TemplateContext = {
    title: project.title,
    courseDirection: inputData.courseDirection,
    ageRange: inputData.ageRange,
    level: inputData.level,
    orgForm: inputData.orgForm,
    deliverableType: inputData.deliverableType,
    deliverableName: inputData.deliverableName ?? inputData.coreDeliverable,
    lessonCount: inputData.lessonCount,
    imageStylePrompt: inputData.imageStylePrompt,
    roughFramework: inputData.roughFramework,
    coreNeeds: inputData.coreNeeds,
    constraints: inputData.constraints,
  };
  const templateResult = await resolveTemplate("generate_framework", templateCtx);
  const systemPrompt = templateResult?.prompt ?? (getBaselinePrompt() + generateFrameworkPrompt());

  const result = await provider.chat({
    systemPrompt,
    userMessage,
    model,
  });

  // 解析 AI 输出
  let parsed: { summary: string; framework: Array<{ lessonNo: number; title: string; overview: string }> };
  try {
    let raw = result.content;
    raw = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "");
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI 输出中未找到 JSON");
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    return NextResponse.json({
      error: "AI 输出解析失败",
      raw: result.content,
    }, { status: 502 });
  }

  // 计算当前最大版本号
  const maxVersion = await prisma.courseRndDirectionVersion.findFirst({
    where: { projectId: id },
    orderBy: { versionNo: "desc" },
    select: { versionNo: true },
  });
  const nextVersionNo = (maxVersion?.versionNo ?? 0) + 1;

  // 保存版本
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

  // 更新项目的当前版本指向 + 同步字段
  await prisma.courseRndProject.update({
    where: { id },
    data: {
      currentDirectionVersionId: version.id,
      ...(inputData.targetAudience && { targetAudience: inputData.targetAudience }),
      ...(inputData.courseDirection && { courseDirection: inputData.courseDirection }),
      ...(inputData.ageRange && { ageRange: inputData.ageRange }),
      ...(inputData.level && { level: inputData.level }),
      ...(inputData.lessonCount && { lessonCount: inputData.lessonCount }),
      ...(inputData.coreDeliverable && { coreDeliverable: inputData.coreDeliverable }),
      ...(inputData.roughFramework && { roughFramework: inputData.roughFramework }),
      ...(inputData.coreNeeds && { coreNeeds: inputData.coreNeeds }),
      ...(inputData.constraints && { constraints: inputData.constraints }),
      ...(inputData.orgForm && { orgForm: inputData.orgForm }),
      ...(inputData.deliverableType && { deliverableType: inputData.deliverableType }),
      ...(inputData.deliverableName && { deliverableName: inputData.deliverableName }),
      ...(inputData.imageStyle && { imageStyle: inputData.imageStyle }),
      ...(inputData.imageStylePrompt && { imageStylePrompt: inputData.imageStylePrompt }),
    },
  });

  // 记录 AI 调用日志
  const cost = await calculateCallCostFromDb("generate_framework", result.inputTokens, result.outputTokens);
  await prisma.courseRndAiCallLog.create({
    data: {
      projectId: id,
      pageKey: "direction",
      actionType: "generate_framework",
      modelName: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      estimatedCost: cost,
      userId: userId ?? null,
      promptLog: systemPrompt,
      messageLog: userMessage,
      promptTemplateId: templateResult?.templateId ?? null,
      promptTemplateVersionNo: templateResult?.templateVersionNo ?? null,
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
