export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { ROLES } from "@/lib/roles";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ actionKey: string }> }
) {
  const session = await requireRole([ROLES.ADMIN]);
  if (!session) return forbiddenResponse();

  const { actionKey } = await params;
  const body = await request.json();
  const { versionNo } = body;

  if (typeof versionNo !== "number") {
    return NextResponse.json({ error: "versionNo 必须为数字" }, { status: 400 });
  }

  const template = await prisma.promptTemplate.findUnique({
    where: { actionKey },
    select: { id: true },
  });

  if (!template) {
    return NextResponse.json({ error: "模板不存在" }, { status: 404 });
  }

  const targetVersion = await prisma.promptTemplateVersion.findUnique({
    where: { templateId_versionNo: { templateId: template.id, versionNo } },
  });

  if (!targetVersion) {
    return NextResponse.json({ error: "目标版本不存在" }, { status: 404 });
  }

  const latestVersion = await prisma.promptTemplateVersion.findFirst({
    where: { templateId: template.id },
    orderBy: { versionNo: "desc" },
  });

  const nextVersionNo = (latestVersion?.versionNo ?? 0) + 1;
  const userId = (session.user as { id?: string })?.id;

  const [version] = await prisma.$transaction([
    prisma.promptTemplateVersion.create({
      data: {
        templateId: template.id,
        versionNo: nextVersionNo,
        content: targetVersion.content,
        editedById: userId,
        editSummary: `回滚到版本 ${versionNo}`,
      },
    }),
    prisma.promptTemplate.update({
      where: { actionKey },
      data: { content: targetVersion.content },
    }),
  ]);

  const finalTemplate = await prisma.promptTemplate.update({
    where: { actionKey },
    data: { currentVersionId: version.id },
  });

  return NextResponse.json({ data: finalTemplate });
}
