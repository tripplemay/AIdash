export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// GET /api/packages — 获取已发布课程包列表
export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未授权" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const ageRange = searchParams.get("ageRange") ?? "";
  const level = searchParams.get("level") ?? "";

  const packages = await prisma.coursePackage.findMany({
    where: {
      status: "published",
      ...(q && { title: { contains: q } }),
      ...(ageRange && { ageRange }),
      ...(level && { level }),
    },
    include: {
      lessons: {
        orderBy: { lessonNo: "asc" },
        include: { attachments: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ data: packages });
}
