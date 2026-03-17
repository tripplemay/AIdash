export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { COURSE_RND_ROLES } from "@/lib/permissions";
import { logOperation } from "@/lib/operation-log";

// POST /api/course-rnd/projects/[id]/finalize — 定稿
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(COURSE_RND_ROLES);
  if (!session) return forbiddenResponse();

  const { id } = await params;
  const userId = (session.user as { id?: string })?.id;

  const project = await prisma.courseRndProject.findUnique({
    where: { id },
    select: { status: true, title: true, currentPlanVersionId: true },
  });

  if (!project) return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  if (!project.currentPlanVersionId) {
    return NextResponse.json({ error: "无方案版本，无法定稿" }, { status: 400 });
  }

  await prisma.courseRndProject.update({
    where: { id },
    data: { status: "finalized" },
  });

  await logOperation({
    userId,
    module: "course_rnd",
    action: "finalize",
    targetId: id,
    targetName: project.title,
  });

  return NextResponse.json({ data: { status: "finalized" } });
}

// PATCH /api/course-rnd/projects/[id]/finalize — 撤回定稿
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(COURSE_RND_ROLES);
  if (!session) return forbiddenResponse();

  const { id } = await params;
  const userId = (session.user as { id?: string })?.id;

  const project = await prisma.courseRndProject.findUnique({
    where: { id },
    select: { status: true, title: true },
  });

  if (!project) return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  if (project.status !== "finalized") {
    return NextResponse.json({ error: "项目未处于定稿状态，无法撤回" }, { status: 400 });
  }

  await prisma.courseRndProject.update({
    where: { id },
    data: { status: "workbench" },
  });

  await logOperation({
    userId,
    module: "course_rnd",
    action: "unfinalize",
    targetId: id,
    targetName: project.title,
  });

  return NextResponse.json({ data: { status: "workbench" } });
}
