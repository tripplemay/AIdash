"use client";

interface LessonFramework {
  lessonNo: number;
  title: string;
  overview: string;
}

interface Props {
  summary: string;
  lessons: LessonFramework[];
  onConfirm: () => void;
  onPause: () => void;
  onArchive: () => void;
  onRegenerate: () => void;
  loading: boolean;
}

export default function FrameworkResultPanel({
  summary, lessons, onConfirm, onPause, onArchive, onRegenerate, loading,
}: Props) {
  return (
    <div className="card--glass" style={{ padding: "var(--sp-5)", marginBottom: "var(--sp-5)" }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: "var(--sp-4)" }}>课程框架</h2>

      {/* 一句话摘要 */}
      <div style={{
        padding: "var(--sp-4)",
        background: "rgba(126,149,255,0.06)",
        borderLeft: "3px solid var(--brand)",
        borderRadius: "var(--radius-md)",
        marginBottom: "var(--sp-5)",
        fontSize: 14,
        lineHeight: 1.7,
      }}>
        {summary}
      </div>

      {/* 课次列表 — 带序号色块 */}
      <div style={{ display: "grid", gap: "var(--sp-3)", marginBottom: "var(--sp-5)" }}>
        {lessons.map((lesson) => (
          <div key={lesson.lessonNo} style={{
            padding: "var(--sp-4)",
            background: "var(--bg-faint)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-md)",
            display: "flex",
            gap: "var(--sp-3)",
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: "var(--radius-sm)",
              background: "var(--brand)", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700, flexShrink: 0,
            }}>
              {lesson.lessonNo}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{lesson.title}</div>
              <p className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>{lesson.overview}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 操作按钮 */}
      {loading && (
        <div className="ai-progress" style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", marginBottom: "var(--sp-3)" }}>
          <span className="ai-progress__spinner" />
          <span className="ai-progress__step--current">AI 正在处理...</span>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
        <button className="btn" onClick={onConfirm} disabled={loading}>
          确认框架，进入详细方案
        </button>
        <button className="btn btn--soft" onClick={onRegenerate} disabled={loading}>
          重新生成
        </button>
        <div style={{ flex: 1 }} />
        <button className="btn btn--soft btn--sm" onClick={onPause} disabled={loading}>
          暂停
        </button>
        <button className="btn btn--soft btn--sm btn--danger" onClick={onArchive} disabled={loading}>
          废弃
        </button>
      </div>
    </div>
  );
}
