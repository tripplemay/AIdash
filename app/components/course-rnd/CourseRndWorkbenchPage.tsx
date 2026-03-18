"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import LessonDraftCard, { type PendingFeedback } from "./LessonDraftCard";
import AiCostPanel from "./AiCostPanel";
import PublishPanel from "./PublishPanel";
import { ConfirmModal } from "./CourseRndModal";
import ValidationReportModal, { VALIDATION_CRITERIA, type ValidationItemState, type OverallResult } from "./ValidationReportModal";
import CoverRegenerateModal from "./CoverRegenerateModal";
import { SetTopBar } from "@/components/TopBarContext";
import { useToast } from "@/components/Toast";

interface LessonDraft {
  id: string;
  lessonNo: number;
  title: string;
  overview: string | null;
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
  coverUrl: string | null;
}

interface PublishRecord {
  id: string;
  packageSlug: string;
  packageTitle: string;
  createdAt: string;
}

interface Props {
  project: Project;
  currentPlan: PlanVersion | null;
  lessonDrafts: LessonDraft[];
  directionSummary?: string | null;
  aiCosts: AiCost[];
  publishRecord?: PublishRecord | null;
}

export default function CourseRndWorkbenchPage({ project, currentPlan, lessonDrafts, aiCosts, directionSummary, publishRecord: initialPublishRecord }: Props) {
  const router = useRouter();
  const [drafts, setDrafts] = useState(lessonDrafts);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState(project.status);
  const [currentPublishRecord, setCurrentPublishRecord] = useState(initialPublishRecord);
  const [planVersion, setPlanVersion] = useState(currentPlan);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [showUnfinalizeConfirm, setShowUnfinalizeConfirm] = useState(false);
  const [validating, setValidating] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationItems, setValidationItems] = useState<ValidationItemState[]>([]);
  const [validationOverall, setValidationOverall] = useState<OverallResult | null>(null);
  const [validationCompleted, setValidationCompleted] = useState(false);
  const { showToast } = useToast();
  const publishPanelRef = useRef<HTMLDivElement>(null);

  // 每课独立的进度状态
  type ProgressState = { step: number; total: number; label: string; tokenCount: number; streamText?: string };
  const [generatingLessons, setGeneratingLessons] = useState<Map<number, ProgressState>>(new Map());
  const [revisingLessons, setRevisingLessons] = useState<Set<number>>(new Set());
  const [pendingFeedbacksMap, setPendingFeedbacksMap] = useState<Map<number, PendingFeedback[]>>(new Map());
  const [activeLessonNo, setActiveLessonNo] = useState<number | null>(drafts.length > 0 ? drafts[0].lessonNo : null);
  const [coverUrl, setCoverUrl] = useState<string | null>(project.coverUrl);
  const [generatingCover, setGeneratingCover] = useState(false);
  const [showCoverModal, setShowCoverModal] = useState(false);

  // 同步 props → state
  useEffect(() => { setDrafts(lessonDrafts); }, [lessonDrafts]);
  useEffect(() => { setStatus(project.status); }, [project.status]);
  useEffect(() => { setPlanVersion(currentPlan); }, [currentPlan]);

  const isFinalized = status === "finalized";

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
              setGeneratingLessons(prev => {
                const next = new Map(prev);
                const existing = next.get(lessonNo);
                const streamText = (existing?.streamText ?? "") + (parsed.textDelta ?? "");
                next.set(lessonNo, { ...parsed, streamText });
                return next;
              });
            } else if (event === "done") {
              setDrafts(prev => prev.map(d =>
                d.lessonNo === lessonNo
                  ? { ...d, contentData: JSON.stringify(parsed.contentData), lastFeedback: null }
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
      setPendingFeedbacksMap(prev => { const next = new Map(prev); next.delete(lessonNo); return next; });
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

  // AI 审核（SSE 流式）
  async function handleValidate() {
    // 前置检查：所有课次必须已生成
    const missingCount = drafts.filter(d => !d.contentData).length;
    if (missingCount > 0) {
      showToast(`尚有 ${missingCount} 节课未生成方案，请先完成全部课次再定稿`, "error");
      return;
    }

    // 初始化 10 项为 pending，第 1 项为 checking
    const initialItems: ValidationItemState[] = VALIDATION_CRITERIA.map((c, i) => ({
      criterion: c,
      status: i === 0 ? "checking" : "pending",
    }));
    setValidationItems(initialItems);
    setValidationOverall(null);
    setValidationCompleted(false);
    setValidating(true);
    setShowValidationModal(true);
    setError("");

    try {
      const res = await fetch(`/api/course-rnd/projects/${project.id}/validate`, { method: "POST" });

      if (res.status === 503) {
        setShowValidationModal(false);
        showToast("AI 审核服务未配置，跳过审核", "info");
        setShowFinalizeConfirm(true);
        return;
      }

      if (!res.ok) {
        const json = await res.json();
        setShowValidationModal(false);
        showToast(json.error ?? "审核失败", "error");
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) { setShowValidationModal(false); showToast("无法读取响应", "error"); return; }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() ?? "";

        for (const block of blocks) {
          const eventMatch = block.match(/event: (\w+)\ndata: ([\s\S]*)/);
          if (!eventMatch) continue;

          const [, event, data] = eventMatch;
          try {
            const parsed = JSON.parse(data);

            if (event === "item") {
              const idx = parsed.index - 1; // 0-based
              setValidationItems(prev => prev.map((item, i) => {
                if (i === idx) {
                  return { ...item, status: parsed.status, detail: parsed.detail };
                }
                // 将下一个 pending 项设为 checking
                if (i === idx + 1 && item.status === "pending") {
                  return { ...item, status: "checking" };
                }
                return item;
              }));
            } else if (event === "overall") {
              setValidationOverall({ pass: parsed.overallPass, summary: parsed.summary });
            } else if (event === "done") {
              setValidationCompleted(true);
            } else if (event === "error") {
              setShowValidationModal(false);
              showToast(parsed.message ?? "审核失败", "error");
            }
          } catch {}
        }
      }
    } catch {
      setShowValidationModal(false);
      showToast("网络错误", "error");
    } finally {
      setValidating(false);
    }
  }

  // 确认定稿
  async function handleFinalize() {
    setShowFinalizeConfirm(false);
    setShowValidationModal(false);
    setGlobalLoading(true);
    try {
      const res = await fetch(`/api/course-rnd/projects/${project.id}/finalize`, { method: "POST" });
      if (!res.ok) { setError("定稿失败"); return; }
      setStatus("finalized");
      setCurrentPublishRecord(null);
      // 定稿后滚动到发布区
      setTimeout(() => publishPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    } catch {
      setError("网络错误");
    } finally {
      setGlobalLoading(false);
    }
  }

  // 撤回定稿
  async function handleUnfinalize() {
    setShowUnfinalizeConfirm(false);
    setGlobalLoading(true);
    try {
      const res = await fetch(`/api/course-rnd/projects/${project.id}/finalize`, { method: "PATCH" });
      if (!res.ok) { setError("撤回失败"); return; }
      setStatus("workbench");
      setCurrentPublishRecord(null);
      showToast("已撤回定稿，可继续修改");
    } catch {
      setError("网络错误");
    } finally {
      setGlobalLoading(false);
    }
  }

  async function handleGenerateCover(customPrompt?: string) {
    setGeneratingCover(true);
    setShowCoverModal(false);
    try {
      const res = await fetch(`/api/course-rnd/projects/${project.id}/generate-cover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customPrompt }),
      });
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
        actionsKey={status}
        actions={isFinalized ? (
          <button className="btn btn--soft btn--sm btn--danger" onClick={() => setShowUnfinalizeConfirm(true)} disabled={globalLoading}>撤回定稿</button>
        ) : (
          <>
            <button className="btn btn--soft btn--sm btn--danger" onClick={() => setShowArchiveConfirm(true)} disabled={globalLoading}>废弃</button>
            <button className="btn btn--soft btn--sm" onClick={handleSaveVersion} disabled={globalLoading}>保存版本</button>
            <button className="btn btn--sm" onClick={handleValidate} disabled={globalLoading || validating}>
              {validating ? "审核中..." : "审核并定稿"}
            </button>
          </>
        )}
      />

      {error && <div className="field-error" style={{ marginBottom: "var(--sp-4)" }}>{error}</div>}

      {/* AI 费用面板 */}
      <AiCostPanel costs={aiCosts} lessonCount={drafts.filter(d => d.contentData).length || 1} />

      {/* 无草稿提示 */}
      {drafts.length === 0 && (
        <div className="card--glass" style={{ padding: "var(--sp-10)", textAlign: "center" }}>
          <p className="muted">暂无课次数据，请返回框架阶段确认后重新进入。</p>
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
            onClick={() => coverUrl ? setShowCoverModal(true) : handleGenerateCover()}
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
              isActive={activeLessonNo === draft.lessonNo}
              onActivate={() => setActiveLessonNo(draft.lessonNo)}
              onRevise={(feedback, targetSection) => handleReviselesson(draft.lessonNo, feedback, targetSection)}
              onRegenerate={() => { setActiveLessonNo(draft.lessonNo); handleRegenerateLesson(draft.lessonNo); }}
              onContentUpdate={(lessonNo, contentData) => {
                setDrafts(prev => prev.map(d =>
                  d.lessonNo === lessonNo ? { ...d, contentData } : d
                ));
              }}
              loading={revisingLessons.has(draft.lessonNo)}
              disabled={isFinalized || showValidationModal || showFinalizeConfirm}
              generating={generatingLessons.has(draft.lessonNo)}
              progress={generatingLessons.get(draft.lessonNo) ?? null}
              pendingFeedbacks={pendingFeedbacksMap.get(draft.lessonNo) ?? []}
              onAddPending={(item) => {
                setPendingFeedbacksMap(prev => {
                  const next = new Map(prev);
                  const list = [...(next.get(draft.lessonNo) ?? []), item];
                  next.set(draft.lessonNo, list);
                  return next;
                });
              }}
              onRemovePending={(id) => {
                setPendingFeedbacksMap(prev => {
                  const next = new Map(prev);
                  const list = (next.get(draft.lessonNo) ?? []).filter(f => f.id !== id);
                  if (list.length === 0) next.delete(draft.lessonNo);
                  else next.set(draft.lessonNo, list);
                  return next;
                });
              }}
              onSubmitAllPending={() => {
                const items = pendingFeedbacksMap.get(draft.lessonNo) ?? [];
                if (items.length === 0) return;
                // 合并多条意见为一条文本
                const mergedFeedback = items.map(item =>
                  item.sectionTitle
                    ? `针对「${item.sectionTitle}」：${item.feedback}`
                    : item.feedback
                ).join("\n");
                // 不传 targetSection，让 AI 自由判断修改范围
                handleReviselesson(draft.lessonNo, mergedFeedback);
                // 清空暂存
                setPendingFeedbacksMap(prev => {
                  const next = new Map(prev);
                  next.delete(draft.lessonNo);
                  return next;
                });
              }}
            />
          ))}
        </div>
      )}

      {/* 发布面板（定稿后显示） */}
      {isFinalized && drafts.length > 0 && (
        <div ref={publishPanelRef}>
          <PublishPanel
            projectId={project.id}
            projectTitle={project.title}
            ageRange={(project as { ageRange?: string }).ageRange ?? null}
            level={(project as { level?: string }).level ?? null}
            coverUrl={coverUrl}
            lessonDrafts={drafts.map(d => ({ lessonNo: d.lessonNo, title: d.title, contentData: d.contentData }))}
            directionSummary={directionSummary}
            publishRecord={currentPublishRecord}
          />
        </div>
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

      {showUnfinalizeConfirm && (
        <ConfirmModal
          title="确认撤回定稿"
          message="撤回后课程方案将解锁，可继续修改。如已发布到课程库，已发布内容不受影响，修改后需重新定稿并发布。"
          confirmLabel="确认撤回"
          danger
          onConfirm={handleUnfinalize}
          onCancel={() => setShowUnfinalizeConfirm(false)}
        />
      )}

      {showValidationModal && (
        <ValidationReportModal
          items={validationItems}
          overallResult={validationOverall}
          completed={validationCompleted}
          onIgnoreAndFinalize={handleFinalize}
          onGoBack={() => setShowValidationModal(false)}
        />
      )}

      {showCoverModal && (
        <CoverRegenerateModal
          coverUrl={coverUrl}
          onGenerate={handleGenerateCover}
          onClose={() => setShowCoverModal(false)}
        />
      )}

    </div>
  );
}
