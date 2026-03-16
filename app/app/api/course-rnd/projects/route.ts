export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { COURSE_RND_ROLES } from "@/lib/permissions";

// GET /api/course-rnd/projects — 最近项目列表
export async function GET() {
  const session = await requireRole(COURSE_RND_ROLES);
  if (!session) return forbiddenResponse();

  const userId = (session.user as { id?: string })?.id;

  const projects = await prisma.courseRndProject.findMany({
    where: { createdById: userId },
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: {
      id: true,
      title: true,
      status: true,
      ageRange: true,
      level: true,
      lessonCount: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ data: projects });
}

// POST /api/course-rnd/projects — 创建项目
export async function POST(request: Request) {
  const session = await requireRole(COURSE_RND_ROLES);
  if (!session) return forbiddenResponse();

  const userId = (session.user as { id?: string })?.id;
  if (!userId) return forbiddenResponse();

  const body = await request.json();
  const { title, targetAudience, courseDirection, ageRange, level, lessonCount, coreDeliverable, roughFramework, coreNeeds, constraints } = body;

  if (!title) {
    return NextResponse.json({ error: "缺少项目标题" }, { status: 400 });
  }

  const project = await prisma.courseRndProject.create({
    data: {
      title,
      targetAudience: targetAudience ?? null,
      courseDirection: courseDirection ?? null,
      ageRange: ageRange ?? null,
      level: level ?? null,
      lessonCount: lessonCount ?? null,
      coreDeliverable: coreDeliverable ?? null,
      roughFramework: roughFramework ?? null,
      coreNeeds: coreNeeds ?? null,
      constraints: constraints ?? null,
      createdById: userId,
    },
  });

  return NextResponse.json({ data: project }, { status: 201 });
}
