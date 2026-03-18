"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  isStreaming?: boolean;
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

export default function ChatMessage({ role, content, createdAt, isStreaming }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const isAssistant = role === "assistant";
  const showStreamingDot = isAssistant && isStreaming && !content;

  return (
    <div className={`chat-message chat-message--${role}`}>
      <div>
        <div className={`chat-message__bubble chat-message__bubble--${role}`}>
          {showStreamingDot ? (
            <span className="chat-message__streaming-dot" />
          ) : isAssistant ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          ) : (
            <span style={{ whiteSpace: "pre-wrap" }}>{content}</span>
          )}
        </div>
        {isAssistant && content && !isStreaming && (
          <button
            className="chat-message__copy"
            onClick={handleCopy}
            title="复制"
          >
            {copied ? "已复制" : "复制"}
          </button>
        )}
        {createdAt && (
          <div className={`chat-message__time`}>{formatTime(createdAt)}</div>
        )}
      </div>
    </div>
  );
}
