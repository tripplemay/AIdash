export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { ROLES } from "@/lib/roles";

// PATCH /api/admin/invites/[id] — 切换邀请码启用/禁用
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireRole([ROLES.ADMIN]))) {
    return forbiddenResponse();
  }

  const { id } = await params;
  const body = await request.json();
  const { isActive } = body;

  if (typeof isActive !== "boolean") {
    return NextResponse.json({ error: "isActive 必须为布尔值" }, { status: 400 });
  }

  try {
    const invite = await prisma.inviteCode.update({
      where: { id },
      data: { isActive },
    });
    return NextResponse.json({ data: invite });
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2025") {
      return NextResponse.json({ error: "邀请码不存在" }, { status: 404 });
    }
    throw e;
  }
}

// DELETE /api/admin/invites/[id] — 删除邀请码
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireRole([ROLES.ADMIN]))) {
    return forbiddenResponse();
  }

  const { id } = await params;

  try {
    await prisma.inviteCode.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2025") {
      return NextResponse.json({ error: "邀请码不存在" }, { status: 404 });
    }
    throw e;
  }
}
