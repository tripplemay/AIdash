export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { ROLES } from "@/lib/roles";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ actionKey: string }> }
) {
  if (!(await requireRole([ROLES.ADMIN, ROLES.RD_MANAGER, ROLES.TEACHER]))) {
    return forbiddenResponse();
  }

  const { actionKey } = await params;

  const template = await prisma.promptTemplate.findUnique({
    where: { actionKey },
    select: { id: true },
  });

  if (!template) {
    return NextResponse.json({ error: "模板不存在" }, { status: 404 });
  }

  const versions = await prisma.promptTemplateVersion.findMany({
    where: { templateId: template.id },
    orderBy: { versionNo: "desc" },
  });

  return NextResponse.json({ data: versions });
}
