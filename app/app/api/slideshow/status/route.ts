import { NextRequest, NextResponse } from "next/server";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { VALID_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await requireRole(VALID_ROLES);
  if (!session) return forbiddenResponse();

  const userId = (session.user as { id: string }).id;
  const packageSlug = req.nextUrl.searchParams.get("slug");

  if (!packageSlug) {
    return NextResponse.json({ error: "缺少 slug 参数" }, { status: 400 });
  }

  // Load published package with lessons
  const pkg = await prisma.coursePackage.findUnique({
    where: { slug: packageSlug },
    include: {
      lessons: {
        orderBy: { lessonNo: "asc" },
        select: {
          id: true,
          lessonNo: true,
          title: true,
          contentData: true,
        },
      },
    },
  });

  if (!pkg) {
    return NextResponse.json({ error: "课程包不存在" }, { status: 404 });
  }

  if (pkg.status !== "published") {
    return NextResponse.json({ error: "课程包未发布" }, { status: 400 });
  }

  // Load user's drafts for this package's lessons
  const lessonIds = pkg.lessons.map((l) => l.id);
  const drafts = await prisma.slideshowDraft.findMany({
    where: {
      lessonId: { in: lessonIds },
      userId,
    },
    select: {
      lessonId: true,
      updatedAt: true,
      themeKey: true,
      status: true,
      progress: true,
      errorMessage: true,
    },
  });

  const draftMap = new Map(drafts.map((d) => [d.lessonId, d]));

  const lessons = pkg.lessons.map((l) => {
    const draft = draftMap.get(l.id);
    let progress = null;
    if (draft?.progress) {
      try { progress = JSON.parse(draft.progress); } catch { /* ignore */ }
    }
    return {
      lessonId: l.id,
      lessonNo: l.lessonNo,
      title: l.title,
      hasContent: !!l.contentData,
      hasDraft: draft?.status === "completed",
      status: draft?.status ?? "idle",
      progress,
      errorMessage: draft?.errorMessage ?? null,
      themeKey: draft?.themeKey ?? null,
      updatedAt: draft?.updatedAt ?? null,
    };
  });

  return NextResponse.json({
    data: {
      packageTitle: pkg.title,
      packageSlug: pkg.slug,
      lessons,
    },
  });
}
