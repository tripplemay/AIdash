export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { ROLES } from "@/lib/roles";

export async function PUT(request: Request) {
  const session = await requireRole([ROLES.ADMIN]);
  if (!session) return forbiddenResponse();

  const body = await request.json();
  const { ids } = body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids 必须为非空数组" }, { status: 400 });
  }

  await prisma.$transaction(
    ids.map((id: string, index: number) =>
      prisma.preset.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  );

  return NextResponse.json({ success: true });
}
