"use client";

import { useState, useEffect, useCallback } from "react";

export default function LessonProgressBar() {
  const [progress, setProgress] = useState(0);

  const handleScroll = useCallback(() => {
    const el = document.querySelector(".lesson-scroll");
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const max = scrollHeight - clientHeight;
    setProgress(max > 0 ? (scrollTop / max) * 100 : 0);
  }, []);

  useEffect(() => {
    const el = document.querySelector(".lesson-scroll");
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <div className="lesson-progress" style={{ width: `${progress}%` }} />
  );
}
