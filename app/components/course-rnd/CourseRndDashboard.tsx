"use client";

import { useState } from "react";
import Link from "next/link";
import { SetTopBar } from "@/components/TopBarContext";
import { useToast } from "@/components/Toast";
import { ConfirmModal } from "./CourseRndModal";

interface LessonDraftSummary {
  lessonNo: number;
  contentData: string | null;
}

interface PlanVersionSummary {
  lessonDrafts: LessonDraftSummary[];
}

interface ProjectSummary {
  id: string;
  title: string;
  status: string;
  ageRange: string | null;
  level: string | null;
  lessonCount: number | null;
  updatedAt: Date;
  planVersions: PlanVersionSummary[];
  _count?: { publishRecords: number };
}

interface Props {
  projects: ProjectSummary[];
  projectCosts: Record<string, number>;
  totalCost: number;
  totalCalls: number;
}

const STATUS_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  direction: { label: "方向确认中", icon: "🔵", color: "var(--brand)" },
  workbench: { label: "方案打磨中", icon: "🔵", color: "var(--brand)" },
  finalized: { label: "已定稿 · 待发布", icon: "✅", color: "var(--green)" },
  published: { label: "已发布", icon: "📦", color: "var(--green)" },
  paused: { label: "已暂停", icon: "⏸", color: "var(--muted)" },
  archived: { label: "已废弃", icon: "🗑", color: "var(--muted)" },
};

function getStatusConfig(project: ProjectSummary) {
  if (project.status === "finalized" && (project._count?.publishRecords ?? 0) > 0) {
    return STATUS_CONFIG.published;
  }
  return STATUS_CONFIG[project.status] ?? STATUS_CONFIG.direction;
}

function getProjectLink(project: ProjectSummary): string {
  if (project.status === "workbench" || project.status === "finalized") {
    return `/course-rnd/${project.id}/workbench`;
  }
  return `/course-rnd/${project.id}`;
}

function getProgress(project: ProjectSummary): string {
  const plan = project.planVersions[0];
  if (!plan) {
    if (project.status === "direction") return "方向确认阶段";
    return "";
  }
  const total = plan.lessonDrafts.length;
  const ready = plan.lessonDrafts.filter(d => d.contentData).length;
  return `${ready}/${total} 节已生成`;
}

function timeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return new Date(date).toLocaleDateString("zh-CN");
}

function ProjectCard({ project, cost, onDelete }: { project: ProjectSummary; cost: number; onDelete: (id: string) => void }) {
  const config = getStatusConfig(project);
  const progress = getProgress(project);
  const link = getProjectLink(project);

  return (
    <div style={{
      padding: "var(--sp-4)",
      background: "var(--panel-solid)",
      border: "1px solid var(--line)",
      borderRadius: "var(--radius-md)",
      transition: "box-shadow var(--transition-fast)",
      position: "relative",
    }}>
      <Link
        href={link}
        style={{ textDecoration: "none", color: "inherit", display: "block" }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: "var(--sp-1)" }}>{project.title}</div>
        {(project.ageRange || project.level || project.lessonCount) && (
          <div className="muted" style={{ fontSize: 12, marginBottom: "var(--sp-2)" }}>
            {[
              project.ageRange && `${project.ageRange} 岁`,
              project.level,
              project.lessonCount && `${project.lessonCount} 节课`,
            ].filter(Boolean).join(" · ")}
          </div>
        )}
        <div style={{ fontSize: 12, color: config.color, fontWeight: 600, marginBottom: "var(--sp-1)" }}>
          {config.icon} {config.label}
        </div>
        {progress && (
          <div className="muted" style={{ fontSize: 12, marginBottom: "var(--sp-1)" }}>{progress}</div>
        )}
        <div className="muted" style={{ fontSize: 11 }}>
          {timeAgo(project.updatedAt)}{cost > 0 && ` · ¥${cost.toFixed(2)}`}
        </div>
      </Link>
      <button
        className="btn btn--soft btn--xs btn--danger"
        style={{ position: "absolute", top: "var(--sp-2)", right: "var(--sp-2)", fontSize: 10, padding: "1px 6px" }}
        onClick={e => { e.preventDefault(); onDelete(project.id); }}
      >
        删除
      </button>
    </div>
  );
}

export default function CourseRndDashboard({ projects: initialProjects, projectCosts, totalCost, totalCalls }: Props) {
  const [projects, setProjects] = useState(initialProjects);
  const [deleteTarget, setDeleteTarget] = useState<ProjectSummary | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["inProgress"]));
  const { showToast } = useToast();

  const inProgress = projects.filter(p => p.status === "direction" || p.status === "workbench");
  const finalized = projects.filter(p => p.status === "finalized");
  const ended = projects.filter(p => p.status === "paused" || p.status === "archived");

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteTarget(null);
    try {
      const res = await fetch(`/api/course-rnd/projects/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok) {
        setProjects(prev => prev.filter(p => p.id !== deleteTarget.id));
        showToast("项目已删除");
      } else {
        showToast(json.error ?? "删除失败", "error");
      }
    } catch {
      showToast("网络错误", "error");
    }
  }

  function toggleSection(key: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function renderSection(key: string, title: string, color: string, items: ProjectSummary[]) {
    const isExpanded = expanded.has(key);
    return (
      <div className="kanban-accordion" style={{ marginBottom: "var(--sp-3)" }}>
        <button
          type="button"
          className="kanban-accordion__header"
          onClick={() => toggleSection(key)}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
            <span style={{ fontSize: 12, color: "var(--muted)", transition: "transform 0.2s", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>
              ▶
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color }}>{title}</span>
            <span className="kanban-accordion__badge">{items.length}</span>
          </div>
        </button>
        {isExpanded && (
          <div className="kanban-accordion__body">
            {items.length === 0 ? (
              <div className="muted" style={{ fontSize: 13, padding: "var(--sp-4) 0", textAlign: "center", border: "1px dashed var(--line)", borderRadius: "var(--radius-md)", margin: "var(--sp-2) 0" }}>
                暂无{title}的项目
              </div>
            ) : (
              <div style={{ display: "grid", gap: "var(--sp-2)", padding: "var(--sp-2) 0" }}>
                {items.map(p => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    cost={projectCosts[p.id] ?? 0}
                    onDelete={id => setDeleteTarget(projects.find(pp => pp.id === id) ?? null)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <SetTopBar
        breadcrumb="课程研发"
        title="研发进度管理"
        actions={<Link href="/course-rnd/new" className="btn btn--sm">+ 新建项目</Link>}
      />

      {/* AI 费用总览 */}
      <div style={{
        padding: "var(--sp-3) var(--sp-5)",
        background: "var(--bg-faint)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-md)",
        marginBottom: "var(--sp-5)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: 13,
      }}>
        <span className="muted">
          AI 费用总览：{totalCalls} 次调用 ｜ 进行中 {inProgress.length} 个 ｜ 已定稿 {finalized.length} 个
        </span>
        <span style={{ fontWeight: 700, color: "var(--brand)" }}>总计 ¥{totalCost.toFixed(2)}</span>
      </div>

      {/* 手风琴看板 */}
      {renderSection("inProgress", "进行中", "var(--brand)", inProgress)}
      {renderSection("finalized", "已定稿", "var(--green)", finalized)}
      {renderSection("ended", "已结束", "var(--muted)", ended)}

      {deleteTarget && (
        <ConfirmModal
          title="确认删除"
          message={`确认永久删除项目「${deleteTarget.title}」？删除后所有数据（框架、方案、草稿、AI 调用记录）将不可恢复。`}
          confirmLabel="确认删除"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
