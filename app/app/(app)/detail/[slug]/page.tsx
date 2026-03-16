import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { SetTopBar } from "@/components/TopBarContext";
import EnterLessonButton from "@/components/EnterLessonButton";
import { isLessonAccessible } from "@/lib/lesson-utils";
import Image from "next/image";

export default async function DetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const pkg = await prisma.coursePackage.findUnique({
    where: { slug },
    include: {
      lessons: {
        orderBy: { lessonNo: "asc" },
        select: {
          id: true, lessonNo: true, title: true, durationMinutes: true,
          deliveryMode: true, groupSize: true, aiRoundsCount: true,
          outputSummary: true, contentPath: true, contentData: true, status: true,
          attachments: true,
        },
      },
    },
  });

  if (!pkg) notFound();

  return (
    <>
      <SetTopBar
        breadcrumb="课程包列表"
        title={pkg.title}
      />

      <div id="package-info" className="detail-info">
        <div className={`detail-cover${pkg.coverImage ? "" : " detail-cover--empty"}`}>
          {pkg.coverImage && (
            <Image src={pkg.coverImage} alt={`${pkg.title}主图`} fill style={{ objectFit: "cover" }} />
          )}
        </div>

        <div>
          <span className="pill">样板课</span>
          <h1 className="detail-info__title">{pkg.title}</h1>
          {pkg.summary && <p className="detail-info__summary">{pkg.summary}</p>}

          <div className="detail-meta-grid">
            {[
              { label: "适用年龄段", value: `${pkg.ageRange} 岁` },
              { label: "级别", value: pkg.level },
              { label: "状态", value: pkg.status === "published" ? "已发布" : "草稿", green: pkg.status === "published" },
              { label: "接入方式", value: "标准单课成品包" },
            ].map(({ label, value, green }) => (
              <div key={label} className="detail-meta-item">
                <div className="detail-meta-label">{label}</div>
                <div className={`detail-meta-value${green ? " detail-meta-value--success" : ""}`}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div id="lesson-list" className="lesson-list">
        <div style={{ marginBottom: "var(--sp-4)" }}>
          <h2 className="lesson-list__title">课次列表</h2>
          <p className="muted small">点击「进入本课」直接打开已确认原型内容</p>
        </div>

        {pkg.lessons.length === 0 ? (
          <div className="text-center muted" style={{ padding: "var(--sp-10) 0" }}>暂无课次</div>
        ) : (
          <div style={{ display: "grid", gap: "var(--sp-2)" }}>
            {pkg.lessons.map((lesson) => (
              <div key={lesson.id} className="lesson-row">
                <div className="lesson-row__no">第 {lesson.lessonNo} 课</div>
                <div>
                  <div className="lesson-row__title">{lesson.title}</div>
                  <div className="lesson-row__tags">
                    <span className="pill">{lesson.durationMinutes} 分钟</span>
                    {lesson.status === "published" && <span className="pill pill--ok">已按规范接入</span>}
                  </div>
                  <div className="lesson-row__meta">
                    {[
                      lesson.groupSize
                        ? `${lesson.groupSize} 人${lesson.deliveryMode === "offline_small_group" ? "线下小班" : lesson.deliveryMode}`
                        : lesson.deliveryMode === "offline_small_group" ? "线下小班" : lesson.deliveryMode,
                      ...(lesson.aiRoundsCount ? [`${lesson.aiRoundsCount} 个 AI 回合`] : []),
                    ].join(" · ")}
                  </div>
                  {lesson.outputSummary && <div className="lesson-row__summary">本课成果：{lesson.outputSummary}</div>}
                </div>
                {isLessonAccessible(lesson) ? (
                  <EnterLessonButton slug={slug} lessonId={lesson.id} />
                ) : (
                  <span className="muted small">未接入</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
