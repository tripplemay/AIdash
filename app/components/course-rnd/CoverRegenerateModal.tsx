"use client";

import { useState } from "react";

interface Props {
  coverUrl: string | null;
  onGenerate: (customPrompt?: string) => void;
  onClose: () => void;
}

export default function CoverRegenerateModal({ coverUrl, onGenerate, onClose }: Props) {
  const [prompt, setPrompt] = useState("");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 680 }}>
        <h3 className="modal__title">重新生成封面</h3>
        <div className="modal__body">
          <div style={{ display: "flex", gap: "var(--sp-4)" }}>
            {/* 左侧当前封面缩略图 */}
            <div style={{
              width: 240, height: 160, flexShrink: 0,
              borderRadius: "var(--radius-md)", border: "1px solid var(--line)",
              overflow: "hidden", background: "var(--bg-faint)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {coverUrl ? (
                <img src={coverUrl} alt="当前封面" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span className="muted" style={{ fontSize: 12 }}>暂无封面</span>
              )}
            </div>
            {/* 右侧提示词编辑 */}
            <div style={{ flex: 1 }}>
              <p className="muted" style={{ fontSize: 13, marginBottom: "var(--sp-2)" }}>
                描述您想要的封面效果（可选），留空则根据课程信息自动生成。
              </p>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                rows={5}
                placeholder="例如：加入未来城市元素、换成科技风格、色调更温暖..."
                style={{
                  width: "100%",
                  padding: "var(--sp-3)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-md)",
                  fontSize: 13,
                  lineHeight: 1.6,
                  resize: "vertical",
                  background: "var(--bg-main)",
                  color: "var(--text)",
                }}
              />
            </div>
          </div>
        </div>
        <div className="modal__actions">
          <button className="btn btn--soft" onClick={onClose}>取消</button>
          <button className="btn" onClick={() => onGenerate(prompt.trim() || undefined)}>生成封面</button>
        </div>
      </div>
    </div>
  );
}
