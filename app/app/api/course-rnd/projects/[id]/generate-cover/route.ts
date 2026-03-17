export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { COURSE_RND_ROLES } from "@/lib/permissions";
import { getProviderAndModel } from "@/lib/ai/provider";
import { calculateCallCostFromDb } from "@/lib/ai/pricing-service";
import { saveAiImage } from "@/lib/ai/image-store";

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

  const styleDesc = project.imageStylePrompt
    ?? "cute, modern, vibrant colors, flat illustration, child-friendly";
  const prompt = customPrompt ?? (
    `Create a colorful, engaging educational course cover illustration for children. ` +
    `The course is titled "${project.title}", ` +
    `designed for ${project.ageRange ?? "children"} age group, ` +
    `level: ${project.level ?? "beginner"}. ` +
    `Direction: ${project.courseDirection ?? "creative learning"}. ` +
    `Style: ${styleDesc}, no text on the image.`
  );

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
