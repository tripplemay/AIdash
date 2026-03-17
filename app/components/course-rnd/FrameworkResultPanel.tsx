"use client";

import { useState } from "react";

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
  onReviseFramework: (feedback: string) => void;
  loading: boolean;
  revisingFramework?: boolean;
  coverUrl?: string | null;
  onRegenerateCover?: (customPrompt?: string) => void;
  generatingCover?: boolean;
}

const DEFAULT_COVER_PROMPT =
  "Create a colorful, engaging educational course cover illustration for children. " +
  "Style: cute, modern, vibrant colors, flat illustration, child-friendly, no text on the image.";

export default function FrameworkResultPanel({
  summary,
  lessons,
  onConfirm,
  onPause,
  onArchive,
  onRegenerate,
  onReviseFramework,
  loading,
  revisingFramework,
  coverUrl,
  onRegenerateCover,
  generatingCover,
}: Props) {
  const [feedback, setFeedback] = useState("");
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [coverPrompt, setCoverPrompt] = useState(DEFAULT_COVER_PROMPT);

  function handleReviseSubmit() {
    const trimmed = feedback.trim();
    if (!trimmed) return;
    onReviseFramework(trimmed);
    setFeedback("");
  }

  function handleCoverRegenerate() {
    onRegenerateCover?.(coverPrompt.trim() || undefined);
    setShowCoverModal(false);
  }

  return (
    <div className="card--glass" style={{ padding: "var(--sp-5)", marginBottom: "var(--sp-5)" }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: "var(--sp-4)" }}>课程框架</h2>

      {/* 封面图预览 */}
      <div style={{
        marginBottom: "var(--sp-5)",
        display: "flex",
        alignItems: "flex-start",
        gap: "var(--sp-4)",
      }}>
        <div style={{
          width: 160,
          height: 100,
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--line)",
          overflow: "hidden",
          flexShrink: 0,
          background: "var(--bg-faint)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          {generatingCover ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <span className="ai-progress__spinner" />
              <span className="muted" style={{ fontSize: 11 }}>生成封面中...</span>
            </div>
          ) : coverUrl ? (
            <img
              src={coverUrl}
              alt="课程封面"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span className="muted" style={{ fontSize: 12 }}>暂无封面</span>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <button
            className="btn btn--soft btn--sm"
            disabled={loading || generatingCover}
            onClick={() => setShowCoverModal(true)}
            style={{ marginBottom: "var(--sp-2)" }}
          >
            重新生成封面
          </button>
          <p className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
            封面会在框架生成后自动生成，也可手动编辑提示词重新生成。
          </p>
        </div>
      </div>

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

      {/* 框架修改意见输入 */}
      {!loading && !revisingFramework && (
        <div style={{ marginBottom: "var(--sp-4)" }}>
          <div style={{ display: "flex", gap: "var(--sp-2)", alignItems: "flex-end" }}>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="输入修改意见，如：第3课改为..."
              rows={2}
              style={{
                flex: 1,
                padding: "var(--sp-3)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-md)",
                fontSize: 13,
                lineHeight: 1.6,
                resize: "vertical",
                background: "var(--bg-main)",
                color: "var(--text)",
              }}
            />
            <button
              className="btn btn--soft"
              onClick={handleReviseSubmit}
              disabled={!feedback.trim()}
              style={{ whiteSpace: "nowrap", alignSelf: "flex-end" }}
            >
              按意见修改框架
            </button>
          </div>
        </div>
      )}
      {revisingFramework && (
        <div
          className="ai-progress"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--sp-2)",
            marginBottom: "var(--sp-3)",
          }}
        >
          <span className="ai-progress__spinner" />
          <span className="ai-progress__step--current">AI 正在修改框架...</span>
        </div>
      )}

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

      {/* 封面重新生成弹窗 */}
      {showCoverModal && (
        <div className="modal-overlay" onClick={() => setShowCoverModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal__header">
              <h3 className="modal__title">重新生成封面</h3>
            </div>
            <div className="modal__body">
              <p className="muted" style={{ fontSize: 13, marginBottom: "var(--sp-3)" }}>
                编辑封面生成提示词，然后点击生成。
              </p>
              <textarea
                value={coverPrompt}
                onChange={(e) => setCoverPrompt(e.target.value)}
                rows={5}
                style={{
                  width: "100%",
                  padding: "var(--sp-3)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-md)",
                  fontSize: 13,
                  lineHeight: 1.6,
                  resize: "vertical",
                  background: "var(--bg-main)",
                  color: "var(--text)",
                }}
              />
            </div>
            <div className="modal__footer">
              <button className="btn btn--soft" onClick={() => setShowCoverModal(false)}>
                取消
              </button>
              <button className="btn" onClick={handleCoverRegenerate}>
                生成封面
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
