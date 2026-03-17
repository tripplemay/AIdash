export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { ROLES } from "@/lib/roles";
import { computeLineDiff } from "@/lib/diff-utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireRole([ROLES.ADMIN, ROLES.RD_MANAGER, ROLES.TEACHER]))) {
    return forbiddenResponse();
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const v1 = Number(searchParams.get("v1"));
  const v2 = Number(searchParams.get("v2"));

  if (!v1 || !v2) {
    return NextResponse.json({ error: "需要 v1 和 v2 参数" }, { status: 400 });
  }

  const [version1, version2] = await Promise.all([
    prisma.baselineDocVersion.findUnique({
      where: { baselineDocId_versionNo: { baselineDocId: id, versionNo: v1 } },
    }),
    prisma.baselineDocVersion.findUnique({
      where: { baselineDocId_versionNo: { baselineDocId: id, versionNo: v2 } },
    }),
  ]);

  if (!version1 || !version2) {
    return NextResponse.json({ error: "版本不存在" }, { status: 404 });
  }

  const hunks = computeLineDiff(version1.content, version2.content);

  return NextResponse.json({
    data: {
      v1: {
        versionNo: version1.versionNo,
        editSummary: version1.editSummary,
        createdAt: version1.createdAt,
      },
      v2: {
        versionNo: version2.versionNo,
        editSummary: version2.editSummary,
        createdAt: version2.createdAt,
      },
      hunks,
    },
  });
}
