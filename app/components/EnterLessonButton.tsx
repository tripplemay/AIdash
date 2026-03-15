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
      className="btn"
      style={{ whiteSpace: "nowrap" }}
      onClick={() => router.push(`/lesson/${slug}/${lessonId}`)}
    >
      进入本课
    </button>
  );
}
