export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { ROLES } from "@/lib/roles";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

// GET /api/admin/operation-logs
export async function GET() {
  const session = await requireRole([ROLES.ADMIN, ROLES.RD_MANAGER]);
  if (!session) return forbiddenResponse();

  const userId = (session.user as { id?: string })?.id;
  const role = (session.user as { role?: string })?.role ?? "";

  // admin 看全部，rd_manager 只看自己
  const where = hasPermission(role, PERMISSIONS.VIEW_ALL_LOGS)
    ? {}
    : { userId: userId ?? "" };

  const logs = await prisma.operationLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { name: true, role: true } } },
  });

  return NextResponse.json({ data: logs });
}
