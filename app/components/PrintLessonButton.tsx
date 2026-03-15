"use client";

export default function PrintLessonButton() {
  return (
    <button className="btn btn--soft btn--sm" onClick={() => window.print()}>
      打印本课
    </button>
  );
}
