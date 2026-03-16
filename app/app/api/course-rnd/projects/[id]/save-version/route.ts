export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { COURSE_RND_ROLES } from "@/lib/permissions";

// POST /api/course-rnd/projects/[id]/save-version
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(COURSE_RND_ROLES);
  if (!session) return forbiddenResponse();

  const { id } = await params;

  const project = await prisma.courseRndProject.findUnique({
    where: { id },
    select: { currentPlanVersionId: true },
  });

  if (!project?.currentPlanVersionId) {
    return NextResponse.json({ error: "无当前方案版本" }, { status: 400 });
  }

  // 读取当前版本的所有草稿
  const drafts = await prisma.courseRndLessonDraft.findMany({
    where: { planVersionId: project.currentPlanVersionId },
    orderBy: { lessonNo: "asc" },
  });

  // 清除旧版本的 isSelected
  await prisma.courseRndPlanVersion.updateMany({
    where: { projectId: id, isSelected: true },
    data: { isSelected: false },
  });

  // 快照当前状态为新版本
  const maxVersion = await prisma.courseRndPlanVersion.findFirst({
    where: { projectId: id },
    orderBy: { versionNo: "desc" },
    select: { versionNo: true },
  });
  const nextVersionNo = (maxVersion?.versionNo ?? 0) + 1;

  const planJson = JSON.stringify(drafts.map(d => ({
    lessonNo: d.lessonNo,
    title: d.title,
    contentData: d.contentData ? JSON.parse(d.contentData) : null,
  })));

  const newVersion = await prisma.courseRndPlanVersion.create({
    data: {
      projectId: id,
      versionNo: nextVersionNo,
      isSelected: true,
      planJson,
      changeSummary: `手动保存版本 v${nextVersionNo}`,
    },
  });

  // 复制草稿到新版本
  for (const draft of drafts) {
    await prisma.courseRndLessonDraft.create({
      data: {
        planVersionId: newVersion.id,
        lessonNo: draft.lessonNo,
        title: draft.title,
        contentData: draft.contentData,
        lastFeedback: draft.lastFeedback,
      },
    });
  }

  await prisma.courseRndProject.update({
    where: { id },
    data: { currentPlanVersionId: newVersion.id },
  });

  return NextResponse.json({
    data: { planVersionId: newVersion.id, versionNo: nextVersionNo },
  });
}
