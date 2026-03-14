export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import AdmZip from "adm-zip";
import path from "node:path";
import fs from "node:fs";

const SLUG_RE = /^[a-z0-9-]+$/;
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

async function requireAdmin() {
  const session = await auth();
  if (!session) return null;
  const user = session.user as { role?: string };
  if (user.role !== "admin") return null;
  return session;
}

interface PackageManifest {
  package_slug: string;
  package_title: string;
  age_range: string;
  level: string;
  summary?: string;
  cover_image?: string;
  lessons: Array<{ lesson_no: number; lesson_dir: string }>;
}

interface LessonManifest {
  lesson_no: number;
  lesson_title: string;
  duration_minutes?: number;
  delivery_mode?: string;
  group_size?: string;
  ai_rounds_count?: number;
  output_summary?: string;
  entry_file?: string;
  attachments?: Array<{ type: string; title: string; path: string }>;
}

// POST /api/admin/upload — 上传课程包 zip
export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  // 解析 FormData
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "请求格式错误，需要 multipart/form-data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "缺少 file 字段" }, { status: 400 });
  }
  if (!file.name.endsWith(".zip")) {
    return NextResponse.json({ error: "文件必须为 .zip 格式" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "文件大小超出限制（最大 50MB）" }, { status: 400 });
  }

  // 读取 zip
  const buffer = Buffer.from(await file.arrayBuffer());
  let zip: AdmZip;
  try {
    zip = new AdmZip(buffer);
  } catch {
    return NextResponse.json({ error: "zip 文件损坏或格式无效" }, { status: 400 });
  }

  // 确定根目录（= package slug）
  const entries = zip.getEntries();
  const rootDirs = [...new Set(
    entries.map(e => e.entryName.split("/")[0]).filter(Boolean)
  )];
  if (rootDirs.length !== 1) {
    return NextResponse.json({ error: "zip 根目录结构异常，必须有且只有一个根目录" }, { status: 400 });
  }
  const slug = rootDirs[0];
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ error: `slug 格式非法（只允许小写字母、数字和连字符）：${slug}` }, { status: 400 });
  }

  // 读取 package.json
  const pkgEntry = zip.getEntry(`${slug}/package.json`);
  if (!pkgEntry) {
    return NextResponse.json({ error: "zip 缺少 package.json" }, { status: 400 });
  }
  let pkgManifest: PackageManifest;
  try {
    pkgManifest = JSON.parse(pkgEntry.getData().toString("utf8"));
  } catch {
    return NextResponse.json({ error: "package.json 解析失败" }, { status: 400 });
  }
  if (!pkgManifest.package_slug || !pkgManifest.package_title || !pkgManifest.age_range || !pkgManifest.level) {
    return NextResponse.json({ error: "package.json 缺少必填字段（package_slug / package_title / age_range / level）" }, { status: 400 });
  }
  if (!Array.isArray(pkgManifest.lessons) || pkgManifest.lessons.length === 0) {
    return NextResponse.json({ error: "package.json 中 lessons 为空" }, { status: 400 });
  }

  // 解压到 UPLOADS_DIR（持久目录，不随部署被 rsync 清除）
  // 生产环境：/opt/aidash/uploads/course-packages/
  // 开发环境：public/course-packages/（兜底）
  const uploadsBase =
    process.env.UPLOADS_DIR ?? path.join(process.cwd(), "public", "course-packages");
  const destPath = path.join(uploadsBase, slug);
  try {
    zip.extractAllTo(uploadsBase, true);
  } catch (e) {
    return NextResponse.json({ error: `文件解压失败：${e instanceof Error ? e.message : String(e)}` }, { status: 500 });
  }

  // 数据库 upsert（事务）
  let lessonsImported = 0;
  let attachmentsImported = 0;

  try {
    await prisma.$transaction(async (tx) => {
      // upsert CoursePackage
      const coverImage = pkgManifest.cover_image
        ? `/api/course-files/${slug}/${pkgManifest.cover_image}`
        : null;

      const pkg = await tx.coursePackage.upsert({
        where: { slug },
        create: {
          slug,
          title: pkgManifest.package_title,
          ageRange: pkgManifest.age_range,
          level: pkgManifest.level,
          summary: pkgManifest.summary ?? null,
          coverImage,
          status: "published",
        },
        update: {
          title: pkgManifest.package_title,
          ageRange: pkgManifest.age_range,
          level: pkgManifest.level,
          summary: pkgManifest.summary ?? null,
          coverImage,
          status: "published",
        },
      });

      // 遍历每个 lesson
      for (const lessonRef of pkgManifest.lessons) {
        const lessonJsonEntry = zip.getEntry(
          `${slug}/lessons/${lessonRef.lesson_dir}/lesson.json`
        );
        if (!lessonJsonEntry) {
          throw new Error(`缺少 lesson.json：lessons/${lessonRef.lesson_dir}/lesson.json`);
        }

        let lessonManifest: LessonManifest;
        try {
          lessonManifest = JSON.parse(lessonJsonEntry.getData().toString("utf8"));
        } catch {
          throw new Error(`lesson.json 解析失败：lessons/${lessonRef.lesson_dir}/lesson.json`);
        }

        const contentPath = `/api/course-files/${slug}/lessons/${lessonRef.lesson_dir}/${lessonManifest.entry_file ?? "index.html"}`;

        const lesson = await tx.lesson.upsert({
          where: {
            packageId_lessonNo: {
              packageId: pkg.id,
              lessonNo: lessonManifest.lesson_no,
            },
          },
          create: {
            packageId: pkg.id,
            lessonNo: lessonManifest.lesson_no,
            title: lessonManifest.lesson_title,
            durationMinutes: lessonManifest.duration_minutes ?? 45,
            deliveryMode: lessonManifest.delivery_mode ?? "offline_small_group",
            groupSize: lessonManifest.group_size ?? null,
            aiRoundsCount: lessonManifest.ai_rounds_count ?? null,
            outputSummary: lessonManifest.output_summary ?? null,
            entryFile: lessonManifest.entry_file ?? "index.html",
            contentPath,
            status: "published",
          },
          update: {
            title: lessonManifest.lesson_title,
            durationMinutes: lessonManifest.duration_minutes ?? 45,
            deliveryMode: lessonManifest.delivery_mode ?? "offline_small_group",
            groupSize: lessonManifest.group_size ?? null,
            aiRoundsCount: lessonManifest.ai_rounds_count ?? null,
            outputSummary: lessonManifest.output_summary ?? null,
            entryFile: lessonManifest.entry_file ?? "index.html",
            contentPath,
            status: "published",
          },
        });

        // 重建附件（先删后建）
        await tx.attachment.deleteMany({ where: { lessonId: lesson.id } });

        if (Array.isArray(lessonManifest.attachments) && lessonManifest.attachments.length > 0) {
          const attachmentData = lessonManifest.attachments.map((a) => ({
            lessonId: lesson.id,
            type: a.type,
            title: a.title,
            path: `/api/course-files/${slug}/lessons/${lessonRef.lesson_dir}/${a.path}`,
          }));
          await tx.attachment.createMany({ data: attachmentData });
          attachmentsImported += attachmentData.length;
        }

        lessonsImported++;
      }
    });
  } catch (e) {
    // 数据库失败，回滚已解压文件
    try {
      fs.rmSync(destPath, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
    return NextResponse.json(
      { error: `数据库写入失败：${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      data: {
        slug,
        title: pkgManifest.package_title,
        lessonsImported,
        attachmentsImported,
      },
    },
    { status: 201 }
  );
}
