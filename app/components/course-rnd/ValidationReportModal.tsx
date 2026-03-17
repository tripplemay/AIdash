"use client";

/** 10 个固定检查项 */
export const VALIDATION_CRITERIA = [
  "课次目标清晰度",
  "AI 环节实际价值",
  "课堂流程时间分配",
  "学生卡点充分性",
  "成果模板可操作性",
  "年龄段适配性",
  "课次间递进关系",
  "作品感",
  "课次独立性",
  "禁止跑偏检查",
];

export type ItemStatus = "pending" | "checking" | "pass" | "warning" | "fail";

export interface ValidationItemState {
  criterion: string;
  status: ItemStatus;
  detail?: string;
}

export interface OverallResult {
  pass: boolean;
  summary: string;
}

interface Props {
  items: ValidationItemState[];
  overallResult: OverallResult | null;
  completed: boolean;
  onIgnoreAndFinalize: () => void;
  onGoBack: () => void;
}

const RESULT_CONFIG = {
  pass: { icon: "\u2713", color: "var(--green)", bgColor: "var(--green-light)" },
  warning: { icon: "!", color: "#e67e22", bgColor: "#fef9e7" },
  fail: { icon: "\u2715", color: "var(--danger)", bgColor: "var(--danger-light)" },
} as const;

function ItemIcon({ status }: { status: ItemStatus }) {
  if (status === "pending") {
    return (
      <span style={{
        width: 22,
        height: 22,
        borderRadius: "50%",
        background: "var(--line)",
        flexShrink: 0,
      }} />
    );
  }

  if (status === "checking") {
    return (
      <span style={{
        width: 22,
        height: 22,
        borderRadius: "50%",
        border: "2px solid var(--line)",
        borderTopColor: "var(--brand)",
        animation: "spin 0.8s linear infinite",
        flexShrink: 0,
      }} />
    );
  }

  const cfg = RESULT_CONFIG[status];
  return (
    <span style={{
      width: 22,
      height: 22,
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 12,
      fontWeight: 700,
      color: "#fff",
      background: cfg.color,
      flexShrink: 0,
    }}>
      {cfg.icon}
    </span>
  );
}

export default function ValidationReportModal({ items, overallResult, completed, onIgnoreAndFinalize, onGoBack }: Props) {
  const doneItems = items.filter(i => i.status === "pass" || i.status === "warning" || i.status === "fail");
  const counts = {
    pass: doneItems.filter(i => i.status === "pass").length,
    warning: doneItems.filter(i => i.status === "warning").length,
    fail: doneItems.filter(i => i.status === "fail").length,
  };

  return (
    <div className="modal-overlay" onClick={onGoBack}>
      <div
        className="modal"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 580, maxHeight: "80vh", display: "flex", flexDirection: "column" }}
      >
        <h3 className="modal__title">AI 审核报告</h3>

        {/* Overall status */}
        {overallResult ? (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--sp-3)",
            marginBottom: "var(--sp-4)",
            padding: "var(--sp-3) var(--sp-4)",
            borderRadius: "var(--radius-md)",
            background: overallResult.pass ? "var(--green-light)" : "var(--danger-light)",
            border: `1px solid ${overallResult.pass ? "var(--green-border)" : "var(--danger-border)"}`,
            animation: "fade-in 0.3s ease-out",
          }}>
            <span style={{
              fontSize: 18,
              fontWeight: 700,
              color: overallResult.pass ? "var(--green)" : "var(--danger)",
            }}>
              {overallResult.pass ? "\u2713 通过" : "\u2715 未通过"}
            </span>
            <span style={{ fontSize: 13, color: "var(--muted)", flex: 1 }}>
              {overallResult.summary}
            </span>
          </div>
        ) : (
          <div style={{
            marginBottom: "var(--sp-4)",
            padding: "var(--sp-3) var(--sp-4)",
            borderRadius: "var(--radius-md)",
            background: "var(--bg-faint)",
            height: 48,
            animation: "pulse-soft 1.5s ease-in-out infinite",
          }} />
        )}

        {/* Stats bar */}
        <div style={{
          display: "flex",
          gap: "var(--sp-4)",
          marginBottom: "var(--sp-4)",
          fontSize: 13,
        }}>
          <span style={{ color: "var(--green)" }}>{counts.pass} pass</span>
          <span style={{ color: "#e67e22" }}>{counts.warning} warning</span>
          <span style={{ color: "var(--danger)" }}>{counts.fail} fail</span>
          {!completed && (
            <span style={{ color: "var(--muted)" }}>
              {doneItems.length}/{items.length} 已检查
            </span>
          )}
        </div>

        {/* Item list */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          marginBottom: "var(--sp-6)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--sp-2)",
        }}>
          {items.map((item, idx) => {
            const isResult = item.status === "pass" || item.status === "warning" || item.status === "fail";
            const bgColor = isResult ? RESULT_CONFIG[item.status as "pass" | "warning" | "fail"].bgColor : "var(--bg-faint)";

            return (
              <div
                key={idx}
                style={{
                  display: "flex",
                  gap: "var(--sp-3)",
                  padding: "var(--sp-3) var(--sp-4)",
                  borderRadius: "var(--radius-md)",
                  background: bgColor,
                  border: "1px solid transparent",
                  ...(isResult ? { animation: "fade-in 0.3s ease-out" } : {}),
                }}
              >
                <ItemIcon status={item.status} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: item.status === "pending" ? "var(--muted)" : "var(--text)",
                  }}>
                    {item.criterion}
                    {item.status === "checking" && (
                      <span style={{ fontWeight: 400, fontSize: 12, color: "var(--brand)", marginLeft: "var(--sp-2)" }}>
                        检查中...
                      </span>
                    )}
                  </div>
                  {item.detail && (
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2, lineHeight: 1.5 }}>
                      {item.detail}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions — only show when completed */}
        {completed && (
          <div className="modal__actions" style={{ animation: "fade-in 0.3s ease-out" }}>
            <button className="btn btn--soft" onClick={onIgnoreAndFinalize}>忽略并定稿</button>
            <button className="btn" onClick={onGoBack}>返回修改</button>
          </div>
        )}
      </div>
    </div>
  );
}
