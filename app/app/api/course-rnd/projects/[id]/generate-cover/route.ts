export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { COURSE_RND_ROLES } from "@/lib/permissions";
import { getProviderAndModel } from "@/lib/ai/provider";
import { saveAiImage } from "@/lib/ai/image-store";

// POST /api/course-rnd/projects/[id]/generate-cover
export async function POST(
  _request: Request,
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

  const prompt = `Create a colorful, engaging educational course cover illustration for children. ` +
    `The course is titled "${project.title}", ` +
    `designed for ${project.ageRange ?? "children"} age group, ` +
    `level: ${project.level ?? "beginner"}. ` +
    `Direction: ${project.courseDirection ?? "creative learning"}. ` +
    `Style: cute, modern, vibrant colors, flat illustration, child-friendly, no text on the image.`;

  try {
    const img = await provider.generateImage({ prompt, model });
    const savedUrl = await saveAiImage(img.url, `covers/${id}`);

    return NextResponse.json({
      data: { coverUrl: savedUrl },
    });
  } catch (e) {
    return NextResponse.json({
      error: `封面生成失败：${e instanceof Error ? e.message : String(e)}`,
    }, { status: 502 });
  }
}
