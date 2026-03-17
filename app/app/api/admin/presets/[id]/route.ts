export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { ROLES } from "@/lib/roles";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole([ROLES.ADMIN]);
  if (!session) return forbiddenResponse();

  const { id } = await params;
  const body = await request.json();
  const { name, value, sortOrder, isActive } = body;

  const existing = await prisma.preset.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "预设不存在" }, { status: 404 });
  }

  const preset = await prisma.preset.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(value !== undefined && { value }),
      ...(sortOrder !== undefined && { sortOrder }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  return NextResponse.json({ data: preset });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole([ROLES.ADMIN]);
  if (!session) return forbiddenResponse();

  const { id } = await params;

  const existing = await prisma.preset.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "预设不存在" }, { status: 404 });
  }

  await prisma.preset.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
