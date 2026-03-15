import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PrintLessonButton from "@/components/PrintLessonButton";
import LessonProgressBar from "@/components/lesson/LessonProgressBar";
import LessonRenderer from "@/components/lesson/LessonRenderer";
import Link from "next/link";
import type { LessonContent } from "@/types/lesson-content";

export const dynamic = "force-dynamic";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>;
}) {
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

  return (
    <>
      <div className="lesson-topbar">
        <div className="lesson-topbar__left">
          <Link href={`/detail/${slug}`} className="lesson-topbar__link">
            &larr; 返回课程包
          </Link>
          <span style={{ color: "var(--line)" }}>|</span>
          <span className="lesson-topbar__title">{lesson.title}</span>
        </div>
        <PrintLessonButton />
        <LessonProgressBar />
      </div>

      <div className="lesson-scroll">
        <LessonRenderer content={lessonContent} />
      </div>
    </>
  );
}
