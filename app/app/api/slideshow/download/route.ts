import { NextRequest, NextResponse } from "next/server";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { VALID_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { buildPptx } from "@/lib/slideshow/pptx-builder";
import type { SlideshowOutput } from "@/types/slideshow";

export async function GET(req: NextRequest) {
  const session = await requireRole(VALID_ROLES);
  if (!session) return forbiddenResponse();

  const userId = (session.user as { id: string }).id;
  const lessonId = req.nextUrl.searchParams.get("lessonId");

  if (!lessonId) {
    return NextResponse.json({ error: "缺少 lessonId 参数" }, { status: 400 });
  }

  // Load draft
  const draft = await prisma.slideshowDraft.findUnique({
    where: { lessonId_userId: { lessonId, userId } },
    include: {
      lesson: {
        include: { package: true },
      },
    },
  });

  if (!draft) {
    return NextResponse.json({ error: "课件未生成，请先生成课件" }, { status: 404 });
  }

  if (draft.status !== "completed") {
    return NextResponse.json({ error: "课件正在生成中，请稍后再试" }, { status: 409 });
  }

  try {
    const slideshowOutput: SlideshowOutput = JSON.parse(draft.contentJson);

    const buffer = await buildPptx(slideshowOutput, draft.themeKey, {
      courseTitle: draft.lesson.package.title,
      lessonTitle: draft.lesson.title,
      lessonNo: draft.lesson.lessonNo,
    });

    const filename = encodeURIComponent(
      `${draft.lesson.package.title}_第${draft.lesson.lessonNo}课_${draft.lesson.title}.pptx`,
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "下载失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
