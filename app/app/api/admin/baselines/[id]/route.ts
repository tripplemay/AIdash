export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { ROLES } from "@/lib/roles";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole([ROLES.ADMIN, ROLES.RD_MANAGER, ROLES.TEACHER]);
  if (!session) return forbiddenResponse();

  const { id } = await params;
  const baseline = await prisma.baselineDoc.findUnique({ where: { id } });

  if (!baseline) {
    return NextResponse.json({ error: "基线文档不存在" }, { status: 404 });
  }

  return NextResponse.json({ data: baseline });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole([ROLES.ADMIN]);
  if (!session) return forbiddenResponse();

  const { id } = await params;
  const body = await request.json();
  const { content, editSummary } = body;

  if (!content) {
    return NextResponse.json({ error: "内容不能为空" }, { status: 400 });
  }

  const baseline = await prisma.baselineDoc.findUnique({
    where: { id },
    include: { versions: { orderBy: { versionNo: "desc" }, take: 1 } },
  });

  if (!baseline) {
    return NextResponse.json({ error: "基线文档不存在" }, { status: 404 });
  }

  const nextVersionNo = baseline.versions.length > 0
    ? baseline.versions[0].versionNo + 1
    : 1;

  const userId = (session.user as { id?: string })?.id;

  const [version, updated] = await prisma.$transaction([
    prisma.baselineDocVersion.create({
      data: {
        baselineDocId: id,
        versionNo: nextVersionNo,
        content,
        editedById: userId,
        editSummary: editSummary || null,
      },
    }),
    prisma.baselineDoc.update({
      where: { id },
      data: { content, currentVersionId: undefined },
    }),
  ]);

  const finalDoc = await prisma.baselineDoc.update({
    where: { id },
    data: { currentVersionId: version.id },
  });

  return NextResponse.json({ data: finalDoc });
}
