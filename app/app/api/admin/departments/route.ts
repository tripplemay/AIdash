export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { ROLES } from "@/lib/roles";

// GET /api/admin/departments — 部门列表（所有角色可访问，用于下拉选择）
export async function GET() {
  const session = await requireRole([ROLES.TEACHER, ROLES.RD_MANAGER, ROLES.ADMIN]);
  if (!session) {
    return forbiddenResponse();
  }

  const departments = await prisma.department.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, sortOrder: true },
  });

  return NextResponse.json({ data: departments });
}

// POST /api/admin/departments — 创建部门（仅管理员）
export async function POST(request: Request) {
  if (!(await requireRole([ROLES.ADMIN]))) {
    return forbiddenResponse();
  }

  const body = await request.json();
  const { name } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "部门名称不能为空" }, { status: 400 });
  }

  try {
    const department = await prisma.department.create({
      data: { name: name.trim() },
      select: { id: true, name: true, sortOrder: true },
    });
    return NextResponse.json({ data: department }, { status: 201 });
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "部门名称已存在" }, { status: 400 });
    }
    throw e;
  }
}
