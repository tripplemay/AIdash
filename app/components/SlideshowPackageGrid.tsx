"use client";

import Image from "next/image";
import Link from "next/link";
import { formatAgeRange } from "@/lib/age-range-labels";

interface CoursePackage {
  id: string;
  slug: string;
  title: string;
  ageRange: string;
  level: string;
  coverImage: string | null;
  lessons: { lessonNo: number; title: string }[];
}

interface Props {
  packages: CoursePackage[];
  ageRangeLabels?: Record<string, string>;
}

const PLACEHOLDER_COLORS: Record<number, string> = {
  0: "linear-gradient(135deg,#f0f7ff,#e0f0ff)",
  1: "linear-gradient(135deg,#f1e8ff,#edf5ff)",
  2: "linear-gradient(135deg,#fff3e8,#fff8f0)",
};

export default function SlideshowPackageGrid({ packages, ageRangeLabels }: Props) {
  if (packages.length === 0) {
    return (
      <div className="text-center muted" style={{ padding: "var(--sp-12) 0", fontSize: 15 }}>
        暂无已发布的课程包
      </div>
    );
  }

  return (
    <div className="pkg-grid">
      {packages.map((pkg, i) => (
        <div
          key={pkg.id}
          className="pkg-card"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="pkg-card__cover" style={{ background: PLACEHOLDER_COLORS[i % 3] ?? "#edf5ff" }}>
            {pkg.coverImage && (
              <Image src={pkg.coverImage} alt={pkg.title} fill style={{ objectFit: "cover" }} />
            )}
            <span className="pkg-card__badge">{formatAgeRange(pkg.ageRange, ageRangeLabels)} · {pkg.level}</span>
          </div>

          <div className="pkg-card__body">
            <div className="pkg-card__title">{pkg.title}</div>
            <div className="pkg-card__meta">
              <div>共 {pkg.lessons.length} 个课次</div>
            </div>
            <Link href={`/slideshow/${pkg.slug}`} className="btn btn--block" style={{ marginBottom: "var(--sp-2)" }}>
              生成课件
            </Link>
            <div className="pkg-card__footer">
              {formatAgeRange(pkg.ageRange, ageRangeLabels)} ｜ {pkg.level} ｜ {pkg.lessons.length} 课次
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
