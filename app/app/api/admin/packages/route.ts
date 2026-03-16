export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { ROLES } from "@/lib/roles";

// GET /api/admin/packages — 获取所有课程包（含草稿）
export async function GET() {
  if (!(await requireRole([ROLES.ADMIN, ROLES.RD_MANAGER]))) {
    return forbiddenResponse();
  }

  const packages = await prisma.coursePackage.findMany({
    include: { lessons: { orderBy: { lessonNo: "asc" }, include: { attachments: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: packages });
}

// POST /api/admin/packages — 创建课程包
export async function POST(request: Request) {
  if (!(await requireRole([ROLES.ADMIN, ROLES.RD_MANAGER]))) {
    return forbiddenResponse();
  }

  const body = await request.json();
  const { slug, title, ageRange, level, summary, coverImage } = body;

  if (!slug || !title || !ageRange || !level) {
    return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
  }

  const pkg = await prisma.coursePackage.create({
    data: { slug, title, ageRange, level, summary, coverImage },
  });

  return NextResponse.json({ data: pkg }, { status: 201 });
}
