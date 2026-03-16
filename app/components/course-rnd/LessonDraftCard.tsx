"use client";

import { useState, useEffect, useRef } from "react";
import LessonRenderer from "@/components/lesson/LessonRenderer";
import type { LessonContent } from "@/types/lesson-content";
import { useToast } from "@/components/Toast";

interface LessonDraft {
  id: string;
  lessonNo: number;
  title: string;
  contentData: string | null;
  lastFeedback: string | null;
}

interface ProgressState {
  step: number;
  total: number;
  label: string;
  tokenCount: number;
}

const SECTION_LABELS = [
  "本课核心信息",
  "AI 环节价值说明",
  "课前备课提示单",
  "课堂执行清单",
  "学生卡点应对表",
  "本课附件与模板",
  "课后复盘记录区",
];

const SECTION_IDS = ["core", "ai_value", "prep", "flow", "issues", "materials", "review"];

interface Props {
  draft: LessonDraft;
  projectId: string;
  onRevise: (feedback: string, targetSection?: string) => void;
  onRegenerate: () => void;
  onContentUpdate?: (lessonNo: number, contentData: string) => void;
  loading: boolean;
  disabled: boolean;
  generating?: boolean;
  progress?: ProgressState | null;
}

export default function LessonDraftCard({ draft, projectId, onRevise, onRegenerate, onContentUpdate, loading, disabled, generating, progress }: Props) {
  const [feedback, setFeedback] = useState("");
  const [expanded, setExpanded] = useState(!!draft.contentData && !generating);
  const [targetSection, setTargetSection] = useState<{ id: string; title: string } | null>(null);
  const wasGenerating = useRef(generating);
  const { showToast } = useToast();

  // 生成开始时收起，生成完成时展开
  useEffect(() => {
    if (generating && !wasGenerating.current) {
      setExpanded(false);
    }
    if (!generating && wasGenerating.current && draft.contentData) {
      setExpanded(true);
    }
    wasGenerating.current = generating;
  }, [generating, draft.contentData]);

  const [regeneratingImage, setRegeneratingImage] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // 解析 contentData
  let hero: { title?: string; subtitle?: string; goal?: string; outcome?: string; imageUrl?: string } | null = null;
  let sections: Array<{ id: string; title: string }> = [];
  let sectionCount = 0;
  let images: { hero?: string; illustration?: string; template?: string } = {};
  try {
    if (draft.contentData) {
      const parsed = JSON.parse(draft.contentData);
      hero = parsed.hero ?? null;
      sectionCount = parsed.sections?.length ?? 0;
      sections = (parsed.sections ?? []).map((s: { id: string; title: string }) => ({ id: s.id, title: s.title }));
      if (hero?.imageUrl) images.hero = hero.imageUrl;
      // 从 sections 中提取插图和模板图
      for (const s of parsed.sections ?? []) {
        for (const b of s.blocks ?? []) {
          if (b.imageUrl && s.id === "materials") images.template = b.imageUrl;
          else if (b.imageUrl) images.illustration = b.imageUrl;
        }
      }
    }
  } catch {}

  async function handleRegenerateImage(imageType: "hero" | "illustration" | "template") {
    setRegeneratingImage(imageType);
    try {
      const res = await fetch(`/api/course-rnd/projects/${projectId}/lessons/${draft.lessonNo}/regenerate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageType }),
      });
      const json = await res.json();
      if (res.ok && json.data?.contentData) {
        onContentUpdate?.(draft.lessonNo, JSON.stringify(json.data.contentData));
        showToast("图片已更新");
      } else {
        showToast(json.error ?? "图片生成失败", "error");
      }
    } catch {
      showToast("网络错误", "error");
    }
    setRegeneratingImage(null);
  }

  function handleSubmitFeedback() {
    if (!feedback.trim()) return;
    onRevise(feedback, targetSection?.id);
    setFeedback("");
    setTargetSection(null);
  }

  // section / image 点击事件处理（从 LessonRenderer 内部冒泡）
  function handleContentClick(e: React.MouseEvent) {
    const target = e.target as HTMLElement;

    // 点击 hero 图片区域 → 关联到图片修改
    const heroImage = target.closest("#hero_image");
    if (heroImage) {
      if (targetSection?.id === "hero_image") {
        setTargetSection(null);
      } else {
        setTargetSection({ id: "hero_image", title: "课次封面图" });
      }
      return;
    }

    // 查找被点击的 section header
    const header = target.closest(".lesson-section__header");
    if (!header) return;

    const section = header.closest(".lesson-section");
    if (!section) return;

    const sectionId = section.id;
    const sectionTitle = header.textContent?.replace(/^\d+\.\s*/, "").trim() ?? "";

    if (targetSection?.id === sectionId) {
      setTargetSection(null); // 再次点击取消选中
    } else {
      setTargetSection({ id: sectionId, title: sectionTitle });
    }
  }

  return (
    <div className="card--glass" style={{ padding: "var(--sp-5)" }}>
      {/* 头部 */}
      <div style={{ marginBottom: "var(--sp-3)" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "var(--sp-2)", marginBottom: "var(--sp-1)" }}>
          <span className="pill" style={{ fontSize: 11 }}>第 {draft.lessonNo} 课</span>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{draft.title}</span>
        </div>
        {hero?.subtitle && (
          <p className="muted" style={{ fontSize: 14, lineHeight: 1.6 }}>{hero.subtitle}</p>
        )}
      </div>

      {/* 摘要信息 */}
      {hero && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-3)", marginBottom: "var(--sp-3)" }}>
          {hero.goal && (
            <div style={{ padding: "var(--sp-3)", background: "var(--bg-faint)", borderRadius: "var(--radius-md)", border: "1px solid var(--line)" }}>
              <div className="muted small" style={{ marginBottom: "var(--sp-1)" }}>目标</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{hero.goal}</div>
            </div>
          )}
          {hero.outcome && (
            <div style={{ padding: "var(--sp-3)", background: "var(--bg-faint)", borderRadius: "var(--radius-md)", border: "1px solid var(--line)" }}>
              <div className="muted small" style={{ marginBottom: "var(--sp-1)" }}>成果</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{hero.outcome}</div>
            </div>
          )}
        </div>
      )}

      <div className="muted small" style={{ marginBottom: "var(--sp-3)" }}>
        {sectionCount > 0 ? `${sectionCount} 个教学板块` : "尚未生成详细内容"}
      </div>

      {/* 生成中 — 步骤进度列表 */}
      {generating && progress && (
        <div className="ai-progress">
          {progress.step === 0 && (
            <div className="ai-progress__step ai-progress__step--current">
              <span style={{ width: 20, display: "flex", justifyContent: "center" }}>
                <span className="ai-progress__spinner" />
              </span>
              正在连接 AI 服务...
            </div>
          )}

          {progress.step > 0 && SECTION_LABELS.map((label, i) => {
            const stepNo = i + 1;
            const isDone = stepNo < progress.step;
            const isCurrent = stepNo === progress.step;
            const cls = isDone ? "ai-progress__step--done"
              : isCurrent ? "ai-progress__step--current"
              : "ai-progress__step--pending";
            return (
              <div key={label} className={`ai-progress__step ${cls}`}>
                <span style={{ width: 20, display: "flex", justifyContent: "center" }}>
                  {isDone ? "✓" : isCurrent ? <span className="ai-progress__spinner" /> : "○"}
                </span>
                {label}
              </div>
            );
          })}

          <div className="ai-progress__bar-wrap">
            <div className="ai-progress__bar" style={{ width: `${Math.round((progress.step / progress.total) * 100)}%` }} />
          </div>
          <div className="ai-progress__meta">
            <span>已接收 {progress.tokenCount} tokens</span>
            <span>{Math.round((progress.step / progress.total) * 100)}%</span>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      {!disabled && !generating && (
        <div style={{ display: "flex", gap: "var(--sp-2)", marginBottom: "var(--sp-3)" }}>
          <button className="btn" onClick={onRegenerate} disabled={loading}>
            {draft.contentData ? "重新生成本课方案" : "生成本课方案"}
          </button>
          {draft.contentData && (
            <button className="btn btn--soft" onClick={() => { setExpanded(v => !v); setTargetSection(null); }}>
              {expanded ? "收起详情" : "展开详情"}
            </button>
          )}
        </div>
      )}

      {/* 展开预览 + sticky 意见输入 */}
      {expanded && draft.contentData && (() => {
        try {
          const parsed = JSON.parse(draft.contentData) as LessonContent;
          return (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {/* 可滚动的内容区 */}
              <div
                onClick={handleContentClick}
                style={{
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--line)",
                  background: "var(--panel-solid)",
                  overflowY: "visible",
                  cursor: "default",
                }}
              >
                {/* section 选中高亮样式 */}
                {targetSection && (
                  <style>{`
                    #${targetSection.id} { outline: 2px solid var(--brand); outline-offset: -2px; border-radius: var(--radius-lg); }
                    #${targetSection.id} .lesson-section__header { background: rgba(126,149,255,0.15) !important; }
                  `}</style>
                )}
                <LessonRenderer content={parsed} preview />
              </div>

              {/* 提示：点击板块可关联 */}
              {!targetSection && !loading && !disabled && (
                <div className="muted" style={{ fontSize: 12, marginTop: "var(--sp-2)", textAlign: "center" }}>
                  点击上方板块标题可关联修改意见到具体板块
                </div>
              )}

              {/* sticky 意见输入框 */}
              {!disabled && (
                <div style={{
                  position: "sticky",
                  bottom: "var(--sp-3)",
                  background: "var(--panel-solid)",
                  borderTop: "1px solid var(--line)",
                  padding: "var(--sp-3)",
                  marginTop: "var(--sp-3)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "var(--shadow-sm)",
                }}>
                  {/* 修改中提示 */}
                  {loading && (
                    <div className="ai-progress" style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", marginBottom: "var(--sp-2)" }}>
                      <span className="ai-progress__spinner" />
                      <span className="ai-progress__step--current">AI 正在处理修改意见...</span>
                    </div>
                  )}

                  {!loading && (
                    <>
                      {/* 关联标签 */}
                      {targetSection && (
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "var(--sp-2)",
                          marginBottom: "var(--sp-2)",
                          fontSize: 13,
                        }}>
                          <span className="pill" style={{ fontSize: 11 }}>
                            📌 针对：{targetSection.title}
                          </span>
                          <button
                            className="btn--ghost"
                            onClick={() => setTargetSection(null)}
                            style={{ fontSize: 12, padding: "2px 6px", border: "none", background: "none", cursor: "pointer", color: "var(--muted)" }}
                          >
                            ✕ 取消
                          </button>
                        </div>
                      )}

                      <div style={{ display: "flex", gap: "var(--sp-2)", alignItems: "flex-end" }}>
                        <textarea
                          className="input"
                          style={{ height: 60, paddingTop: "var(--sp-2)", resize: "vertical", flex: 1 }}
                          placeholder={targetSection
                            ? `针对「${targetSection.title}」输入修改意见...`
                            : "输入修改意见，AI 将按意见调整本课方案..."}
                          value={feedback}
                          onChange={e => setFeedback(e.target.value)}
                        />
                        <button
                          className="btn btn--sm"
                          onClick={handleSubmitFeedback}
                          disabled={!feedback.trim()}
                          style={{ whiteSpace: "nowrap", height: 60 }}
                        >
                          按意见修改
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        } catch {
          return <div className="muted small">内容格式异常，无法预览</div>;
        }
      })()}

      {/* 详情未展开时的意见输入 */}
      {!expanded && !disabled && !loading && !generating && draft.contentData && (
        <div style={{ display: "flex", gap: "var(--sp-2)", alignItems: "flex-end" }}>
          <textarea
            className="input"
            style={{ height: 60, paddingTop: "var(--sp-2)", resize: "vertical", flex: 1 }}
            placeholder="输入修改意见，AI 将按意见调整本课方案..."
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
          />
          <button
            className="btn btn--sm"
            onClick={handleSubmitFeedback}
            disabled={!feedback.trim()}
            style={{ whiteSpace: "nowrap", height: 60 }}
          >
            按意见修改
          </button>
        </div>
      )}

      {/* 上次修改意见 */}
      {draft.lastFeedback && (
        <div className="muted small" style={{ marginTop: "var(--sp-2)" }}>
          上次修改意见：{draft.lastFeedback}
        </div>
      )}

      {/* 图片放大灯箱 */}
      {lightboxUrl && (
        <div
          className="modal-overlay"
          onClick={() => setLightboxUrl(null)}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}
        >
          <img
            src={lightboxUrl}
            alt="放大查看"
            style={{ maxWidth: "90vw", maxHeight: "85vh", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-lg)" }}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
