export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { COURSE_RND_ROLES } from "@/lib/permissions";
import { getProviderAndModel } from "@/lib/ai/provider";
import { calculateCallCostFromDb } from "@/lib/ai/pricing-service";
import { buildContentData, type AiLessonOutput } from "@/lib/ai/build-content-data";
import { getBaselinePrompt } from "@/lib/ai/prompts";
import { getSystemPrompt, type TemplateContext } from "@/lib/ai/template-engine";
import { saveAiImage } from "@/lib/ai/image-store";
import { loadFrameworkContext, buildLessonListWithOverview, buildGeneratedLessonsSummary } from "@/lib/ai/lesson-context";

const SYSTEM_PROMPT = `你是课程设计助手。用户会提供当前课程方案和修改意见。

你的任务：只输出需要修改的字段和新值，不要输出未变更的字段。

输出要求：只输出 JSON，不要用 markdown 代码块包裹，不要输出其他文字。

示例 1 — 用户说"换一个更有吸引力的标题"：
{ "title": "新标题" }

示例 2 — 用户说"增加一个关于网络安全的卡点"：
{ "issues": [原有卡点1, 原有卡点2, 原有卡点3, 原有卡点4, {"question":"新卡点","answer":"应对方法"}] }

示例 3 — 用户说"第三个环节时间太短，延长到15分钟"：
{ "flow": [原有环节1, 原有环节2, {"title":"环节3","time":"20-35 分钟",...改动后的完整环节}, 原有环节4, ...] }

注意：
- 只输出变更的字段
- 如果修改的是数组中的某一项（如 flow 的某个环节），输出完整数组（包含未变更的项）
- 字段名必须和原方案一致`;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; lessonNo: string }> }
) {
  const session = await requireRole(COURSE_RND_ROLES);
  if (!session) return forbiddenResponse();

  const { id, lessonNo } = await params;
  const userId = (session.user as { id?: string })?.id;
  const lessonNoInt = parseInt(lessonNo);

  const body = await request.json();
  const { feedback, planVersionId, targetSection } = body;

  if (!feedback) {
    return NextResponse.json({ error: "请输入修改意见" }, { status: 400 });
  }

  // 读取项目信息（供模板引擎使用）
  const project = await prisma.courseRndProject.findUnique({
    where: { id },
    select: {
      title: true, ageRange: true, level: true, courseDirection: true, coreDeliverable: true,
      currentDirectionVersionId: true, currentPlanVersionId: true,
      orgForm: true, deliverableType: true, deliverableName: true,
      imageStylePrompt: true, coreNeeds: true, constraints: true,
    },
  });

  const draft = await prisma.courseRndLessonDraft.findFirst({
    where: { planVersionId, lessonNo: lessonNoInt },
  });

  if (!draft) {
    return NextResponse.json({ error: "课次草稿不存在" }, { status: 404 });
  }

  // 读取当前 AiLessonOutput
  let currentOutput: AiLessonOutput | null = null;
  if (draft.draftJson) {
    try {
      currentOutput = JSON.parse(draft.draftJson);
    } catch {}
  }

  if (!currentOutput) {
    return NextResponse.json({ error: "请先生成课程方案" }, { status: 400 });
  }

  // 图片类修改：用反馈作为新 prompt 重新生成图片
  const IMAGE_TARGETS = ["hero_image", "illustration", "template_image"];
  if (targetSection && IMAGE_TARGETS.includes(targetSection)) {
    const actionKey = targetSection === "hero_image" ? "lesson_cover" : "lesson_illustration";
    let imageProvider, imageModel;
    try {
      ({ provider: imageProvider, model: imageModel } = await getProviderAndModel(actionKey));
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "图片模型未配置" }, { status: 503 });
    }

    if (!imageProvider.generateImage) {
      return NextResponse.json({ error: "该服务商不支持图片生成" }, { status: 503 });
    }

    // 用原始 prompt + 本次反馈组合成生成 prompt（不累积历史修改）
    const promptField = targetSection === "hero_image" ? "hero_image_prompt"
      : targetSection === "illustration" ? "illustration_prompt"
      : "template_image_prompt";
    const originalPrompt = (currentOutput as unknown as Record<string, unknown>)[promptField] as string ?? "";
    // 查询构图引导 Preset（仅 hero 图使用）
    const compositionPreset = targetSection === "hero_image"
      ? await prisma.preset.findFirst({ where: { category: "image_composition", isActive: true }, select: { value: true } })
      : null;
    const compositionGuide = compositionPreset?.value ? `${compositionPreset.value} ` : "";
    const stylePrefix = project?.imageStylePrompt ? `Style: ${project.imageStylePrompt}. ` : "";
    const ageHint = project?.ageRange ? `Designed for ${project.ageRange} age group. ` : "";
    const generationPrompt = originalPrompt
      ? `${compositionGuide}${ageHint}${stylePrefix}${originalPrompt}\n\nAdditional requirements: ${feedback}`
      : `${compositionGuide}${ageHint}${stylePrefix}${feedback}`;

    try {
      const img = await imageProvider.generateImage({ prompt: generationPrompt, model: imageModel });
      const savedUrl = await saveAiImage(img.url, `lessons/${id}`);

      // 只更新图片 URL，保留原始 prompt 不变
      const urlField = targetSection === "hero_image" ? "hero_image_url"
        : targetSection === "illustration" ? "illustration_url"
        : "template_image_url";
      (currentOutput as unknown as Record<string, unknown>)[urlField] = savedUrl;

      const contentData = buildContentData(currentOutput);

      await prisma.courseRndLessonDraft.update({
        where: { id: draft.id },
        data: {
          contentData: JSON.stringify(contentData),
          draftJson: JSON.stringify(currentOutput),
          lastFeedback: feedback,
        },
      });

      // 记录图片修改成本
      const imgCost = await calculateCallCostFromDb(actionKey, 0, 0);
      await prisma.courseRndAiCallLog.create({
        data: {
          projectId: id, pageKey: "workbench", actionType: actionKey,
          modelName: imageModel, inputTokens: 0, outputTokens: 0,
          estimatedCost: imgCost, userId: userId ?? null,
        },
      });

      return NextResponse.json({ data: { contentData } });
    } catch (e) {
      return NextResponse.json({
        error: `图片生成失败：${e instanceof Error ? e.message : String(e)}`,
      }, { status: 502 });
    }
  }

  let provider, model;
  try {
    ({ provider, model } = await getProviderAndModel("revise_lesson"));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "AI 服务未配置" }, { status: 503 });
  }

  // section ID → 对应字段的提示
  const sectionFieldHint: Record<string, string> = {
    core: "positioning, conditions, objectives, minimum_output",
    ai_value: "ai_value_quote, ai_rounds, without_ai, student_must_do",
    prep: "teacher_prep, equipment, reminder",
    flow: "flow",
    issues: "issues",
    materials: "outcome_template, demo_case",
    review: "review_questions, parent_message",
  };

  const sectionHint = targetSection && sectionFieldHint[targetSection]
    ? `\n注意：本次修改只涉及「${targetSection}」相关字段（${sectionFieldHint[targetSection]}），其他字段必须保持不变。`
    : "";

  const userMessage = `当前方案：
${draft.draftJson}

修改意见${targetSection ? `（针对 ${targetSection} 板块）` : ""}：${feedback}${sectionHint}

只输出需要修改的字段 JSON。`;

  // 加载框架上下文
  const { summary: courseSummary } = await loadFrameworkContext(project?.currentDirectionVersionId ?? null);

  // 优先使用数据库 prompt 模板，fallback 到硬编码
  const templateCtx: TemplateContext = {
    title: project?.title,
    courseDirection: project?.courseDirection,
    ageRange: project?.ageRange,
    level: project?.level,
    orgForm: project?.orgForm,
    deliverableType: project?.deliverableType,
    deliverableName: project?.deliverableName ?? project?.coreDeliverable,
    imageStylePrompt: project?.imageStylePrompt,
    coreNeeds: project?.coreNeeds,
    constraints: project?.constraints,
    courseSummary,
    lessonNo: lessonNoInt,
    lessonTitle: draft.title,
    currentPlan: draft.draftJson,
    feedback,
    targetSection,
  };
  const dbPrompt = await getSystemPrompt("revise_lesson", templateCtx);
  const systemPrompt = dbPrompt ?? (getBaselinePrompt() + SYSTEM_PROMPT);

  const result = await provider.chat({
    systemPrompt,
    userMessage,
    model,
    maxTokens: 2048,
  });

  // 解析 AI 输出的变更字段
  let changes: Partial<AiLessonOutput>;
  try {
    let raw = result.content;
    raw = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "");
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("未找到 JSON");
    changes = JSON.parse(jsonMatch[0]);
  } catch {
    return NextResponse.json({ error: "AI 输出解析失败，请重试" }, { status: 502 });
  }

  // 合并变更到现有数据
  const merged: AiLessonOutput = { ...currentOutput, ...changes };

  // 系统组装 v2 contentData
  const contentData = buildContentData(merged);

  // 更新数据库
  await prisma.courseRndLessonDraft.update({
    where: { id: draft.id },
    data: {
      title: merged.title || draft.title,
      contentData: JSON.stringify(contentData),
      draftJson: JSON.stringify(merged),
      lastFeedback: feedback,
    },
  });

  // 记录 AI 调用
  const cost = await calculateCallCostFromDb("revise_lesson", result.inputTokens, result.outputTokens);
  await prisma.courseRndAiCallLog.create({
    data: {
      projectId: id,
      pageKey: "workbench",
      actionType: "revise_lesson",
      modelName: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      estimatedCost: cost,
      userId: userId ?? null,
    },
  });

  return NextResponse.json({
    data: {
      lessonNo: lessonNoInt,
      contentData,
      changes: Object.keys(changes),
      tokens: { input: result.inputTokens, output: result.outputTokens },
      cost,
    },
  });
}
