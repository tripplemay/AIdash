"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertModal } from "./CourseRndModal";

interface LessonDraft {
  lessonNo: number;
  title: string;
  contentData: string | null;
}

interface PublishRecord {
  id: string;
  packageSlug: string;
  packageTitle: string;
  createdAt: string;
}

interface Props {
  projectId: string;
  projectTitle: string;
  ageRange: string | null;
  level: string | null;
  lessonDrafts: LessonDraft[];
  directionSummary?: string | null;
  publishRecord?: PublishRecord | null;
}

function generateSlug(projectId: string): string {
  return `course-${projectId.slice(0, 8)}`;
}

export default function PublishPanel({ projectId, projectTitle, ageRange, level, lessonDrafts, directionSummary, publishRecord }: Props) {
  const router = useRouter();
  const slug = generateSlug(projectId);
  const [title, setTitle] = useState(projectTitle);
  const [summary, setSummary] = useState(directionSummary ?? "");
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [successInfo, setSuccessInfo] = useState<{ count: number; slug: string } | null>(null);

  // 检查所有课次是否都有 contentData
  const readyCount = lessonDrafts.filter(d => d.contentData).length;
  const totalCount = lessonDrafts.length;
  const allReady = readyCount === totalCount && totalCount > 0;

  // 已发布：显示已发布状态，不显示发布表单
  if (publishRecord) {
    const publishedAt = new Date(publishRecord.createdAt).toLocaleString("zh-CN");
    return (
      <div className="card--glass" style={{ padding: "var(--sp-5)", marginTop: "var(--sp-5)" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: "var(--sp-4)" }}>发布到课程库</h2>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--sp-3)",
          padding: "var(--sp-3) var(--sp-4)",
          borderRadius: "var(--radius-md)",
          background: "var(--green-light)",
          border: "1px solid var(--green-border)",
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--green)" }}>已发布</span>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>发布时间：{publishedAt}</span>
        </div>
      </div>
    );
  }

  async function handlePublish() {
    if (!allReady) return;
    setPublishing(true);
    setError("");

    try {
      const lessons = lessonDrafts
        .filter(d => d.contentData)
        .map(d => ({
          lessonNo: d.lessonNo,
          title: d.title,
          durationMinutes: 45,
          deliveryMode: "offline_small_group",
          groupSize: "4-6",
          contentData: JSON.parse(d.contentData!),
        }));

      const res = await fetch("/api/admin/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          package: {
            slug,
            title,
            ageRange: ageRange ?? "8-12",
            level: level ?? "L1",
            summary: summary || null,
          },
          lessons,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "发布失败");
        return;
      }

      setSuccessInfo({ count: json.data.lessonsImported, slug });
    } catch {
      setError("网络错误，请重试");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="card--glass" style={{ padding: "var(--sp-5)", marginTop: "var(--sp-5)" }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: "var(--sp-4)" }}>一键发布到课程库</h2>

      {!allReady && (
        <div className="field-error" style={{ marginBottom: "var(--sp-4)" }}>
          尚有 {totalCount - readyCount} 节课未生成方案，无法发布。请先为所有课次生成方案。
        </div>
      )}

      <div style={{ marginBottom: "var(--sp-4)" }}>
        <label className="field-label">课程包标题</label>
        <input className="input" value={title} onChange={e => setTitle(e.target.value)} />
      </div>

      <div style={{ marginBottom: "var(--sp-4)" }}>
        <label className="field-label">课程包简介（选填）</label>
        <textarea
          className="input"
          style={{ height: 60, paddingTop: "var(--sp-2)", resize: "vertical" }}
          value={summary}
          onChange={e => setSummary(e.target.value)}
          placeholder="简要描述这个课程包"
        />
      </div>

      <div className="muted small" style={{ marginBottom: "var(--sp-4)" }}>
        将发布 {readyCount} 节课到课程包「{title}」。
      </div>

      {error && <div className="field-error" style={{ marginBottom: "var(--sp-4)" }}>{error}</div>}

      <button
        className="btn btn--lg"
        onClick={handlePublish}
        disabled={publishing || !allReady || !title}
      >
        {publishing ? "发布中..." : "确认发布"}
      </button>

      {successInfo && (
        <AlertModal
          title="发布成功"
          message={`已成功发布 ${successInfo.count} 节课到课程库。`}
          onClose={() => router.push(`/detail/${successInfo.slug}`)}
        />
      )}
    </div>
  );
}
