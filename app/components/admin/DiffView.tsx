"use client";

import type { DiffHunk } from "@/lib/diff-utils";

interface Props {
  hunks: DiffHunk[];
  v1Label: string;
  v2Label: string;
  onClose: () => void;
}

export default function DiffView({ hunks, v1Label, v2Label, onClose }: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 800, width: "90vw" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="modal__title">
          版本对比: {v1Label} vs {v2Label}
        </h3>

        <div className="modal__body" style={{ maxHeight: "60vh", overflow: "auto" }}>
          {hunks.length === 0 && (
            <div className="muted" style={{ textAlign: "center", padding: "var(--sp-5) 0" }}>
              两个版本内容相同，无差异
            </div>
          )}

          {hunks.map((hunk, hi) => (
            <div key={hi} style={{ marginBottom: "var(--sp-3)" }}>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--muted)",
                  padding: "var(--sp-1) var(--sp-2)",
                  background: "var(--bg-faint)",
                  borderRadius: "var(--radius-sm)",
                  fontFamily: "monospace",
                  marginBottom: "var(--sp-1)",
                }}
              >
                @@ -{hunk.oldStart} +{hunk.newStart} @@
              </div>

              {hunk.lines.map((line, li) => (
                <div
                  key={li}
                  className={`diff-view__line diff-view__line--${line.type}`}
                >
                  <span className="diff-view__line-no">
                    {line.oldLineNo ?? " "}
                  </span>
                  <span className="diff-view__line-no">
                    {line.newLineNo ?? " "}
                  </span>
                  <span className="diff-view__line-prefix">
                    {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
                  </span>
                  <span className="diff-view__line-content">
                    {line.content}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="modal__actions">
          <button className="btn btn--soft btn--sm" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
