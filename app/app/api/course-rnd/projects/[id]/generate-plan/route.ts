export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { COURSE_RND_ROLES } from "@/lib/permissions";

// POST /api/course-rnd/projects/[id]/generate-plan
// 第一步：基于框架创建方案骨架（不调用 AI，瞬间完成）
// 每课的 contentData 由前端逐课触发生成
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(COURSE_RND_ROLES);
  if (!session) return forbiddenResponse();

  const { id } = await params;

  // 读取项目 + 当前方向版本
  const project = await prisma.courseRndProject.findUnique({
    where: { id },
    include: {
      directionVersions: { where: { isSelected: true }, take: 1 },
    },
  });
  if (!project) return NextResponse.json({ error: "项目不存在" }, { status: 404 });

  const dirVersion = project.directionVersions[0];
  if (!dirVersion?.frameworkJson) {
    return NextResponse.json({ error: "请先确认课程框架" }, { status: 400 });
  }

  let framework: Array<{ lessonNo: number; title: string; overview: string }>;
  try {
    framework = JSON.parse(dirVersion.frameworkJson);
  } catch {
    return NextResponse.json({ error: "框架数据异常" }, { status: 500 });
  }

  // 清除旧版本的 isSelected
  await prisma.courseRndPlanVersion.updateMany({
    where: { projectId: id, isSelected: true },
    data: { isSelected: false },
  });

  // 创建方案版本骨架
  const maxVersion = await prisma.courseRndPlanVersion.findFirst({
    where: { projectId: id },
    orderBy: { versionNo: "desc" },
    select: { versionNo: true },
  });
  const nextVersionNo = (maxVersion?.versionNo ?? 0) + 1;

  const planVersion = await prisma.courseRndPlanVersion.create({
    data: {
      projectId: id,
      versionNo: nextVersionNo,
      isSelected: true,
      planJson: JSON.stringify(framework),
      sourceDirectionVersionId: dirVersion.id,
    },
  });

  // 为每课创建空草稿（contentData 待逐课生成）
  for (const lesson of framework) {
    await prisma.courseRndLessonDraft.create({
      data: {
        planVersionId: planVersion.id,
        lessonNo: lesson.lessonNo,
        title: lesson.title,
        contentData: null, // 待生成
      },
    });
  }

  // 更新项目状态
  await prisma.courseRndProject.update({
    where: { id },
    data: {
      status: "workbench",
      currentPlanVersionId: planVersion.id,
    },
  });

  return NextResponse.json({
    data: {
      planVersionId: planVersion.id,
      versionNo: nextVersionNo,
      lessons: framework,
    },
  });
}
