export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { ROLES } from "@/lib/roles";
import { validateContentData } from "@/lib/lesson-content-schema";

// POST /api/admin/publish — 一键发布课程包（JSON 直接入库）
export async function POST(request: Request) {
  const session = await requireRole([ROLES.ADMIN, ROLES.RD_MANAGER]);
  if (!session) return forbiddenResponse();

  const userId = (session.user as { id?: string })?.id;
  if (!userId) return forbiddenResponse();

  const body = await request.json();
  const { package: pkg, lessons, projectId } = body;

  // 校验 package 必填字段
  if (!pkg?.title || !pkg?.ageRange || !pkg?.level) {
    return NextResponse.json({ error: "缺少课程包必填字段（title/ageRange/level）" }, { status: 400 });
  }

  // slug 自动生成：优先使用前端传入，否则用 projectId 生成
  if (!pkg.slug) {
    if (!projectId) {
      return NextResponse.json({ error: "缺少 slug 或 projectId" }, { status: 400 });
    }
    pkg.slug = `course-${projectId.slice(0, 8)}`;
  }

  // 校验 slug 格式（只允许小写字母、数字和连字符）
  if (!/^[a-z0-9-]+$/.test(pkg.slug)) {
    return NextResponse.json({ error: "slug 格式非法，只允许小写字母、数字和连字符" }, { status: 400 });
  }

  // 校验 lessons 非空
  if (!Array.isArray(lessons) || lessons.length === 0) {
    return NextResponse.json({ error: "课次列表不能为空" }, { status: 400 });
  }

  // 校验每个 lesson 的 contentData
  for (const lesson of lessons) {
    if (!lesson.lessonNo || !lesson.title) {
      return NextResponse.json({ error: `课次 ${lesson.lessonNo ?? "?"} 缺少必填字段` }, { status: 400 });
    }
    if (lesson.contentData) {
      const validation = validateContentData(lesson.contentData);
      if (!validation.success) {
        return NextResponse.json({
          error: `课次 ${lesson.lessonNo} 的 contentData 不符合 v2 规范`,
          details: validation.success === false ? validation.errors : [],
        }, { status: 400 });
      }
    }
  }

  // 数据库事务写入
  try {
    const result = await prisma.$transaction(async (tx) => {
      // upsert CoursePackage
      const coursePackage = await tx.coursePackage.upsert({
        where: { slug: pkg.slug },
        create: {
          slug: pkg.slug,
          title: pkg.title,
          ageRange: pkg.ageRange,
          level: pkg.level,
          summary: pkg.summary ?? null,
          coverImage: pkg.coverImage ?? null,
          status: "published",
        },
        update: {
          title: pkg.title,
          ageRange: pkg.ageRange,
          level: pkg.level,
          summary: pkg.summary ?? null,
          coverImage: pkg.coverImage ?? null,
          status: "published",
        },
      });

      // upsert 每个 Lesson
      let lessonsImported = 0;
      for (const lesson of lessons) {
        await tx.lesson.upsert({
          where: {
            packageId_lessonNo: {
              packageId: coursePackage.id,
              lessonNo: lesson.lessonNo,
            },
          },
          create: {
            packageId: coursePackage.id,
            lessonNo: lesson.lessonNo,
            title: lesson.title,
            durationMinutes: lesson.durationMinutes ?? 45,
            deliveryMode: lesson.deliveryMode ?? "offline_small_group",
            groupSize: lesson.groupSize ?? null,
            aiRoundsCount: lesson.aiRoundsCount ?? null,
            outputSummary: lesson.outputSummary ?? null,
            contentData: lesson.contentData ? JSON.stringify(lesson.contentData) : null,
            status: "published",
          },
          update: {
            title: lesson.title,
            durationMinutes: lesson.durationMinutes ?? 45,
            deliveryMode: lesson.deliveryMode ?? "offline_small_group",
            groupSize: lesson.groupSize ?? null,
            aiRoundsCount: lesson.aiRoundsCount ?? null,
            outputSummary: lesson.outputSummary ?? null,
            contentData: lesson.contentData ? JSON.stringify(lesson.contentData) : null,
            status: "published",
          },
        });
        lessonsImported++;
      }

      // 写入发布记录（如果有 projectId）
      if (projectId) {
        await tx.courseRndPublishRecord.create({
          data: {
            projectId,
            packageSlug: pkg.slug,
            packageTitle: pkg.title,
            publishedById: userId,
            resultJson: JSON.stringify({ lessonsImported }),
          },
        });
      }

      return { slug: pkg.slug, title: pkg.title, lessonsImported };
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `发布失败：${msg}` }, { status: 500 });
  }
}
