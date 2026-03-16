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
};

export default function AiCostPanel({ costs }: { costs: AiCost[] }) {
  const [expanded, setExpanded] = useState(false);

  if (costs.length === 0) return null;

  const totalCalls = costs.length;
  const totalCost = costs.reduce((sum, c) => sum + c.estimatedCost, 0);
  const totalTokens = costs.reduce((sum, c) => sum + c.inputTokens + c.outputTokens, 0);

  // 按动作类型汇总
  const byAction = new Map<string, { count: number; tokens: number; cost: number; model: string }>();
  for (const c of costs) {
    const key = c.actionType;
    const existing = byAction.get(key) ?? { count: 0, tokens: 0, cost: 0, model: c.modelName };
    existing.count++;
    existing.tokens += c.inputTokens + c.outputTokens;
    existing.cost += c.estimatedCost;
    existing.model = c.modelName;
    byAction.set(key, existing);
  }

  return (
    <div style={{
      marginBottom: "var(--sp-5)",
      padding: "var(--sp-3) var(--sp-4)",
      background: "var(--bg-faint)",
      border: "1px solid var(--line)",
      borderRadius: "var(--radius-md)",
      fontSize: 13,
    }}>
      {/* 汇总行 */}
      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
        onClick={() => setExpanded(v => !v)}
      >
        <span className="muted">
          AI 使用统计：{totalCalls} 次调用 ｜ {(totalTokens / 1000).toFixed(1)}k token
        </span>
        <span style={{ fontWeight: 700, color: "var(--brand)" }}>
          ¥{totalCost.toFixed(2)}
        </span>
      </div>

      {/* 展开详情 */}
      {expanded && (
        <div style={{ marginTop: "var(--sp-3)" }}>
          {/* 按动作汇总 */}
          <table className="table" style={{ fontSize: 12 }}>
            <thead>
              <tr>
                <th>动作</th>
                <th>次数</th>
                <th>模型</th>
                <th>token</th>
                <th>费用</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(byAction.entries()).map(([action, data]) => (
                <tr key={action}>
                  <td>{ACTION_LABELS[action] ?? action}</td>
                  <td>{data.count}</td>
                  <td className="table__cell--mono" style={{ fontSize: 11 }}>{data.model.split("/").pop()}</td>
                  <td>{(data.tokens / 1000).toFixed(1)}k</td>
                  <td>¥{data.cost.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
