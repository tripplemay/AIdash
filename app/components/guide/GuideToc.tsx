"use client";

interface Section {
  id: string;
  title: string;
}

interface GuideTocProps {
  sections: Section[];
  activeId: string;
}

export default function GuideToc({ sections, activeId }: GuideTocProps) {
  function handleClick(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <nav className="guide-toc">
      <div className="guide-toc__title">目录</div>
      {sections.map((s) => (
        <button
          key={s.id}
          className={`guide-toc__item${activeId === s.id ? " guide-toc__item--active" : ""}`}
          onClick={() => handleClick(s.id)}
        >
          {s.title}
        </button>
      ))}
    </nav>
  );
}
