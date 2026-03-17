export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { COURSE_RND_ROLES } from "@/lib/permissions";
import { getProviderAndModel } from "@/lib/ai/provider";
import { saveAiImage } from "@/lib/ai/image-store";
import { buildContentData, type AiLessonOutput } from "@/lib/ai/build-content-data";

type ImageType = "hero" | "illustration" | "template";

const IMAGE_ACTION_MAP: Record<ImageType, string> = {
  hero: "lesson_cover",
  illustration: "lesson_illustration",
  template: "lesson_illustration",
};

const IMAGE_PROMPT_FIELD: Record<ImageType, keyof AiLessonOutput> = {
  hero: "hero_image_prompt",
  illustration: "illustration_prompt",
  template: "template_image_prompt",
};

const IMAGE_URL_FIELD: Record<ImageType, keyof AiLessonOutput> = {
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
  const imageType = body.imageType as ImageType;

  if (!imageType || !IMAGE_ACTION_MAP[imageType]) {
    return NextResponse.json({ error: "无效的图片类型" }, { status: 400 });
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
  const prompt = aiOutput[promptField] as string | undefined;
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
    const stylePrefix = project.imageStylePrompt ? `Style: ${project.imageStylePrompt}. ` : "";
    const img = await provider.generateImage({ prompt: stylePrefix + prompt, model });
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
