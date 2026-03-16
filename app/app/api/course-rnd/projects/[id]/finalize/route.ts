export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { COURSE_RND_ROLES } from "@/lib/permissions";

// POST /api/course-rnd/projects/[id]/finalize
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(COURSE_RND_ROLES);
  if (!session) return forbiddenResponse();

  const { id } = await params;

  const project = await prisma.courseRndProject.findUnique({
    where: { id },
    select: { status: true, currentPlanVersionId: true },
  });

  if (!project) return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  if (!project.currentPlanVersionId) {
    return NextResponse.json({ error: "无方案版本，无法定稿" }, { status: 400 });
  }

  await prisma.courseRndProject.update({
    where: { id },
    data: { status: "finalized" },
  });

  return NextResponse.json({ data: { status: "finalized" } });
}
