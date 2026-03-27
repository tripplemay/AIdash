export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { COURSE_RND_ROLES } from "@/lib/permissions";
import { getProviderAndModel } from "@/lib/ai/provider";
import { calculateCallCostFromDb } from "@/lib/ai/pricing-service";
import { saveAiImage } from "@/lib/ai/image-store";
import { buildContentData, type AiLessonOutput } from "@/lib/ai/build-content-data";

/** 图片类型 → 动作 key 映射（开放式，新增类型自动 fallback） */
const IMAGE_ACTION_MAP: Record<string, string> = {
  hero: "lesson_cover",
  illustration: "lesson_illustration",
  template: "lesson_illustration",
};

/** 图片类型 → AI 输出中 prompt 字段名映射 */
const IMAGE_PROMPT_FIELD: Record<string, string> = {
  hero: "hero_image_prompt",
  illustration: "illustration_prompt",
  template: "template_image_prompt",
};

/** 图片类型 → AI 输出中 URL 字段名映射 */
const IMAGE_URL_FIELD: Record<string, string> = {
  hero: "hero_image_url",
  illustration: "illustration_url",
  template: "template_image_url",
};

// POST /api/course-rnd/projects/[id]/lessons/[lessonNo]/regenerate-image
// body: { imageType: "hero" | "illustration" | "template" }
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; lessonNo: string }> },
) {
  const session = await requireRole(COURSE_RND_ROLES);
  if (!session) return forbiddenResponse();

  const { id, lessonNo } = await params;
  const lessonNoInt = parseInt(lessonNo, 10);

  const body = await request.json();
  const imageType = body.imageType as string;

  if (!imageType || !IMAGE_ACTION_MAP[imageType]) {
    return NextResponse.json({ error: `无效的图片类型: ${imageType ?? "未指定"}` }, { status: 400 });
  }

  // 读取项目和草稿
  const project = await prisma.courseRndProject.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ error: "项目不存在" }, { status: 404 });

  const draft = await prisma.courseRndLessonDraft.findFirst({
    where: { planVersionId: project.currentPlanVersionId ?? "", lessonNo: lessonNoInt },
  });
  if (!draft) return NextResponse.json({ error: "课次草稿不存在" }, { status: 404 });

  // 获取 AI 原始输出中的图片描述
  let aiOutput: AiLessonOutput;
  try {
    aiOutput = JSON.parse(draft.draftJson ?? "{}");
  } catch {
    return NextResponse.json({ error: "草稿数据异常" }, { status: 500 });
  }

  const promptField = IMAGE_PROMPT_FIELD[imageType];
  const prompt = (aiOutput as unknown as Record<string, unknown>)[promptField] as string | undefined;
  if (!prompt) {
    return NextResponse.json({ error: "该课次没有对应的图片描述，请先重新生成课次内容" }, { status: 400 });
  }

  // 获取图片模型
  const actionKey = IMAGE_ACTION_MAP[imageType];
  let provider, model;
  try {
    ({ provider, model } = await getProviderAndModel(actionKey));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "图片模型未配置" }, { status: 503 });
  }

  if (!provider.generateImage) {
    return NextResponse.json({ error: "该服务商不支持图片生成" }, { status: 503 });
  }

  // 生成图片
  try {
    // 查询构图引导 Preset
    const compositionPreset = imageType === "hero"
      ? await prisma.preset.findFirst({ where: { category: "image_composition", isActive: true }, select: { value: true } })
      : null;
    const compositionGuide = compositionPreset?.value ? `${compositionPreset.value} ` : "";
    const stylePrefix = project.imageStylePrompt ? `Style: ${project.imageStylePrompt}. ` : "";
    const ageHint = project.ageRange ? `Designed for ${project.ageRange} age group. ` : "";
    const finalImagePrompt = compositionGuide + ageHint + stylePrefix + prompt;
    const img = await provider.generateImage({ prompt: finalImagePrompt, model });
    const savedUrl = await saveAiImage(img.url, `lessons/${id}`);

    // 更新 draftJson 和 contentData
    const urlField = IMAGE_URL_FIELD[imageType];
    (aiOutput as unknown as Record<string, unknown>)[urlField] = savedUrl;
    const contentData = buildContentData(aiOutput);

    await prisma.courseRndLessonDraft.update({
      where: { id: draft.id },
      data: {
        draftJson: JSON.stringify(aiOutput),
        contentData: JSON.stringify(contentData),
      },
    });

    // 记录图片生成成本
    const userId = (session.user as { id?: string })?.id;
    const imgCost = await calculateCallCostFromDb(actionKey, 0, 0);
    await prisma.courseRndAiCallLog.create({
      data: {
        projectId: id, pageKey: "workbench", actionType: actionKey,
        modelName: model, inputTokens: 0, outputTokens: 0,
        estimatedCost: imgCost, userId: userId ?? null,
        promptLog: finalImagePrompt,
        messageLog: null,
      },
    });

    return NextResponse.json({
      data: {
        imageType,
        imageUrl: savedUrl,
        contentData,
      },
    });
  } catch (e) {
    return NextResponse.json({
      error: `图片生成失败：${e instanceof Error ? e.message : String(e)}`,
    }, { status: 502 });
  }
}
