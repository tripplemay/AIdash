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

// GET /api/admin/users — 用户列表（不返回 password）
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: { id: true, username: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: users });
}

// POST /api/admin/users — 新建用户
export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const body = await request.json();
  const { username, name, role, password } = body;

  if (!username || !name || !role || !password) {
    return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "密码最少 6 位" }, { status: 400 });
  }
  if (!["teacher", "admin"].includes(role)) {
    return NextResponse.json({ error: "角色无效" }, { status: 400 });
  }

  try {
    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { username, name, role, password: hashed },
      select: { id: true, username: true, name: true, role: true, createdAt: true },
    });
    return NextResponse.json({ data: user }, { status: 201 });
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "用户名已存在" }, { status: 400 });
    }
    throw e;
  }
}
