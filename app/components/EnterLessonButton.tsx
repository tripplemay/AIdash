"use client";

interface Props {
  entryPath: string;
}

export default function EnterLessonButton({ entryPath }: Props) {
  return (
    <button
      onClick={() => window.open(entryPath, "_blank")}
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
