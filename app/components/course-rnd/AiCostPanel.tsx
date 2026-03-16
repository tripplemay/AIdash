"use client";

import { useState } from "react";

interface AiCost {
  id: string;
  actionType: string;
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  createdAt: Date;
}

interface Props {
  costs: AiCost[];
  lessonCount?: number;
}

const ACTION_LABELS: Record<string, string> = {
  generate_framework: "生成课程框架",
  revise_framework: "调整框架",
  optimize_framework_field: "优化标题/概述",
  generate_plan: "生成详细方案",
  regenerate_lesson: "重新生成本节",
  revise_lesson: "按意见修改本节",
  rewrite_field: "单字段改写",
  revise_adjacent: "联动优化",
  rewrite_teaching_talk: "重写授课表达",
  lesson_cover: "课次封面图",
  lesson_illustration: "课内插图",
  package_cover: "课程包封面图",
};

export default function AiCostPanel({ costs, lessonCount }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (costs.length === 0) return null;

  const totalCalls = costs.length;
  const totalCost = costs.reduce((sum, c) => sum + c.estimatedCost, 0);

  // 按动作汇总
  const byAction = new Map<string, { count: number; cost: number }>();
  for (const c of costs) {
    const existing = byAction.get(c.actionType) ?? { count: 0, cost: 0 };
    existing.count += 1;
    existing.cost += c.estimatedCost;
    byAction.set(c.actionType, existing);
  }
  const actionEntries = Array.from(byAction.entries()).sort((a, b) => b[1].cost - a[1].cost);
  const maxActionCost = actionEntries[0]?.[1].cost ?? 1;

  // 按课次汇总（从 actionType 中提取不太可行，用 lessonNo 暂不可用，按模型分组替代）
  // 这里简化为"每课均价"指标
  const generatedLessons = lessonCount ?? 1;
  const avgCostPerLesson = totalCost / generatedLessons;

  return (
    <div style={{
      marginBottom: "var(--sp-5)",
      background: "var(--bg-faint)",
      border: "1px solid var(--line)",
      borderRadius: "var(--radius-md)",
    }}>
      {/* 折叠头部 */}
      <div
        style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          cursor: "pointer", padding: "var(--sp-3) var(--sp-4)", fontSize: 13,
        }}
        onClick={() => setExpanded(v => !v)}
      >
        <span className="muted" style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
          <span style={{ fontSize: 10, transition: "transform 0.2s", transform: expanded ? "rotate(90deg)" : "none" }}>▶</span>
          AI 使用统计：{totalCalls} 次调用
        </span>
        <span style={{ fontWeight: 700, color: "var(--brand)" }}>¥{totalCost.toFixed(2)}</span>
      </div>

      {/* 展开内容 */}
      {expanded && (
        <div style={{ padding: "0 var(--sp-4) var(--sp-4)" }}>
          {/* 指标卡片 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--sp-3)", marginBottom: "var(--sp-4)" }}>
            <div style={{ padding: "var(--sp-3)", background: "var(--panel-solid)", borderRadius: "var(--radius-sm)", border: "1px solid var(--line)" }}>
              <div className="muted" style={{ fontSize: 11, marginBottom: 2 }}>总费用</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--brand)" }}>¥{totalCost.toFixed(2)}</div>
            </div>
            <div style={{ padding: "var(--sp-3)", background: "var(--panel-solid)", borderRadius: "var(--radius-sm)", border: "1px solid var(--line)" }}>
              <div className="muted" style={{ fontSize: 11, marginBottom: 2 }}>调用次数</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{totalCalls} 次</div>
            </div>
            <div style={{ padding: "var(--sp-3)", background: "var(--panel-solid)", borderRadius: "var(--radius-sm)", border: "1px solid var(--line)" }}>
              <div className="muted" style={{ fontSize: 11, marginBottom: 2 }}>每课均价</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>¥{avgCostPerLesson.toFixed(2)}</div>
            </div>
          </div>

          {/* 按动作分布 */}
          <div style={{ fontSize: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: "var(--sp-2)" }}>按动作分布</div>
            <div style={{ display: "grid", gap: "var(--sp-2)" }}>
              {actionEntries.map(([action, data]) => (
                <div key={action} style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
                  <div style={{ width: 120, fontSize: 12, flexShrink: 0 }}>{ACTION_LABELS[action] ?? action}</div>
                  <div style={{ flex: 1, height: 16, background: "var(--panel-solid)", borderRadius: 3, overflow: "hidden", border: "1px solid var(--line)" }}>
                    <div style={{
                      height: "100%",
                      width: `${Math.max((data.cost / maxActionCost) * 100, 2)}%`,
                      background: "var(--brand)",
                      borderRadius: 3,
                      opacity: 0.7,
                    }} />
                  </div>
                  <div style={{ width: 80, textAlign: "right", fontSize: 11, flexShrink: 0 }}>
                    ¥{data.cost.toFixed(2)} · {data.count}次
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
