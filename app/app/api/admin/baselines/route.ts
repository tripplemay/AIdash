export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { ROLES } from "@/lib/roles";

export async function GET() {
  if (!(await requireRole([ROLES.ADMIN, ROLES.RD_MANAGER, ROLES.TEACHER]))) {
    return forbiddenResponse();
  }

  const baselines = await prisma.baselineDoc.findMany({
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
  });

  return NextResponse.json({ data: baselines });
}
