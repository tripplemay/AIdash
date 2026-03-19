export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// POST /api/auth/register — 使用邀请码注册新用户
export async function POST(request: Request) {
  const body = await request.json();
  const { inviteCode, username, password, name } = body;

  // 字段校验
  if (!inviteCode || !username || !password || !name) {
    return NextResponse.json({ error: "请填写所有必填字段" }, { status: 400 });
  }

  if (typeof username !== "string" || username.trim().length < 2) {
    return NextResponse.json({ error: "用户名至少 2 个字符" }, { status: 400 });
  }

  if (typeof password !== "string" || password.length < 6) {
    return NextResponse.json({ error: "密码最少 6 位" }, { status: 400 });
  }

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "姓名不能为空" }, { status: 400 });
  }

  // 验证邀请码
  const invite = await prisma.inviteCode.findUnique({
    where: { code: inviteCode },
  });

  if (!invite) {
    return NextResponse.json({ error: "邀请码无效" }, { status: 400 });
  }

  if (!invite.isActive) {
    return NextResponse.json({ error: "邀请码已停用" }, { status: 400 });
  }

  if (new Date() > invite.expiresAt) {
    return NextResponse.json({ error: "邀请码已过期" }, { status: 400 });
  }

  if (invite.usedCount >= invite.maxUses) {
    return NextResponse.json({ error: "邀请码使用次数已满" }, { status: 400 });
  }

  // 检查用户名唯一性
  const existing = await prisma.user.findUnique({
    where: { username: username.trim() },
  });

  if (existing) {
    return NextResponse.json({ error: "用户名已存在" }, { status: 400 });
  }

  // 创建用户 + 递增邀请码使用次数（事务）
  const hashed = await bcrypt.hash(password, 12);

  const [user] = await prisma.$transaction([
    prisma.user.create({
      data: {
        username: username.trim(),
        password: hashed,
        name: name.trim(),
        role: "rd_manager",
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        createdAt: true,
      },
    }),
    prisma.inviteCode.update({
      where: { id: invite.id },
      data: { usedCount: { increment: 1 } },
    }),
  ]);

  return NextResponse.json({ data: user }, { status: 201 });
}
