"use client";

interface TocSection {
  id: string;
  title: string;
}

export default function LessonToc({ sections }: { sections: TocSection[] }) {
  const handleClick = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: "var(--text)" }}>
        目录导航
      </div>
      {sections.map((s, i) => (
        <button
          key={s.id}
          onClick={() => handleClick(s.id)}
          style={{
            display: "block",
            width: "100%",
            textAlign: "left",
            background: "none",
            border: "none",
            padding: "9px 10px",
            borderRadius: 12,
            fontSize: 14,
            color: "var(--text)",
            cursor: "pointer",
            marginBottom: 4,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "#f3f4f6")}
          onMouseLeave={e => (e.currentTarget.style.background = "none")}
        >
          {i + 1}. {s.title}
        </button>
      ))}
    </nav>
  );
}
