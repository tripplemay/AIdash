"use client";

import { useState } from "react";

interface Conversation {
  id: string;
  title: string;
  mode: string;
  createdAt: string;
  updatedAt: string;
}

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string | null;
  onCreate: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "刚刚";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

const MODE_LABELS: Record<string, string> = {
  general: "通用",
  course_design: "课设",
};

export default function ConversationList({
  conversations,
  activeId,
  onCreate,
  onSelect,
  onDelete,
  onRename,
}: ConversationListProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (confirmDeleteId === id) {
      onDelete(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      // Auto-cancel after 3 seconds
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  }

  return (
    <div className="chat-sidebar">
      <div className="chat-sidebar__header">
        <span className="chat-sidebar__header-title">问AI</span>
        <button className="btn btn--sm btn--soft" onClick={onCreate}>
          新建对话
        </button>
      </div>
      <div className="chat-sidebar__list">
        {conversations.length === 0 ? (
          <div className="chat-sidebar__empty">
            暂无对话，点击上方按钮开始
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={`chat-sidebar__item${conv.id === activeId ? " chat-sidebar__item--active" : ""}`}
              onClick={() => onSelect(conv.id)}
            >
              <div className="chat-sidebar__item-title">{conv.title}</div>
              <div className="chat-sidebar__item-meta">
                <span className="badge badge--muted">
                  {MODE_LABELS[conv.mode] ?? conv.mode}
                </span>
                <span>{relativeTime(conv.updatedAt)}</span>
                <button
                  className="chat-sidebar__item-delete"
                  onClick={(e) => handleDelete(e, conv.id)}
                  title={confirmDeleteId === conv.id ? "再次点击确认删除" : "删除"}
                >
                  {confirmDeleteId === conv.id ? "确认?" : "\u2715"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
