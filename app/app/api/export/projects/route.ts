export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyExportToken, unauthorizedResponse } from "@/lib/export-auth";

/** GET /api/export/projects — list all course R&D projects */
export async function GET(request: Request) {
  if (!(await verifyExportToken(request))) return unauthorizedResponse();

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "20", 10)));

  const where = status ? { status } : {};

  const [projects, total] = await Promise.all([
    prisma.courseRndProject.findMany({
      where,
      select: {
        id: true,
        title: true,
        status: true,
        ageRange: true,
        level: true,
        orgForm: true,
        deliverableType: true,
        deliverableName: true,
        lessonCount: true,
        courseDirection: true,
        coreNeeds: true,
        imageStyle: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { publishRecords: true } },
        publishRecords: {
          select: { createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.courseRndProject.count({ where }),
  ]);

  const data = projects.map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status,
    ageRange: p.ageRange,
    level: p.level,
    orgForm: p.orgForm,
    deliverableType: p.deliverableType,
    deliverableName: p.deliverableName,
    lessonCount: p.lessonCount,
    courseDirection: p.courseDirection,
    coreNeeds: p.coreNeeds,
    imageStyle: p.imageStyle,
    publishCount: p._count.publishRecords,
    lastPublishedAt: p.publishRecords[0]?.createdAt ?? null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));

  return NextResponse.json({ data, total, page, pageSize });
}
