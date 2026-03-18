export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { COURSE_RND_ROLES } from "@/lib/permissions";
import { getProviderAndModel } from "@/lib/ai/provider";
import { calculateCallCostFromDb } from "@/lib/ai/pricing-service";
import { saveAiImage } from "@/lib/ai/image-store";
import { resolveImagePrompt, type TemplateContext } from "@/lib/ai/template-engine";

/** 硬编码回退 prompt（DB 无模板时使用） */
function defaultCoverPrompt(project: {
  title: string;
  ageRange: string | null;
  level: string | null;
  courseDirection: string | null;
  imageStylePrompt: string | null;
}): string {
  const style = project.imageStylePrompt ?? "cute, modern, vibrant colors, flat illustration, child-friendly";
  return (
    `Create a colorful, engaging educational course cover illustration. ` +
    `Course: "${project.title}". ` +
    `Designed for ${project.ageRange ?? "children"} age group, level: ${project.level ?? "beginner"}. ` +
    `Direction: ${project.courseDirection ?? "creative learning"}. ` +
    `Style: ${style}. No text on the image.`
  );
}

// POST /api/course-rnd/projects/[id]/generate-cover
// body (optional): { customPrompt?: string }
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireRole(COURSE_RND_ROLES);
  if (!session) return forbiddenResponse();

  const { id } = await params;

  const project = await prisma.courseRndProject.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ error: "项目不存在" }, { status: 404 });

  // 获取图片模型
  let provider, model;
  try {
    ({ provider, model } = await getProviderAndModel("package_cover"));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "封面图模型未配置" }, { status: 503 });
  }

  if (!provider.generateImage) {
    return NextResponse.json({ error: "该服务商不支持图片生成" }, { status: 503 });
  }

  // 支持自定义 prompt（封面重新生成时用户编辑后提交）
  let customPrompt: string | null = null;
  try {
    const body = await request.json();
    if (body.customPrompt) customPrompt = body.customPrompt;
  } catch {}

  // 构图引导
  const compositionPreset = await prisma.preset.findFirst({
    where: { category: "image_composition", isActive: true },
    select: { value: true },
  });
  const compositionGuide = compositionPreset?.value ? `${compositionPreset.value} ` : "";
  const ageHint = project.ageRange ? `Designed for ${project.ageRange} age group. ` : "";
  const stylePrefix = project.imageStylePrompt ? `Style: ${project.imageStylePrompt}. ` : "";

  let prompt: string;
  if (customPrompt) {
    // 自定义 prompt：加构图引导 + 年龄 + 风格
    prompt = compositionGuide + ageHint + stylePrefix + customPrompt;
  } else {
    // 优先使用 DB 模板，回退到硬编码
    const templateCtx: TemplateContext = {
      title: project.title,
      courseDirection: project.courseDirection,
      ageRange: project.ageRange,
      level: project.level,
      orgForm: project.orgForm,
      deliverableType: project.deliverableType,
      deliverableName: project.deliverableName ?? project.coreDeliverable,
      imageStylePrompt: project.imageStylePrompt,
      coreNeeds: project.coreNeeds,
      constraints: project.constraints,
    };
    const dbPrompt = await resolveImagePrompt("package_cover", templateCtx);
    const basePrompt = dbPrompt ?? defaultCoverPrompt(project);
    prompt = compositionGuide + basePrompt;
  }

  try {
    const img = await provider.generateImage({ prompt, model });
    const savedUrl = await saveAiImage(img.url, `covers/${id}`);

    await prisma.courseRndProject.update({
      where: { id },
      data: { coverUrl: savedUrl },
    });

    // 记录封面生成成本
    const userId = (session.user as { id?: string })?.id;
    const imgCost = await calculateCallCostFromDb("package_cover", 0, 0);
    await prisma.courseRndAiCallLog.create({
      data: {
        projectId: id, pageKey: "workbench", actionType: "package_cover",
        modelName: model, inputTokens: 0, outputTokens: 0,
        estimatedCost: imgCost, userId: userId ?? null,
        promptLog: prompt,
        messageLog: null,
      },
    });

    return NextResponse.json({
      data: { coverUrl: savedUrl },
    });
  } catch (e) {
    return NextResponse.json({
      error: `封面生成失败：${e instanceof Error ? e.message : String(e)}`,
    }, { status: 502 });
  }
}
