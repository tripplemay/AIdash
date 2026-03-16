export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { ROLES } from "@/lib/roles";

// PATCH /api/admin/packages/[slug] — 更新课程包元信息
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!(await requireRole([ROLES.ADMIN, ROLES.RD_MANAGER]))) {
    return forbiddenResponse();
  }

  const { slug } = await params;
  const body = await request.json();
  const { title, ageRange, level, summary, coverImage, status } = body;

  const pkg = await prisma.coursePackage.update({
    where: { slug },
    data: {
      ...(title && { title }),
      ...(ageRange && { ageRange }),
      ...(level && { level }),
      ...(summary !== undefined && { summary }),
      ...(coverImage !== undefined && { coverImage }),
      ...(status && { status }),
    },
  });

  return NextResponse.json({ data: pkg });
}

// DELETE /api/admin/packages/[slug] — 删除课程包
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!(await requireRole([ROLES.ADMIN, ROLES.RD_MANAGER]))) {
    return forbiddenResponse();
  }

  const { slug } = await params;
  await prisma.coursePackage.delete({ where: { slug } });

  return NextResponse.json({ success: true });
}
