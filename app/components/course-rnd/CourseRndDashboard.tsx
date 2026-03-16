"use client";

import Link from "next/link";

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
  paused: { label: "已暂停", icon: "⏸", color: "var(--muted)" },
  archived: { label: "已废弃", icon: "🗑", color: "var(--muted)" },
};

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

function ProjectCard({ project, cost }: { project: ProjectSummary; cost: number }) {
  const config = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.direction;
  const progress = getProgress(project);
  const link = getProjectLink(project);

  return (
    <Link
      href={link}
      style={{
        display: "block",
        padding: "var(--sp-4)",
        background: "var(--panel-solid)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-md)",
        textDecoration: "none",
        color: "inherit",
        transition: "box-shadow var(--transition-fast), transform var(--transition-fast)",
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = "var(--shadow-sm)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}
    >
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: "var(--sp-1)" }}>{project.title}</div>
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
  );
}

export default function CourseRndDashboard({ projects, projectCosts, totalCost, totalCalls }: Props) {
  // 分组
  const inProgress = projects.filter(p => p.status === "direction" || p.status === "workbench");
  const finalized = projects.filter(p => p.status === "finalized");
  const ended = projects.filter(p => p.status === "paused" || p.status === "archived");

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* 头部 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--sp-5)" }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: "var(--sp-1)" }}>研发进度管理</h1>
          <p className="muted" style={{ fontSize: 14 }}>管理课程研发项目，跟踪进度</p>
        </div>
        <Link href="/course-rnd/new" className="btn">+ 新建项目</Link>
      </div>

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

      {/* 看板 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--sp-4)", alignItems: "start" }}>
        {/* 进行中 */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: "var(--sp-3)", color: "var(--brand)" }}>
            进行中 ({inProgress.length})
          </div>
          <div style={{ display: "grid", gap: "var(--sp-3)" }}>
            {inProgress.length === 0 && (
              <div className="muted" style={{ fontSize: 13, padding: "var(--sp-5) 0", textAlign: "center" }}>暂无进行中的项目</div>
            )}
            {inProgress.map(p => <ProjectCard key={p.id} project={p} cost={projectCosts[p.id] ?? 0} />)}
          </div>
        </div>

        {/* 已定稿 */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: "var(--sp-3)", color: "var(--green)" }}>
            已定稿 ({finalized.length})
          </div>
          <div style={{ display: "grid", gap: "var(--sp-3)" }}>
            {finalized.length === 0 && (
              <div className="muted" style={{ fontSize: 13, padding: "var(--sp-5) 0", textAlign: "center" }}>暂无已定稿的项目</div>
            )}
            {finalized.map(p => <ProjectCard key={p.id} project={p} cost={projectCosts[p.id] ?? 0} />)}
          </div>
        </div>

        {/* 已结束 */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: "var(--sp-3)", color: "var(--muted)" }}>
            已结束 ({ended.length})
          </div>
          <div style={{ display: "grid", gap: "var(--sp-3)" }}>
            {ended.length === 0 && (
              <div className="muted" style={{ fontSize: 13, padding: "var(--sp-5) 0", textAlign: "center" }}>暂无已结束的项目</div>
            )}
            {ended.map(p => <ProjectCard key={p.id} project={p} cost={projectCosts[p.id] ?? 0} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
