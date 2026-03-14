import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import PrintLessonButton from "@/components/PrintLessonButton";
import LessonRenderer from "@/components/lesson/LessonRenderer";
import Link from "next/link";
import type { LessonContent } from "@/types/lesson-content";

export const dynamic = "force-dynamic";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/");

  const { slug, lessonId } = await params;

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, title: true, contentData: true },
  });

  if (!lesson?.contentData) notFound();

  let lessonContent: LessonContent;
  try {
    lessonContent = JSON.parse(lesson.contentData) as LessonContent;
  } catch {
    notFound();
  }

  const userName = session.user?.name ?? "老师";
  const userRole = (session.user as { role?: string })?.role ?? "teacher";

  return (
    <div style={{ padding: 20 }}>
      <div style={{
        borderRadius: 28,
        background: "linear-gradient(135deg, rgba(244,247,255,0.96), rgba(238,242,255,0.96))",
        overflow: "hidden",
        position: "relative",
      }}>
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: `
            radial-gradient(circle at 78% 12%, rgba(161,196,255,0.15), transparent 18%),
            radial-gradient(circle at 12% 84%, rgba(186,201,255,0.16), transparent 26%)
          `,
        }} />

        <div style={{
          position: "relative", zIndex: 1,
          display: "grid",
          gridTemplateColumns: "var(--sidebar-w) 1fr",
          height: "calc(100vh - 40px)",
        }}>
          <Sidebar variant="lesson" userName={userName} backHref={`/detail/${slug}`} userRole={userRole} />

          <main style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{
              height: 54,
              borderBottom: "1px solid var(--line)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 20px",
              background: "rgba(255,255,255,0.6)",
              backdropFilter: "blur(8px)",
              flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Link
                  href={`/detail/${slug}`}
                  style={{
                    fontSize: 13, color: "var(--brand)",
                    textDecoration: "none", fontWeight: 600,
                  }}
                >
                  ← 返回课程包
                </Link>
                <span style={{ color: "var(--line)" }}>|</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
                  {lesson.title}
                </span>
              </div>
              <PrintLessonButton />
            </div>

            <div style={{ flex: 1, overflowY: "auto" }}>
              <LessonRenderer content={lessonContent} />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
