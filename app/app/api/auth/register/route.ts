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

  // 预校验邀请码（快速失败，非原子性）
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

  // 事务内原子性操作：先占用邀请码（条件更新防止竞态），再创建用户
  const hashed = await bcrypt.hash(password, 12);

  try {
    const user = await prisma.$transaction(async (tx) => {
      // 原子性占用邀请码：只有 usedCount < maxUses 时才 increment
      const updated = await tx.inviteCode.updateMany({
        where: {
          id: invite.id,
          isActive: true,
          usedCount: { lt: invite.maxUses },
          expiresAt: { gt: new Date() },
        },
        data: { usedCount: { increment: 1 } },
      });

      if (updated.count === 0) {
        throw new Error("INVITE_EXHAUSTED");
      }

      return tx.user.create({
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
      });
    });

    return NextResponse.json({ data: user }, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.message === "INVITE_EXHAUSTED") {
      return NextResponse.json({ error: "邀请码使用次数已满" }, { status: 400 });
    }
    // Prisma P2002: username duplicate (race with another registration)
    if (typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "用户名已存在" }, { status: 400 });
    }
    throw e;
  }
}
