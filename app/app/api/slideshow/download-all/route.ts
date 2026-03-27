import { NextRequest, NextResponse } from "next/server";
import AdmZip from "adm-zip";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { VALID_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { buildPptx } from "@/lib/slideshow/pptx-builder";
import type { SlideshowOutput, SlideshowTheme } from "@/types/slideshow";

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

  // Load user's drafts
  const lessonIds = pkg.lessons.map((l) => l.id);
  const drafts = await prisma.slideshowDraft.findMany({
    where: { lessonId: { in: lessonIds }, userId },
  });

  if (drafts.length === 0) {
    return NextResponse.json({ error: "暂无已生成的课件" }, { status: 404 });
  }

  // Build lesson lookup
  const lessonMap = new Map(pkg.lessons.map((l) => [l.id, l]));

  // Collect unique theme keys and load them
  const themeKeys = [...new Set(drafts.map((d) => d.themeKey))];
  const themePresets = await prisma.preset.findMany({
    where: { category: "slideshow_theme", name: { in: themeKeys } },
  });
  const themeMap = new Map(themePresets.map((t) => [t.name, t.value]));

  // Build zip
  const zip = new AdmZip();

  for (const draft of drafts) {
    const lesson = lessonMap.get(draft.lessonId);
    if (!lesson) continue;

    const themeJson = themeMap.get(draft.themeKey);
    if (!themeJson) continue;

    try {
      const slideshowOutput: SlideshowOutput = JSON.parse(draft.contentJson);
      const theme: SlideshowTheme = JSON.parse(themeJson);

      const buffer = await buildPptx(slideshowOutput, theme, {
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
