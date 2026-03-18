"use client";

import { MessageSquare, Sparkles } from "lucide-react";

interface NewChatDialogProps {
  onSelect: (mode: string) => void;
  onClose: () => void;
}

export default function NewChatDialog({ onSelect, onClose }: NewChatDialogProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal__title">选择对话模式</div>
        <div className="chat-dialog__modes">
          <button
            className="chat-dialog__mode-card"
            onClick={() => onSelect("general")}
          >
            <div className="chat-dialog__mode-icon">
              <MessageSquare size={32} />
            </div>
            <div className="chat-dialog__mode-title">通用模式</div>
            <div className="chat-dialog__mode-desc">
              通用 AI 助手，可以回答任何问题
            </div>
          </button>
          <button
            className="chat-dialog__mode-card"
            onClick={() => onSelect("course_design")}
          >
            <div className="chat-dialog__mode-icon">
              <Sparkles size={32} />
            </div>
            <div className="chat-dialog__mode-title">课程设计模式</div>
            <div className="chat-dialog__mode-desc">
              AI 具备课程设计专业知识，适合课程规划和设计咨询
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
