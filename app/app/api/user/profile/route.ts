export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { ROLES } from "@/lib/roles";

// GET /api/user/profile — 获取当前用户资料
export async function GET() {
  const session = await requireRole([ROLES.TEACHER, ROLES.RD_MANAGER, ROLES.ADMIN]);
  if (!session) {
    return forbiddenResponse();
  }

  const userId = (session.user as { id?: string })?.id;
  if (!userId) {
    return forbiddenResponse();
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      role: true,
      departmentId: true,
      department: { select: { id: true, name: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  return NextResponse.json({ data: user });
}

// PATCH /api/user/profile — 更新当前用户资料
export async function PATCH(request: Request) {
  const session = await requireRole([ROLES.TEACHER, ROLES.RD_MANAGER, ROLES.ADMIN]);
  if (!session) {
    return forbiddenResponse();
  }

  const userId = (session.user as { id?: string })?.id;
  if (!userId) {
    return forbiddenResponse();
  }

  const body = await request.json();
  const { name, email, phone, avatarUrl, departmentId } = body;

  const data: Record<string, string | null> = {};

  if (name !== undefined) {
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "姓名不能为空" }, { status: 400 });
    }
    data.name = name;
  }

  if (email !== undefined) {
    if (email !== null && email !== "") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: "邮箱格式无效" }, { status: 400 });
      }
      data.email = email;
    } else {
      data.email = null;
    }
  }

  if (phone !== undefined) {
    data.phone = phone || null;
  }

  if (avatarUrl !== undefined) {
    data.avatarUrl = avatarUrl || null;
  }

  if (departmentId !== undefined) {
    data.departmentId = departmentId || null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "无更新字段" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      role: true,
      departmentId: true,
      department: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ data: user });
}
