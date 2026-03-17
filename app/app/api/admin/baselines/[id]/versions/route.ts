export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { ROLES } from "@/lib/roles";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireRole([ROLES.ADMIN, ROLES.RD_MANAGER, ROLES.TEACHER]))) {
    return forbiddenResponse();
  }

  const { id } = await params;

  const versions = await prisma.baselineDocVersion.findMany({
    where: { baselineDocId: id },
    orderBy: { versionNo: "desc" },
  });

  return NextResponse.json({ data: versions });
}
