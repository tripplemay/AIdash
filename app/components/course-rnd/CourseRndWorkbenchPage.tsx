"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import LessonDraftCard from "./LessonDraftCard";
import AiCostPanel from "./AiCostPanel";
import PublishPanel from "./PublishPanel";
import { ConfirmModal } from "./CourseRndModal";
import { SetTopBar } from "@/components/TopBarContext";
import { useToast } from "@/components/Toast";

interface LessonDraft {
  id: string;
  lessonNo: number;
  title: string;
  contentData: string | null;
  lastFeedback: string | null;
}

interface PlanVersion {
  id: string;
  versionNo: number;
}

interface AiCost {
  id: string;
  actionType: string;
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  createdAt: Date;
}

interface Project {
  id: string;
  title: string;
  status: string;
  currentPlanVersionId: string | null;
}

interface Props {
  project: Project;
  currentPlan: PlanVersion | null;
  lessonDrafts: LessonDraft[];
  aiCosts: AiCost[];
}

export default function CourseRndWorkbenchPage({ project, currentPlan, lessonDrafts, aiCosts }: Props) {
  const router = useRouter();
  const [drafts, setDrafts] = useState(lessonDrafts);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState(project.status);
  const [planVersion, setPlanVersion] = useState(currentPlan);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const { showToast } = useToast();

  // 每课独立的进度状态
  type ProgressState = { step: number; total: number; label: string; tokenCount: number };
  const [generatingLessons, setGeneratingLessons] = useState<Map<number, ProgressState>>(new Map());
  const [revisingLessons, setRevisingLessons] = useState<Set<number>>(new Set());
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [generatingCover, setGeneratingCover] = useState(false);

  // 同步 props → state
  useEffect(() => { setDrafts(lessonDrafts); }, [lessonDrafts]);
  useEffect(() => { setStatus(project.status); }, [project.status]);
  useEffect(() => { setPlanVersion(currentPlan); }, [currentPlan]);

  const isFinalized = status === "finalized";

  // 创建方案骨架（瞬间完成，不调用 AI）
  async function handleGeneratePlan() {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch(`/api/course-rnd/projects/${project.id}/generate-plan`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "创建失败"); return; }
      router.refresh();
    } catch {
      setError("网络错误，请重试");
    } finally {
      setGenerating(false);
    }
  }

  // 逐课生成 contentData（SSE 流式，支持多课并行）
  async function handleRegenerateLesson(lessonNo: number) {
    setGeneratingLessons(prev => new Map(prev).set(lessonNo, { step: 0, total: 7, label: "开始生成...", tokenCount: 0 }));
    setError("");

    try {
      const res = await fetch(`/api/course-rnd/projects/${project.id}/lessons/${lessonNo}/regenerate`, { method: "POST" });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? "生成失败");
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) { setError("无法读取响应"); return; }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const block of lines) {
          const eventMatch = block.match(/event: (\w+)\ndata: ([\s\S]*)/);
          if (!eventMatch) continue;

          const [, event, data] = eventMatch;
          try {
            const parsed = JSON.parse(data);

            if (event === "progress") {
              setGeneratingLessons(prev => new Map(prev).set(lessonNo, parsed));
            } else if (event === "done") {
              setDrafts(prev => prev.map(d =>
                d.lessonNo === lessonNo
                  ? { ...d, contentData: JSON.stringify(parsed.contentData) }
                  : d
              ));
            } else if (event === "error") {
              setError(parsed.message);
            }
          } catch {}
        }
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setGeneratingLessons(prev => { const next = new Map(prev); next.delete(lessonNo); return next; });
    }
  }

  // 按意见修改某课（支持多课并行 + section 关联）
  async function handleReviselesson(lessonNo: number, feedback: string, targetSection?: string) {
    if (!planVersion) return;
    setRevisingLessons(prev => new Set(prev).add(lessonNo));
    setError("");
    try {
      const res = await fetch(`/api/course-rnd/projects/${project.id}/lessons/${lessonNo}/revise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback, planVersionId: planVersion.id, targetSection }),
      });
      const json = await res.json();
      if (!res.ok) { showToast(json.error ?? "修改失败", "error"); return; }

      setDrafts(prev => prev.map(d =>
        d.lessonNo === lessonNo
          ? { ...d, contentData: JSON.stringify(json.data.contentData), lastFeedback: feedback }
          : d
      ));
      showToast("修改意见已应用");
    } catch {
      showToast("网络错误", "error");
    } finally {
      setRevisingLessons(prev => { const next = new Set(prev); next.delete(lessonNo); return next; });
    }
  }

  // 保存版本
  async function handleSaveVersion() {
    setGlobalLoading(true);
    try {
      const res = await fetch(`/api/course-rnd/projects/${project.id}/save-version`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "保存失败"); return; }
      setPlanVersion({ id: json.data.planVersionId, versionNo: json.data.versionNo });
      showToast(`已保存为版本 v${json.data.versionNo}`);
    } catch {
      setError("网络错误");
    } finally {
      setGlobalLoading(false);
    }
  }

  // 废弃项目
  async function handleArchive() {
    setShowArchiveConfirm(false);
    setGlobalLoading(true);
    try {
      await fetch(`/api/course-rnd/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });
      router.push("/course-rnd");
    } catch {
      setError("操作失败");
    } finally {
      setGlobalLoading(false);
    }
  }

  // 确认定稿
  async function handleFinalize() {
    setShowFinalizeConfirm(false);
    setGlobalLoading(true);
    try {
      const res = await fetch(`/api/course-rnd/projects/${project.id}/finalize`, { method: "POST" });
      if (!res.ok) { setError("定稿失败"); return; }
      setStatus("finalized");
    } catch {
      setError("网络错误");
    } finally {
      setGlobalLoading(false);
    }
  }

  async function handleGenerateCover() {
    setGeneratingCover(true);
    try {
      const res = await fetch(`/api/course-rnd/projects/${project.id}/generate-cover`, { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        setCoverUrl(json.data.coverUrl);
      } else {
        setError(json.error ?? "封面生成失败");
      }
    } catch {
      setError("网络错误");
    } finally {
      setGeneratingCover(false);
    }
  }

  return (
    <div>
      <SetTopBar
        breadcrumb="研发进度"
        title={project.title}
        actions={!isFinalized ? (
          <>
            <button className="btn btn--soft btn--sm btn--danger" onClick={() => setShowArchiveConfirm(true)} disabled={globalLoading}>废弃</button>
            <button className="btn btn--soft btn--sm" onClick={handleSaveVersion} disabled={globalLoading}>保存版本</button>
            <button className="btn btn--sm" onClick={() => setShowFinalizeConfirm(true)} disabled={globalLoading}>确认定稿</button>
          </>
        ) : undefined}
      />

      {error && <div className="field-error" style={{ marginBottom: "var(--sp-4)" }}>{error}</div>}

      {/* AI 费用面板 */}
      <AiCostPanel costs={aiCosts} lessonCount={drafts.filter(d => d.contentData).length || 1} />

      {/* 无草稿时显示生成按钮 */}
      {drafts.length === 0 && (
        <div className="card--glass" style={{ padding: "var(--sp-10)", textAlign: "center" }}>
          <p className="muted" style={{ marginBottom: "var(--sp-4)" }}>框架已确认，点击生成逐节详细方案</p>
          <button className="btn btn--lg" onClick={handleGeneratePlan} disabled={generating}>
            {generating ? "AI 生成中（可能需要 30-60 秒）..." : "生成详细方案"}
          </button>
        </div>
      )}

      {/* 课程包封面 */}
      {drafts.length > 0 && !isFinalized && (
        <div className="card--glass" style={{ padding: "var(--sp-4)", marginBottom: "var(--sp-5)", display: "flex", alignItems: "center", gap: "var(--sp-4)" }}>
          <div style={{
            width: 120, height: 80, borderRadius: "var(--radius-md)", overflow: "hidden",
            border: "1px solid var(--line)", background: "var(--bg-faint)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            {coverUrl ? (
              <img src={coverUrl} alt="课程包封面" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span className="muted" style={{ fontSize: 11 }}>无封面</span>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: "var(--sp-1)" }}>课程包封面</div>
            <div className="muted" style={{ fontSize: 12 }}>
              {coverUrl ? "封面已生成，可重新生成" : "AI 根据课程信息自动生成封面图"}
            </div>
          </div>
          <button
            className="btn btn--sm"
            onClick={handleGenerateCover}
            disabled={generatingCover || globalLoading}
          >
            {generatingCover ? "生成中..." : coverUrl ? "重新生成" : "生成封面"}
          </button>
        </div>
      )}

      {/* 课次草稿列表 */}
      {drafts.length > 0 && (
        <div style={{ display: "grid", gap: "var(--sp-5)" }}>
          {drafts.map(draft => (
            <LessonDraftCard
              key={draft.id}
              draft={draft}
              projectId={project.id}
              onRevise={(feedback, targetSection) => handleReviselesson(draft.lessonNo, feedback, targetSection)}
              onRegenerate={() => handleRegenerateLesson(draft.lessonNo)}
              onContentUpdate={(lessonNo, contentData) => {
                setDrafts(prev => prev.map(d =>
                  d.lessonNo === lessonNo ? { ...d, contentData } : d
                ));
              }}
              loading={revisingLessons.has(draft.lessonNo)}
              disabled={isFinalized}
              generating={generatingLessons.has(draft.lessonNo)}
              progress={generatingLessons.get(draft.lessonNo) ?? null}
            />
          ))}
        </div>
      )}

      {/* 发布面板（定稿后显示） */}
      {isFinalized && drafts.length > 0 && (
        <PublishPanel
          projectId={project.id}
          projectTitle={project.title}
          ageRange={(project as { ageRange?: string }).ageRange ?? null}
          level={(project as { level?: string }).level ?? null}
          lessonDrafts={drafts.map(d => ({ lessonNo: d.lessonNo, title: d.title, contentData: d.contentData }))}
        />
      )}

      {/* 弹窗 */}
      {showArchiveConfirm && (
        <ConfirmModal
          title="确认废弃"
          message="废弃后可在研发进度管理中查看但无法继续编辑。"
          confirmLabel="确认废弃"
          danger
          onConfirm={handleArchive}
          onCancel={() => setShowArchiveConfirm(false)}
        />
      )}

      {showFinalizeConfirm && (
        <ConfirmModal
          title="确认定稿"
          message="定稿后可一键发布到课程库。定稿后课程方案将锁定，不可再修改。"
          confirmLabel="确认定稿"
          onConfirm={handleFinalize}
          onCancel={() => setShowFinalizeConfirm(false)}
        />
      )}

    </div>
  );
}
