export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { ROLES } from "@/lib/roles";

const ALLOWED_ROLES = [ROLES.TEACHER, ROLES.RD_MANAGER, ROLES.ADMIN] as const;

/** GET /api/chat/conversations/[id] — return conversation with all messages */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireRole([...ALLOWED_ROLES]);
  if (!session) return forbiddenResponse();

  const userId = (session.user as { id?: string })?.id;
  if (!userId) return forbiddenResponse();

  const { id } = await params;

  const conversation = await prisma.chatConversation.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: "对话不存在" }, { status: 404 });
  }

  if (conversation.userId !== userId) {
    return forbiddenResponse();
  }

  return NextResponse.json({ data: conversation });
}

/** PATCH /api/chat/conversations/[id] — rename conversation */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireRole([...ALLOWED_ROLES]);
  if (!session) return forbiddenResponse();

  const userId = (session.user as { id?: string })?.id;
  if (!userId) return forbiddenResponse();

  const { id } = await params;

  const conversation = await prisma.chatConversation.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!conversation) {
    return NextResponse.json({ error: "对话不存在" }, { status: 404 });
  }

  if (conversation.userId !== userId) {
    return forbiddenResponse();
  }

  const body = await request.json().catch(() => ({}));
  const title = body.title;

  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
  }

  const updated = await prisma.chatConversation.update({
    where: { id },
    data: { title: title.trim() },
    select: { id: true, title: true, mode: true, updatedAt: true },
  });

  return NextResponse.json({ data: updated });
}

/** DELETE /api/chat/conversations/[id] — delete conversation */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireRole([...ALLOWED_ROLES]);
  if (!session) return forbiddenResponse();

  const userId = (session.user as { id?: string })?.id;
  if (!userId) return forbiddenResponse();

  const { id } = await params;

  const conversation = await prisma.chatConversation.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!conversation) {
    return NextResponse.json({ error: "对话不存在" }, { status: 404 });
  }

  if (conversation.userId !== userId) {
    return forbiddenResponse();
  }

  await prisma.chatConversation.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
