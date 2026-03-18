export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { ROLES } from "@/lib/roles";

const ALLOWED_ROLES = [ROLES.TEACHER, ROLES.RD_MANAGER, ROLES.ADMIN] as const;
const ALLOWED_MODES = ["general", "course_design"] as const;

/** GET /api/chat/conversations — list conversations for current user */
export async function GET() {
  const session = await requireRole([...ALLOWED_ROLES]);
  if (!session) return forbiddenResponse();

  const userId = (session.user as { id?: string })?.id;
  if (!userId) return forbiddenResponse();

  const conversations = await prisma.chatConversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, mode: true, updatedAt: true },
  });

  return NextResponse.json({ data: conversations });
}

/** POST /api/chat/conversations — create a new conversation */
export async function POST(request: Request) {
  const session = await requireRole([...ALLOWED_ROLES]);
  if (!session) return forbiddenResponse();

  const userId = (session.user as { id?: string })?.id;
  if (!userId) return forbiddenResponse();

  const body = await request.json().catch(() => ({}));
  const mode = body.mode ?? "general";

  if (!ALLOWED_MODES.includes(mode)) {
    return NextResponse.json(
      { error: "无效的对话模式，支持 general 或 course_design" },
      { status: 400 },
    );
  }

  const conversation = await prisma.chatConversation.create({
    data: { userId, mode },
    select: { id: true, title: true, mode: true, updatedAt: true },
  });

  return NextResponse.json({ data: conversation }, { status: 201 });
}
