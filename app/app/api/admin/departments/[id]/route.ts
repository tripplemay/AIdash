export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { ROLES } from "@/lib/roles";

// PATCH /api/admin/departments/[id] — 重命名部门
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireRole([ROLES.ADMIN]))) {
    return forbiddenResponse();
  }

  const { id } = await params;
  const body = await request.json();
  const { name } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "部门名称不能为空" }, { status: 400 });
  }

  try {
    const department = await prisma.department.update({
      where: { id },
      data: { name: name.trim() },
      select: { id: true, name: true, sortOrder: true },
    });
    return NextResponse.json({ data: department });
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "部门名称已存在" }, { status: 400 });
    }
    if (typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2025") {
      return NextResponse.json({ error: "部门不存在" }, { status: 404 });
    }
    throw e;
  }
}

// DELETE /api/admin/departments/[id] — 删除部门（关联用户的 departmentId 由 DB 自动置空）
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireRole([ROLES.ADMIN]))) {
    return forbiddenResponse();
  }

  const { id } = await params;

  try {
    await prisma.department.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2025") {
      return NextResponse.json({ error: "部门不存在" }, { status: 404 });
    }
    throw e;
  }
}
