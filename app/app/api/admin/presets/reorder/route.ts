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

  // 按 ID 排序后更新，保证锁定顺序一致，避免并发死锁
  const idToOrder = new Map(ids.map((id: string, index: number) => [id, index]));
  const sortedIds = [...ids].sort();
  await prisma.$transaction(
    sortedIds.map((id: string) =>
      prisma.preset.update({
        where: { id },
        data: { sortOrder: idToOrder.get(id)! },
      })
    )
  );

  return NextResponse.json({ success: true });
}
