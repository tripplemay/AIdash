export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { COURSE_RND_ROLES } from "@/lib/permissions";
import { getProviderAndModel, calculateCallCost } from "@/lib/ai/provider";
import { buildContentData, type AiLessonOutput } from "@/lib/ai/build-content-data";
import { getBaselinePrompt } from "@/lib/ai/prompts";

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

  const result = await provider.chat({
    systemPrompt: getBaselinePrompt() + SYSTEM_PROMPT,
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
  const cost = calculateCallCost(result.model, result.inputTokens, result.outputTokens);
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
