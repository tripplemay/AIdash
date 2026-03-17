export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { COURSE_RND_ROLES } from "@/lib/permissions";

// GET /api/course-rnd/projects/[id] — 获取项目详情
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(COURSE_RND_ROLES);
  if (!session) return forbiddenResponse();

  const { id } = await params;

  const project = await prisma.courseRndProject.findUnique({
    where: { id },
    include: {
      directionVersions: { orderBy: { versionNo: "desc" }, take: 5 },
      planVersions: {
        orderBy: { versionNo: "desc" },
        take: 5,
        include: { lessonDrafts: { orderBy: { lessonNo: "asc" } } },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  return NextResponse.json({ data: project });
}

// DELETE /api/course-rnd/projects/[id] — 删除项目
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(COURSE_RND_ROLES);
  if (!session) return forbiddenResponse();

  const { id } = await params;

  const project = await prisma.courseRndProject.findUnique({
    where: { id },
    include: { publishRecords: { select: { packageSlug: true } } },
  });

  if (!project) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  // 检查发布记录对应的课程包是否仍存在（未被删除）
  if (project.publishRecords.length > 0) {
    const slugs = [...new Set(project.publishRecords.map(r => r.packageSlug))];
    const existingPackages = await prisma.coursePackage.count({
      where: { slug: { in: slugs } },
    });
    if (existingPackages > 0) {
      return NextResponse.json({
        error: "该项目已发布课程包，请先在课程包管理中删除后再删除项目",
      }, { status: 409 });
    }
  }

  await prisma.courseRndProject.delete({ where: { id } });
  return NextResponse.json({ data: { id } });
}

// PATCH /api/course-rnd/projects/[id] — 更新项目（自动保存草稿）
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(COURSE_RND_ROLES);
  if (!session) return forbiddenResponse();

  const { id } = await params;
  const body = await request.json();

  const allowedFields = [
    "title", "status", "targetAudience", "courseDirection",
    "ageRange", "level", "lessonCount", "coreDeliverable",
    "roughFramework", "coreNeeds", "constraints",
    "currentDirectionVersionId", "currentPlanVersionId",
    "orgForm", "deliverableType", "deliverableName",
    "imageStyle", "imageStylePrompt",
  ];

  const data: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) data[key] = body[key];
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "无更新字段" }, { status: 400 });
  }

  const project = await prisma.courseRndProject.update({
    where: { id },
    data,
  });

  return NextResponse.json({ data: project });
}
