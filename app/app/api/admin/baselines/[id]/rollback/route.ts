export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { ROLES } from "@/lib/roles";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole([ROLES.ADMIN]);
  if (!session) return forbiddenResponse();

  const { id } = await params;
  const body = await request.json();
  const { versionNo } = body;

  if (typeof versionNo !== "number") {
    return NextResponse.json({ error: "versionNo 必须为数字" }, { status: 400 });
  }

  const targetVersion = await prisma.baselineDocVersion.findUnique({
    where: { baselineDocId_versionNo: { baselineDocId: id, versionNo } },
  });

  if (!targetVersion) {
    return NextResponse.json({ error: "目标版本不存在" }, { status: 404 });
  }

  const latestVersion = await prisma.baselineDocVersion.findFirst({
    where: { baselineDocId: id },
    orderBy: { versionNo: "desc" },
  });

  const nextVersionNo = (latestVersion?.versionNo ?? 0) + 1;
  const userId = (session.user as { id?: string })?.id;

  const [version] = await prisma.$transaction([
    prisma.baselineDocVersion.create({
      data: {
        baselineDocId: id,
        versionNo: nextVersionNo,
        content: targetVersion.content,
        editedById: userId,
        editSummary: `回滚到版本 ${versionNo}`,
      },
    }),
    prisma.baselineDoc.update({
      where: { id },
      data: { content: targetVersion.content },
    }),
  ]);

  const finalDoc = await prisma.baselineDoc.update({
    where: { id },
    data: { currentVersionId: version.id },
  });

  return NextResponse.json({ data: finalDoc });
}
