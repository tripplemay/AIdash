"use client";

import { useState, useEffect, useCallback } from "react";

interface UsageEntry {
  model?: string;
  action?: string;
  calls: number;
  tokens: number;
  cost: number;
}

type TimeRange = "today" | "week" | "month" | "all";
type SortKey = "calls" | "cost";

const RANGE_LABELS: Record<TimeRange, string> = {
  today: "今日",
  week: "本周",
  month: "本月",
  all: "全部",
};

const ACTION_LABELS: Record<string, string> = {
  generate_framework: "生成课程框架",
  revise_framework: "调整框架",
  generate_plan: "生成详细方案",
  regenerate_lesson: "生成/重新生成课次",
  revise_lesson: "按意见修改课次",
  rewrite_field: "单字段改写",
  lesson_cover: "课次封面图",
  lesson_illustration: "课内插图",
  package_cover: "课程包封面图",
};

export default function UsageStats() {
  const [range, setRange] = useState<TimeRange>("all");
  const [sortKey, setSortKey] = useState<SortKey>("cost");
  const [data, setData] = useState<{ byModel: UsageEntry[]; byAction: UsageEntry[]; totalCost: number; totalCalls: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback((r: TimeRange) => {
    setLoading(true);
    fetch(`/api/admin/ai-usage?range=${r}`)
      .then(res => res.json())
      .then(json => setData(json.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(range); }, [range, fetchData]);

  function sortEntries(entries: UsageEntry[]): UsageEntry[] {
    return [...entries].sort((a, b) => b[sortKey] - a[sortKey]);
  }

  const hasData = data && (data.byModel.length > 0 || data.byAction.length > 0);

  return (
    <div className="card--glass" style={{ padding: "var(--sp-5)", marginBottom: "var(--sp-5)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--sp-4)" }}>
        <h3 style={{ fontSize: 16, fontWeight: 700 }}>
          AI 用量统计
          {data && <span className="muted" style={{ fontWeight: 400, fontSize: 13, marginLeft: "var(--sp-2)" }}>
            {data.totalCalls} 次调用 · 总计 ¥{data.totalCost.toFixed(2)}
          </span>}
        </h3>
        <div style={{ display: "flex", gap: "var(--sp-1)" }}>
          {(Object.keys(RANGE_LABELS) as TimeRange[]).map(r => (
            <button
              key={r}
              className={`btn btn--xs ${r === range ? "" : "btn--soft"}`}
              onClick={() => setRange(r)}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="muted" style={{ textAlign: "center", padding: "var(--sp-4) 0" }}>加载中...</div>}

      {!loading && !hasData && (
        <div className="muted" style={{ textAlign: "center", padding: "var(--sp-5) 0" }}>
          该时段暂无 AI 调用记录
        </div>
      )}

      {!loading && hasData && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-4)" }}>
          {/* 按模型 */}
          <div>
            <div className="field-label">按模型</div>
            <div className="table-wrap">
              <table className="table" style={{ fontSize: 12 }}>
                <thead>
                  <tr>
                    <th>模型</th>
                    <th className="table__th--sortable" onClick={() => setSortKey("calls")} style={{ cursor: "pointer" }}>
                      调用{sortKey === "calls" ? " ▼" : ""}
                    </th>
                    <th>token</th>
                    <th className="table__th--sortable" onClick={() => setSortKey("cost")} style={{ cursor: "pointer" }}>
                      费用{sortKey === "cost" ? " ▼" : ""}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortEntries(data!.byModel).map(u => (
                    <tr key={u.model}>
                      <td className="table__cell--mono" style={{ fontSize: 11 }}>{(u.model ?? "").split("/").pop()}</td>
                      <td>{u.calls}</td>
                      <td>{(u.tokens / 1000).toFixed(1)}k</td>
                      <td>¥{u.cost.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 按动作 */}
          <div>
            <div className="field-label">按动作</div>
            <div className="table-wrap">
              <table className="table" style={{ fontSize: 12 }}>
                <thead>
                  <tr>
                    <th>动作</th>
                    <th className="table__th--sortable" onClick={() => setSortKey("calls")} style={{ cursor: "pointer" }}>
                      调用{sortKey === "calls" ? " ▼" : ""}
                    </th>
                    <th className="table__th--sortable" onClick={() => setSortKey("cost")} style={{ cursor: "pointer" }}>
                      费用{sortKey === "cost" ? " ▼" : ""}
                    </th>
                    <th>平均</th>
                  </tr>
                </thead>
                <tbody>
                  {sortEntries(data!.byAction).map(u => (
                    <tr key={u.action}>
                      <td>{ACTION_LABELS[u.action ?? ""] ?? u.action}</td>
                      <td>{u.calls}</td>
                      <td>¥{u.cost.toFixed(2)}</td>
                      <td>¥{u.calls > 0 ? (u.cost / u.calls).toFixed(3) : "0"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
