export const dynamic = "force-dynamic";

import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { ROLES } from "@/lib/roles";

/** 生成 8 位字母数字邀请码 */
function generateInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.randomBytes(8);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join("");
}

// GET /api/admin/invites — 邀请码列表
export async function GET() {
  if (!(await requireRole([ROLES.ADMIN]))) {
    return forbiddenResponse();
  }

  const invites = await prisma.inviteCode.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ data: invites });
}

// POST /api/admin/invites — 生成邀请码
export async function POST(request: Request) {
  const session = await requireRole([ROLES.ADMIN]);
  if (!session) {
    return forbiddenResponse();
  }

  const userId = (session.user as { id?: string })?.id;
  if (!userId) {
    return forbiddenResponse();
  }

  const body = await request.json();
  const { maxUses, expiresInDays } = body;

  if (!maxUses || typeof maxUses !== "number" || maxUses < 1) {
    return NextResponse.json({ error: "最大使用次数需大于 0" }, { status: 400 });
  }

  if (!expiresInDays || typeof expiresInDays !== "number" || expiresInDays < 1) {
    return NextResponse.json({ error: "有效天数需大于 0" }, { status: 400 });
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const code = generateInviteCode();

  const invite = await prisma.inviteCode.create({
    data: {
      code,
      maxUses,
      expiresAt,
      createdById: userId,
    },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ data: invite }, { status: 201 });
}
