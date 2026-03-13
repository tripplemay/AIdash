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
      <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)", fontSize: 15 }}>
        暂无已发布的课程包
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }}>
      {packages.map((pkg, i) => {
        const firstLesson = pkg.lessons[0];
        return (
          <div
            key={pkg.id}
            style={{
              borderRadius: 22, overflow: "hidden",
              background: "rgba(255,255,255,0.82)",
              border: "1px solid var(--line)",
              transition: "box-shadow 0.2s, transform 0.2s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 32px rgba(112,134,210,0.14)";
              (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = "none";
              (e.currentTarget as HTMLElement).style.transform = "none";
            }}
          >
            {/* 封面 */}
            <div style={{ height: 200, position: "relative", overflow: "hidden", background: PLACEHOLDER_COLORS[i % 3] ?? "#edf5ff" }}>
              {pkg.coverImage && (
                <Image src={pkg.coverImage} alt={pkg.title} fill style={{ objectFit: "cover" }} />
              )}
            </div>

            {/* 内容 */}
            <div style={{ padding: "16px 18px" }}>
              <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 10 }}>{pkg.title}</div>
              {firstLesson ? (
                <>
                  <div style={{ display: "grid", gap: 6, color: "#6b7daf", fontSize: 14, marginBottom: 16 }}>
                    <div>● 适用年龄：{pkg.ageRange} 岁</div>
                    <div>● 第 {firstLesson.lessonNo} 课《{firstLesson.title}》</div>
                    {firstLesson.outputSummary && (
                      <div>● 本课成果：{firstLesson.outputSummary}</div>
                    )}
                  </div>
                  <Link
                    href={`/detail/${pkg.slug}`}
                    style={{
                      display: "block", width: "100%", height: 44,
                      borderRadius: 999, textAlign: "center", lineHeight: "44px",
                      fontSize: 14, fontWeight: 700,
                      color: "#fff",
                      background: "linear-gradient(90deg, #6f86ff, #61d1ff)",
                      boxShadow: "0 10px 22px rgba(111,134,255,.18)",
                      textDecoration: "none",
                      marginBottom: 10,
                    }}
                  >
                    进入详情
                  </Link>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    {pkg.level} ｜ {firstLesson.durationMinutes} 分钟
                    {firstLesson.groupSize && ` ｜ ${firstLesson.groupSize} 人${firstLesson.deliveryMode === "offline_small_group" ? "线下小班" : firstLesson.deliveryMode}`}
                    {firstLesson.aiRoundsCount && ` ｜ ${firstLesson.aiRoundsCount} 个 AI 回合`}
                    {" ｜ "}
                    <span style={{
                      display: "inline-flex", alignItems: "center",
                      padding: "3px 7px", borderRadius: 999,
                      background: "#eefaf2", color: "#228654",
                      border: "1px solid #d7f0e0", fontSize: 11, fontWeight: 600,
                    }}>
                      已按规范接入
                    </span>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 13, color: "var(--muted)" }}>暂无课次</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
