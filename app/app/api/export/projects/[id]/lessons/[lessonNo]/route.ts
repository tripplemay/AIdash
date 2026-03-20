export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyExportToken, unauthorizedResponse } from "@/lib/export-auth";

/** GET /api/export/projects/:id/lessons/:lessonNo — single lesson full detail */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; lessonNo: string }> },
) {
  if (!(await verifyExportToken(request))) return unauthorizedResponse();

  const { id, lessonNo: lessonNoStr } = await params;
  const lessonNo = parseInt(lessonNoStr, 10);
  if (isNaN(lessonNo)) {
    return NextResponse.json({ error: "Invalid lessonNo" }, { status: 400 });
  }

  // Find the project's current plan version
  const project = await prisma.courseRndProject.findUnique({
    where: { id },
    select: { currentPlanVersionId: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (!project.currentPlanVersionId) {
    return NextResponse.json({ error: "Project has no plan version yet" }, { status: 404 });
  }

  const draft = await prisma.courseRndLessonDraft.findFirst({
    where: {
      planVersionId: project.currentPlanVersionId,
      lessonNo,
    },
    select: {
      lessonNo: true,
      title: true,
      overview: true,
      draftJson: true,
      contentData: true,
      lastFeedback: true,
      updatedAt: true,
    },
  });

  if (!draft) {
    return NextResponse.json({ error: `Lesson ${lessonNo} not found` }, { status: 404 });
  }

  let parsedDraftJson = null;
  if (draft.draftJson) {
    try {
      parsedDraftJson = JSON.parse(draft.draftJson as string);
    } catch { /* ignore */ }
  }

  let parsedContentData = null;
  if (draft.contentData) {
    try {
      parsedContentData = JSON.parse(draft.contentData as string);
    } catch { /* ignore */ }
  }

  return NextResponse.json({
    data: {
      lessonNo: draft.lessonNo,
      title: draft.title,
      overview: draft.overview,
      draftJson: parsedDraftJson,
      contentData: parsedContentData,
      lastFeedback: draft.lastFeedback,
      updatedAt: draft.updatedAt,
    },
  });
}
