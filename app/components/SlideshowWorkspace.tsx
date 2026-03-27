"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, RefreshCw, FileSliders, Loader2, PackageCheck } from "lucide-react";

interface Theme {
  name: string;
  description: string;
}

interface LessonStatus {
  lessonId: string;
  lessonNo: number;
  title: string;
  hasContent: boolean;
  hasDraft: boolean;
  themeKey: string | null;
  updatedAt: string | null;
}

interface Props {
  packageSlug: string;
  packageTitle: string;
  themes: Theme[];
}

export default function SlideshowWorkspace({ packageSlug, packageTitle, themes }: Props) {
  const [selectedTheme, setSelectedTheme] = useState(themes[0]?.name ?? "");
  const [lessons, setLessons] = useState<LessonStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/slideshow/status?slug=${packageSlug}`);
      const json = await res.json();
      setLessons(json.data?.lessons ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [packageSlug]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const generateOne = async (lessonId: string) => {
    if (!selectedTheme) {
      alert("请先选择模板主题");
      return false;
    }
    setGeneratingIds((prev) => new Set(prev).add(lessonId));
    try {
      const res = await fetch("/api/slideshow/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, themeKey: selectedTheme }),
      });
      if (!res.ok) {
        const json = await res.json();
        alert(json.error ?? "生成失败");
        return false;
      }
      await fetchStatus();
      return true;
    } catch {
      alert("网络错误");
      return false;
    } finally {
      setGeneratingIds((prev) => {
        const next = new Set(prev);
        next.delete(lessonId);
        return next;
      });
    }
  };

  const generateAll = async () => {
    const eligible = lessons.filter((l) => l.hasContent);
    if (eligible.length === 0) return;

    setBatchGenerating(true);
    setBatchProgress({ current: 0, total: eligible.length });

    for (let i = 0; i < eligible.length; i++) {
      setBatchProgress({ current: i + 1, total: eligible.length });
      const success = await generateOne(eligible[i].lessonId);
      if (!success) break;
    }

    setBatchGenerating(false);
  };

  const downloadOne = (lessonId: string) => {
    window.open(`/api/slideshow/download?lessonId=${lessonId}`, "_blank");
  };

  const downloadAll = () => {
    window.open(`/api/slideshow/download-all?slug=${packageSlug}`, "_blank");
  };

  const allHaveDrafts = lessons.length > 0 && lessons.every((l) => !l.hasContent || l.hasDraft);

  if (loading) {
    return (
      <div className="text-center muted" style={{ padding: "var(--sp-12) 0" }}>
        <Loader2 size={24} className="spin" /> 加载中...
      </div>
    );
  }

  return (
    <div>
      {/* Theme selector */}
      <div style={{ marginBottom: "var(--sp-5)" }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: "var(--sp-2)", color: "var(--text-secondary)" }}>
          选择模板主题
        </div>
        <div style={{ display: "flex", gap: "var(--sp-3)", flexWrap: "wrap" }}>
          {themes.map((t) => (
            <button
              key={t.name}
              className={`btn ${selectedTheme === t.name ? "" : "btn--soft"}`}
              onClick={() => setSelectedTheme(t.name)}
              style={{ minWidth: 100 }}
            >
              {t.name}
            </button>
          ))}
        </div>
        {themes.find((t) => t.name === selectedTheme)?.description && (
          <div className="muted small" style={{ marginTop: "var(--sp-1)" }}>
            {themes.find((t) => t.name === selectedTheme)?.description}
          </div>
        )}
      </div>

      {/* No themes warning */}
      {themes.length === 0 && (
        <div className="toast toast--error" style={{ marginBottom: "var(--sp-4)" }}>
          暂无可用的 PPT 主题模板。请管理员运行种子脚本或在后台添加 slideshow_theme 预设。
        </div>
      )}

      {/* Batch actions */}
      <div style={{ display: "flex", gap: "var(--sp-3)", marginBottom: "var(--sp-4)" }}>
        <button
          className="btn"
          onClick={generateAll}
          disabled={batchGenerating || generatingIds.size > 0 || !selectedTheme}
        >
          {batchGenerating ? (
            <>
              <Loader2 size={16} className="spin" />{" "}
              正在生成第 {batchProgress.current}/{batchProgress.total} 课...
            </>
          ) : (
            <>
              <FileSliders size={16} /> 一键生成全部
            </>
          )}
        </button>
        {allHaveDrafts && (
          <button className="btn btn--soft" onClick={downloadAll}>
            <PackageCheck size={16} /> 下载全部
          </button>
        )}
      </div>

      {/* Lesson list */}
      <div className="slideshow-lesson-list">
        {lessons.map((lesson) => {
          const isGenerating = generatingIds.has(lesson.lessonId);
          return (
            <div key={lesson.lessonId} className="slideshow-lesson-item">
              <div className="slideshow-lesson-item__info">
                <span className="slideshow-lesson-item__no">第{lesson.lessonNo}课</span>
                <span className="slideshow-lesson-item__title">{lesson.title}</span>
                {!lesson.hasContent && (
                  <span className="pill pill--muted" style={{ fontSize: 11 }}>无内容</span>
                )}
                {lesson.hasDraft && (
                  <span className="pill pill--ok" style={{ fontSize: 11 }}>已生成</span>
                )}
              </div>
              <div className="slideshow-lesson-item__actions">
                {!lesson.hasContent ? (
                  <span className="muted small">课次无内容数据</span>
                ) : lesson.hasDraft ? (
                  <>
                    <button
                      className="btn btn--sm btn--soft"
                      onClick={() => downloadOne(lesson.lessonId)}
                    >
                      <Download size={14} /> 下载
                    </button>
                    <button
                      className="btn btn--sm btn--soft"
                      onClick={() => generateOne(lesson.lessonId)}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <Loader2 size={14} className="spin" />
                      ) : (
                        <RefreshCw size={14} />
                      )}{" "}
                      重新生成
                    </button>
                  </>
                ) : (
                  <button
                    className="btn btn--sm"
                    onClick={() => generateOne(lesson.lessonId)}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 size={14} className="spin" /> 生成中...
                      </>
                    ) : (
                      <>
                        <FileSliders size={14} /> 生成课件
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
