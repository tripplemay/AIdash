"use client";

interface TocSection {
  id: string;
  title: string;
}

export default function LessonToc({ sections, activeId }: { sections: TocSection[]; activeId?: string }) {
  const handleClick = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav className="lesson-toc">
      <div className="lesson-toc__title">目录导航</div>
      {sections.map((s, i) => (
        <button
          key={s.id}
          className={`lesson-toc__item${activeId === s.id ? " lesson-toc__item--active" : ""}`}
          onClick={() => handleClick(s.id)}
        >
          {i + 1}. {s.title}
        </button>
      ))}
    </nav>
  );
}
