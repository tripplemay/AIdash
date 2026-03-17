export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { ROLES } from "@/lib/roles";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ actionKey: string }> }
) {
  const session = await requireRole([ROLES.ADMIN, ROLES.RD_MANAGER, ROLES.TEACHER]);
  if (!session) return forbiddenResponse();

  const { actionKey } = await params;
  const template = await prisma.promptTemplate.findUnique({
    where: { actionKey },
  });

  if (!template) {
    return NextResponse.json({ error: "模板不存在" }, { status: 404 });
  }

  return NextResponse.json({ data: template });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ actionKey: string }> }
) {
  const session = await requireRole([ROLES.ADMIN]);
  if (!session) return forbiddenResponse();

  const { actionKey } = await params;
  const body = await request.json();
  const { content, editSummary } = body;

  if (!content) {
    return NextResponse.json({ error: "内容不能为空" }, { status: 400 });
  }

  const template = await prisma.promptTemplate.findUnique({
    where: { actionKey },
    include: { versions: { orderBy: { versionNo: "desc" }, take: 1 } },
  });

  if (!template) {
    return NextResponse.json({ error: "模板不存在" }, { status: 404 });
  }

  const nextVersionNo = template.versions.length > 0
    ? template.versions[0].versionNo + 1
    : 1;

  const userId = (session.user as { id?: string })?.id;

  const [version, updated] = await prisma.$transaction([
    prisma.promptTemplateVersion.create({
      data: {
        templateId: template.id,
        versionNo: nextVersionNo,
        content,
        editedById: userId,
        editSummary: editSummary || null,
      },
    }),
    prisma.promptTemplate.update({
      where: { actionKey },
      data: { content, currentVersionId: undefined },
    }),
  ]);

  const finalTemplate = await prisma.promptTemplate.update({
    where: { actionKey },
    data: { currentVersionId: version.id },
  });

  return NextResponse.json({ data: finalTemplate });
}
