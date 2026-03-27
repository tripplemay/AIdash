import { NextRequest, NextResponse } from "next/server";
import AdmZip from "adm-zip";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { VALID_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { buildPptx } from "@/lib/slideshow/pptx-builder";
import type { SlideshowOutput } from "@/types/slideshow";

export async function GET(req: NextRequest) {
  const session = await requireRole(VALID_ROLES);
  if (!session) return forbiddenResponse();

  const userId = (session.user as { id: string }).id;
  const packageSlug = req.nextUrl.searchParams.get("slug");

  if (!packageSlug) {
    return NextResponse.json({ error: "缺少 slug 参数" }, { status: 400 });
  }

  // Load package
  const pkg = await prisma.coursePackage.findUnique({
    where: { slug: packageSlug },
    include: {
      lessons: {
        orderBy: { lessonNo: "asc" },
        select: { id: true, lessonNo: true, title: true },
      },
    },
  });

  if (!pkg || pkg.status !== "published") {
    return NextResponse.json({ error: "课程包不存在或未发布" }, { status: 404 });
  }

  // Load user's completed drafts
  const lessonIds = pkg.lessons.map((l) => l.id);
  const drafts = await prisma.slideshowDraft.findMany({
    where: { lessonId: { in: lessonIds }, userId, status: "completed" },
  });

  if (drafts.length === 0) {
    return NextResponse.json({ error: "暂无已生成的课件" }, { status: 404 });
  }

  const lessonMap = new Map(pkg.lessons.map((l) => [l.id, l]));

  // Build zip
  const zip = new AdmZip();

  for (const draft of drafts) {
    const lesson = lessonMap.get(draft.lessonId);
    if (!lesson) continue;

    try {
      const slideshowOutput: SlideshowOutput = JSON.parse(draft.contentJson);

      const buffer = await buildPptx(slideshowOutput, draft.themeKey, {
        courseTitle: pkg.title,
        lessonTitle: lesson.title,
        lessonNo: lesson.lessonNo,
      });

      const filename = `第${lesson.lessonNo}课_${lesson.title}.pptx`;
      zip.addFile(filename, buffer);
    } catch {
      // Skip failed lessons
    }
  }

  const zipBuffer = zip.toBuffer();
  const filename = encodeURIComponent(`${pkg.title}_课件.zip`);

  return new NextResponse(new Uint8Array(zipBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
    },
  });
}
