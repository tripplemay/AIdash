import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const lessonId = req.nextUrl.searchParams.get("lessonId");
  if (!lessonId) return NextResponse.json([]);

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { packageId: true },
  });

  if (!lesson) return NextResponse.json([]);

  const pkg = await prisma.coursePackage.findFirst({
    where: { id: lesson.packageId },
    select: {
      title: true,
      slug: true,
      lessons: {
        orderBy: { lessonNo: "asc" },
        select: { id: true, lessonNo: true, title: true },
      },
    },
  });

  return NextResponse.json(pkg ?? null);
}
