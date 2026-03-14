"use client";

import { useRouter } from "next/navigation";

interface Props {
  slug: string;
  lessonId: string;
}

export default function EnterLessonButton({ slug, lessonId }: Props) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(`/lesson/${slug}/${lessonId}`)}
      style={{
        border: "none", borderRadius: 999,
        padding: "11px 20px",
        fontSize: 14, fontWeight: 700,
        color: "#fff",
        background: "linear-gradient(90deg, #6f86ff, #61d1ff)",
        boxShadow: "0 10px 22px rgba(111,134,255,.18)",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      进入本课
    </button>
  );
}
