"use client";

interface ValidationItem {
  criterion: string;
  status: "pass" | "warning" | "fail";
  detail?: string;
}

interface ValidationReport {
  overallPass: boolean;
  items: ValidationItem[];
  summary: string;
}

interface Props {
  report: ValidationReport;
  onIgnoreAndFinalize: () => void;
  onGoBack: () => void;
}

const STATUS_CONFIG = {
  pass: { icon: "\u2713", color: "var(--green)", bgColor: "var(--green-light)" },
  warning: { icon: "!", color: "#e67e22", bgColor: "#fef9e7" },
  fail: { icon: "\u2715", color: "var(--danger)", bgColor: "var(--danger-light)" },
} as const;

export default function ValidationReportModal({ report, onIgnoreAndFinalize, onGoBack }: Props) {
  const counts = {
    pass: report.items.filter(i => i.status === "pass").length,
    warning: report.items.filter(i => i.status === "warning").length,
    fail: report.items.filter(i => i.status === "fail").length,
  };

  return (
    <div className="modal-overlay" onClick={onGoBack}>
      <div
        className="modal"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 580, maxHeight: "80vh", display: "flex", flexDirection: "column" }}
      >
        <h3 className="modal__title">AI 审核报告</h3>

        {/* Overall status + summary */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--sp-3)",
          marginBottom: "var(--sp-4)",
          padding: "var(--sp-3) var(--sp-4)",
          borderRadius: "var(--radius-md)",
          background: report.overallPass ? "var(--green-light)" : "var(--danger-light)",
          border: `1px solid ${report.overallPass ? "var(--green-border)" : "var(--danger-border)"}`,
        }}>
          <span style={{
            fontSize: 18,
            fontWeight: 700,
            color: report.overallPass ? "var(--green)" : "var(--danger)",
          }}>
            {report.overallPass ? "\u2713 通过" : "\u2715 未通过"}
          </span>
          <span style={{ fontSize: 13, color: "var(--muted)", flex: 1 }}>
            {report.summary}
          </span>
        </div>

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
          {report.items.map((item, idx) => {
            const cfg = STATUS_CONFIG[item.status];
            return (
              <div
                key={idx}
                style={{
                  display: "flex",
                  gap: "var(--sp-3)",
                  padding: "var(--sp-3) var(--sp-4)",
                  borderRadius: "var(--radius-md)",
                  background: cfg.bgColor,
                  border: "1px solid transparent",
                }}
              >
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
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                    {item.criterion}
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

        {/* Actions */}
        <div className="modal__actions">
          <button className="btn btn--soft" onClick={onIgnoreAndFinalize}>忽略并定稿</button>
          <button className="btn" onClick={onGoBack}>返回修改</button>
        </div>
      </div>
    </div>
  );
}

export type { ValidationReport, ValidationItem };
