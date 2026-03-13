import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// GET /api/packages/[slug] — 获取课程包详情
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未授权" }, { status: 401 });

  const { slug } = await params;
  const pkg = await prisma.coursePackage.findUnique({
    where: { slug },
    include: {
      lessons: {
        orderBy: { lessonNo: "asc" },
        include: { attachments: true },
      },
    },
  });

  if (!pkg) return NextResponse.json({ error: "课程包不存在" }, { status: 404 });

  return NextResponse.json({ data: pkg });
}
