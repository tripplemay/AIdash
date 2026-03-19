export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { ROLES } from "@/lib/roles";

// GET /api/admin/users/[id]/check-downgrade — 检查用户是否有进行中的研发项目
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireRole([ROLES.ADMIN]))) {
    return forbiddenResponse();
  }

  const { id } = await params;

  const projectCount = await prisma.courseRndProject.count({
    where: {
      createdById: id,
      status: { in: ["direction", "workbench"] },
    },
  });

  return NextResponse.json({ data: { projectCount } });
}
