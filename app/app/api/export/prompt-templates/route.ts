export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyExportToken, unauthorizedResponse } from "@/lib/export-auth";
import { TEMPLATE_VARIABLES } from "@/lib/ai/template-variables";

/** Regex to extract {{变量名}} from template content */
const VARIABLE_RE = /\{\{(.+?)\}\}/g;

/** GET /api/export/prompt-templates — all prompt templates with version info and variables */
export async function GET(request: Request) {
  if (!(await verifyExportToken(request))) return unauthorizedResponse();

  const templates = await prisma.promptTemplate.findMany({
    select: {
      id: true,
      actionKey: true,
      actionLabel: true,
      content: true,
      updatedAt: true,
      versions: {
        select: { versionNo: true },
        orderBy: { versionNo: "desc" },
        take: 1,
      },
    },
    orderBy: { actionKey: "asc" },
  });

  const data = templates.map((t) => {
    // Extract variables used in this template
    const usedVarNames = new Set<string>();
    let match;
    while ((match = VARIABLE_RE.exec(t.content)) !== null) {
      usedVarNames.add(match[1]);
    }

    const variables = TEMPLATE_VARIABLES
      .filter((v) => usedVarNames.has(v.key))
      .map((v) => ({
        name: v.key,
        group: v.group,
        description: v.description,
      }));

    return {
      id: t.id,
      actionKey: t.actionKey,
      actionLabel: t.actionLabel,
      content: t.content,
      currentVersionNo: t.versions[0]?.versionNo ?? 1,
      variables,
      updatedAt: t.updatedAt,
    };
  });

  return NextResponse.json({ data });
}
