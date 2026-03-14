export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";

async function requireAdmin() {
  const session = await auth();
  if (!session) return null;
  const user = session.user as { role?: string };
  if (user.role !== "admin") return null;
  return session;
}

// PATCH /api/admin/users/[id] — 更新用户信息 / 重置密码
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { name, role, newPassword } = body;

  const data: Record<string, string> = {};
  if (name) data.name = name;
  if (role) {
    if (!["teacher", "admin"].includes(role)) {
      return NextResponse.json({ error: "角色无效" }, { status: 400 });
    }
    data.role = role;
  }
  if (newPassword) {
    if (newPassword.length < 6) {
      return NextResponse.json({ error: "密码最少 6 位" }, { status: 400 });
    }
    data.password = await bcrypt.hash(newPassword, 12);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "无更新字段" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, username: true, name: true, role: true, createdAt: true },
  });

  return NextResponse.json({ data: user });
}

// DELETE /api/admin/users/[id] — 删除用户（不可删除自身）
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const { id } = await params;
  const me = session.user as { id?: string };
  if (me.id === id) {
    return NextResponse.json({ error: "不可删除自身账号" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
