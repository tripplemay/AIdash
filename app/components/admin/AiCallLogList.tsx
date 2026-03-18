"use client";

import { useState, useEffect, useCallback } from "react";
import { SetTopBar } from "@/components/TopBarContext";
import { useToast } from "@/components/Toast";
import { ConfirmModal } from "@/components/course-rnd/CourseRndModal";
import AiCallLogDetail from "./AiCallLogDetail";

interface LogItem {
  id: string;
  projectId: string;
  projectTitle: string;
  actionType: string;
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  generate_framework: "生成课程框架",
  revise_framework: "修订课程框架",
  regenerate_lesson: "生成课次方案",
  revise_lesson: "修改课次方案",
  rewrite_field: "改写指定字段",
  rewrite_teaching_talk: "生成教学话术",
  validate_lesson: "课程审核",
  lesson_cover: "课次封面图",
  lesson_illustration: "课内插图",
  package_cover: "课程包封面图",
};

const TIME_RANGES = [
  { key: "all", label: "全部" },
  { key: "today", label: "今日" },
  { key: "week", label: "本周" },
  { key: "month", label: "本月" },
] as const;

type TimeRange = (typeof TIME_RANGES)[number]["key"];

interface Props {
  projects: { id: string; title: string }[];
  actionTypes: string[];
  isAdmin: boolean;
}

export default function AiCallLogList({ projects, actionTypes, isAdmin }: Props) {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // 筛选
  const [filterProject, setFilterProject] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterRange, setFilterRange] = useState<TimeRange>("all");

  // 详情面板
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  // 清理确认
  const [showCleanup, setShowCleanup] = useState(false);
  const [cleanupDays, setCleanupDays] = useState(30);
  const [cleaning, setCleaning] = useState(false);

  const pageSize = 20;
  const totalPages = Math.ceil(total / pageSize);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (filterProject) params.set("projectId", filterProject);
      if (filterAction) params.set("actionType", filterAction);
      if (filterRange !== "all") params.set("range", filterRange);

      const res = await fetch(`/api/admin/ai-logs?${params}`);
      const json = await res.json();
      if (res.ok) {
        setLogs(json.data ?? []);
        setTotal(json.total ?? 0);
      } else {
        showToast(json.error ?? "加载失败", "error");
      }
    } catch {
      showToast("加载失败", "error");
    } finally {
      setLoading(false);
    }
  }, [page, filterProject, filterAction, filterRange, showToast]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // 筛选变化时重置页码
  function handleFilterChange(setter: (v: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  async function handleCleanup() {
    setCleaning(true);
    try {
      const res = await fetch("/api/admin/ai-logs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ olderThanDays: cleanupDays }),
      });
      const json = await res.json();
      if (res.ok) {
        showToast(`已清理 ${json.data.deleted} 条记录`);
        setShowCleanup(false);
        setPage(1);
        fetchLogs();
      } else {
        showToast(json.error ?? "清理失败", "error");
      }
    } catch {
      showToast("清理失败", "error");
    } finally {
      setCleaning(false);
    }
  }

  return (
    <>
      <SetTopBar
        breadcrumb="管理后台"
        title="AI 调用记录"
        actions={isAdmin ? (
          <button className="btn btn--soft btn--sm btn--danger" onClick={() => setShowCleanup(true)}>
            清理旧日志
          </button>
        ) : undefined}
      />

      {/* 筛选栏 */}
      <div className="ai-log__filters">
        <select
          className="select"
          style={{ width: 200, height: 34, fontSize: 12 }}
          value={filterProject}
          onChange={e => handleFilterChange(setFilterProject, e.target.value)}
        >
          <option value="">全部项目</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>

        <select
          className="select"
          style={{ width: 160, height: 34, fontSize: 12 }}
          value={filterAction}
          onChange={e => handleFilterChange(setFilterAction, e.target.value)}
        >
          <option value="">全部动作</option>
          {actionTypes.map(a => (
            <option key={a} value={a}>{ACTION_LABELS[a] ?? a}</option>
          ))}
        </select>

        <div className="ai-log__range-tabs">
          {TIME_RANGES.map(r => (
            <button
              key={r.key}
              className={`btn btn--xs ${r.key === filterRange ? "" : "btn--soft"}`}
              onClick={() => { setFilterRange(r.key); setPage(1); }}
            >
              {r.label}
            </button>
          ))}
        </div>

        <span className="muted" style={{ fontSize: 12, marginLeft: "auto" }}>
          共 {total} 条
        </span>
      </div>

      {/* 表格 */}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {["时间", "项目", "动作类型", "模型", "Token", "费用"].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="table__empty">加载中...</td></tr>
            )}
            {!loading && logs.length === 0 && (
              <tr><td colSpan={6} className="table__empty">暂无记录</td></tr>
            )}
            {!loading && logs.map(log => (
              <tr
                key={log.id}
                onClick={() => setSelectedLogId(log.id)}
                style={{ cursor: "pointer" }}
                className={selectedLogId === log.id ? "table__row--active" : ""}
              >
                <td style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                  {new Date(log.createdAt).toLocaleString("zh-CN")}
                </td>
                <td style={{ fontSize: 13 }}>{log.projectTitle}</td>
                <td style={{ fontSize: 13 }}>
                  <span className="pill pill--sm">{ACTION_LABELS[log.actionType] ?? log.actionType}</span>
                </td>
                <td className="table__cell--mono" style={{ fontSize: 11 }}>
                  {log.modelName.split("/").pop()}
                </td>
                <td style={{ fontSize: 12 }}>
                  {log.inputTokens > 0 || log.outputTokens > 0
                    ? `${log.inputTokens}/${log.outputTokens}`
                    : "-"}
                </td>
                <td style={{ fontSize: 12 }}>¥{log.estimatedCost.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="ai-log__pagination">
          <button
            className="btn btn--soft btn--sm"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            上一页
          </button>
          <span className="muted" style={{ fontSize: 13 }}>
            第 {page}/{totalPages} 页
          </span>
          <button
            className="btn btn--soft btn--sm"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            下一页
          </button>
        </div>
      )}

      {/* 详情面板 */}
      {selectedLogId && (
        <AiCallLogDetail
          logId={selectedLogId}
          onClose={() => setSelectedLogId(null)}
        />
      )}

      {/* 清理确认 */}
      {showCleanup && (
        <div className="modal-overlay" onClick={() => setShowCleanup(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal__title">清理旧日志</h3>
            <div className="modal__body">
              <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: "var(--sp-3)" }}>
                选择要清理的时间范围，此操作不可撤销。
              </p>
              <select
                className="select"
                value={cleanupDays}
                onChange={e => setCleanupDays(parseInt(e.target.value, 10))}
              >
                <option value={30}>30 天前的记录</option>
                <option value={60}>60 天前的记录</option>
                <option value={90}>90 天前的记录</option>
              </select>
            </div>
            <div className="modal__actions">
              <button className="btn btn--soft" onClick={() => setShowCleanup(false)}>取消</button>
              <button
                className="btn btn--danger-fill"
                onClick={handleCleanup}
                disabled={cleaning}
              >
                {cleaning ? "清理中..." : "确认清理"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
