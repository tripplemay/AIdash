"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Download, RefreshCw, FileSliders, Loader2, PackageCheck, AlertCircle } from "lucide-react";

interface Theme {
  name: string;
  description: string;
}

interface LessonProgress {
  step: number;
  total: number;
  message: string;
}

interface LessonStatus {
  lessonId: string;
  lessonNo: number;
  title: string;
  hasContent: boolean;
  hasDraft: boolean;
  status: "idle" | "generating" | "completed" | "failed";
  progress: LessonProgress | null;
  errorMessage: string | null;
  themeKey: string | null;
  updatedAt: string | null;
}

interface Props {
  packageSlug: string;
  packageTitle: string;
  themes: Theme[];
}

const POLL_INTERVAL = 2000;

export default function SlideshowWorkspace({ packageSlug, packageTitle, themes }: Props) {
  const [selectedTheme, setSelectedTheme] = useState(themes[0]?.name ?? "");
  const [lessons, setLessons] = useState<LessonStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Initial load
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Poll while any lesson is generating
  useEffect(() => {
    const hasGenerating = lessons.some((l) => l.status === "generating");
    if (hasGenerating) {
      if (!pollTimerRef.current) {
        pollTimerRef.current = setInterval(fetchStatus, POLL_INTERVAL);
      }
    } else {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    }
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [lessons, fetchStatus]);

  const triggerGenerate = async (lessonId: string) => {
    if (!selectedTheme) {
      alert("请先选择模板主题");
      return;
    }
    try {
      const res = await fetch("/api/slideshow/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, themeKey: selectedTheme }),
      });
      if (!res.ok) {
        const json = await res.json();
        alert(json.error ?? "生成失败");
        return;
      }
      // Immediately refresh status to start polling
      await fetchStatus();
    } catch {
      alert("网络错误");
    }
  };

  const generateAll = async () => {
    if (!selectedTheme) {
      alert("请先选择模板主题");
      return;
    }
    const eligible = lessons.filter((l) => l.hasContent && l.status !== "generating");
    if (eligible.length === 0) return;

    setBatchGenerating(true);
    setBatchProgress({ current: 0, total: eligible.length });

    for (let i = 0; i < eligible.length; i++) {
      setBatchProgress({ current: i + 1, total: eligible.length });
      try {
        await fetch("/api/slideshow/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lessonId: eligible[i].lessonId, themeKey: selectedTheme }),
        });
      } catch {
        break;
      }
    }

    setBatchGenerating(false);
    await fetchStatus();
  };

  const downloadOne = (lessonId: string) => {
    window.open(`/api/slideshow/download?lessonId=${lessonId}`, "_blank");
  };

  const downloadAll = () => {
    window.open(`/api/slideshow/download-all?slug=${packageSlug}`, "_blank");
  };

  const hasAnyCompleted = lessons.some((l) => l.status === "completed");
  const hasAnyGenerating = lessons.some((l) => l.status === "generating");

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
          disabled={batchGenerating || hasAnyGenerating || !selectedTheme}
        >
          {batchGenerating ? (
            <>
              <Loader2 size={16} className="spin" />{" "}
              正在提交第 {batchProgress.current}/{batchProgress.total} 课...
            </>
          ) : (
            <>
              <FileSliders size={16} /> 一键生成全部
            </>
          )}
        </button>
        {hasAnyCompleted && (
          <button className="btn btn--soft" onClick={downloadAll}>
            <PackageCheck size={16} /> 下载全部
          </button>
        )}
      </div>

      {/* Lesson list */}
      <div className="slideshow-lesson-list">
        {lessons.map((lesson) => (
          <div key={lesson.lessonId} className="slideshow-lesson-item">
            <div className="slideshow-lesson-item__info">
              <span className="slideshow-lesson-item__no">第{lesson.lessonNo}课</span>
              <span className="slideshow-lesson-item__title">{lesson.title}</span>
              {!lesson.hasContent && (
                <span className="pill pill--muted" style={{ fontSize: 11 }}>无内容</span>
              )}
              {lesson.status === "completed" && (
                <span className="pill pill--ok" style={{ fontSize: 11 }}>已生成</span>
              )}
              {lesson.status === "generating" && (
                <span className="pill pill--info" style={{ fontSize: 11 }}>
                  <Loader2 size={10} className="spin" style={{ marginRight: 4 }} />
                  {lesson.progress?.message ?? "生成中..."}
                </span>
              )}
              {lesson.status === "failed" && (
                <span className="pill pill--danger" style={{ fontSize: 11 }}>
                  <AlertCircle size={10} style={{ marginRight: 4 }} />
                  失败
                </span>
              )}
            </div>
            <div className="slideshow-lesson-item__actions">
              {!lesson.hasContent ? (
                <span className="muted small">课次无内容数据</span>
              ) : lesson.status === "generating" ? (
                <span className="muted small">{lesson.progress?.message ?? "生成中..."}</span>
              ) : lesson.status === "completed" ? (
                <>
                  <button
                    className="btn btn--sm btn--soft"
                    onClick={() => downloadOne(lesson.lessonId)}
                  >
                    <Download size={14} /> 下载
                  </button>
                  <button
                    className="btn btn--sm btn--soft"
                    onClick={() => triggerGenerate(lesson.lessonId)}
                  >
                    <RefreshCw size={14} /> 重新生成
                  </button>
                </>
              ) : lesson.status === "failed" ? (
                <>
                  <span className="muted small" title={lesson.errorMessage ?? ""}>
                    {lesson.errorMessage ?? "生成失败"}
                  </span>
                  <button
                    className="btn btn--sm"
                    onClick={() => triggerGenerate(lesson.lessonId)}
                  >
                    <RefreshCw size={14} /> 重试
                  </button>
                </>
              ) : (
                <button
                  className="btn btn--sm"
                  onClick={() => triggerGenerate(lesson.lessonId)}
                >
                  <FileSliders size={14} /> 生成课件
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
