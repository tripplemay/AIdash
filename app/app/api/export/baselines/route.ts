export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyExportToken, unauthorizedResponse } from "@/lib/export-auth";

/** GET /api/export/baselines — all baseline documents with version info */
export async function GET(request: Request) {
  if (!(await verifyExportToken(request))) return unauthorizedResponse();

  const baselines = await prisma.baselineDoc.findMany({
    select: {
      id: true,
      type: true,
      key: true,
      label: true,
      content: true,
      sortOrder: true,
      updatedAt: true,
      versions: {
        select: { versionNo: true },
        orderBy: { versionNo: "desc" },
        take: 1,
      },
    },
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
  });

  const data = baselines.map((b) => ({
    id: b.id,
    type: b.type,
    key: b.key,
    label: b.label,
    content: b.content,
    currentVersionNo: b.versions[0]?.versionNo ?? 1,
    sortOrder: b.sortOrder,
    updatedAt: b.updatedAt,
  }));

  return NextResponse.json({ data });
}
