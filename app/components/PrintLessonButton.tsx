"use client";

export default function PrintLessonButton() {
  return (
    <button
      onClick={() => {
        const iframe = document.getElementById("lesson-iframe") as HTMLIFrameElement;
        iframe?.contentWindow?.print();
      }}
      style={{
        border: "1px solid var(--line)",
        borderRadius: 10,
        padding: "6px 14px",
        fontSize: 13,
        fontWeight: 600,
        color: "#6074a9",
        background: "rgba(255,255,255,0.8)",
        cursor: "pointer",
      }}
    >
      打印本课
    </button>
  );
}
