"use client";

import Image from "next/image";
import Link from "next/link";

interface Lesson {
  lessonNo: number;
  title: string;
  outputSummary: string | null;
  durationMinutes: number;
  deliveryMode: string;
  groupSize: string | null;
  aiRoundsCount: number | null;
}

interface CoursePackage {
  id: string;
  slug: string;
  title: string;
  ageRange: string;
  level: string;
  coverImage: string | null;
  lessons: Lesson[];
}

interface Props {
  packages: CoursePackage[];
}

const PLACEHOLDER_COLORS: Record<number, string> = {
  0: "linear-gradient(135deg,#f0f7ff,#e0f0ff)",
  1: "linear-gradient(135deg,#f1e8ff,#edf5ff)",
  2: "linear-gradient(135deg,#fff3e8,#fff8f0)",
};

export default function PackageGrid({ packages }: Props) {
  if (packages.length === 0) {
    return (
      <div className="text-center muted" style={{ padding: "var(--sp-12) 0", fontSize: 15 }}>
        暂无已发布的课程包
      </div>
    );
  }

  return (
    <div className="pkg-grid">
      {packages.map((pkg, i) => {
        const firstLesson = pkg.lessons[0];
        return (
          <div
            key={pkg.id}
            className="pkg-card"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {/* 封面 */}
            <div className="pkg-card__cover" style={{ background: PLACEHOLDER_COLORS[i % 3] ?? "#edf5ff" }}>
              {pkg.coverImage && (
                <Image src={pkg.coverImage} alt={pkg.title} fill style={{ objectFit: "cover" }} />
              )}
              <span className="pkg-card__badge">{pkg.ageRange}岁 · {pkg.level}</span>
            </div>

            {/* 内容 */}
            <div className="pkg-card__body">
              <div className="pkg-card__title">{pkg.title}</div>
              {firstLesson ? (
                <>
                  <div className="pkg-card__meta">
                    <div>● 适用年龄：{pkg.ageRange} 岁</div>
                    <div>● 第 {firstLesson.lessonNo} 课《{firstLesson.title}》</div>
                    {firstLesson.outputSummary && (
                      <div>● 本课成果：{firstLesson.outputSummary}</div>
                    )}
                  </div>
                  <Link href={`/detail/${pkg.slug}`} className="btn btn--block" style={{ marginBottom: "var(--sp-2)" }}>
                    进入详情
                  </Link>
                  <div className="pkg-card__footer">
                    {pkg.level} ｜ {firstLesson.durationMinutes} 分钟
                    {firstLesson.groupSize && ` ｜ ${firstLesson.groupSize} 人${firstLesson.deliveryMode === "offline_small_group" ? "线下小班" : firstLesson.deliveryMode}`}
                    {firstLesson.aiRoundsCount && ` ｜ ${firstLesson.aiRoundsCount} 个 AI 回合`}
                    {" ｜ "}
                    <span className="pill pill--ok" style={{ fontSize: 11, padding: "3px 7px" }}>已按规范接入</span>
                  </div>
                </>
              ) : (
                <div className="muted small">暂无课次</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
