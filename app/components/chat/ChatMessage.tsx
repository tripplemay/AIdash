"use client";

import { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Source {
  title: string;
  url: string;
}

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  isStreaming?: boolean;
  isSearching?: boolean;
  sources?: Source[];
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

/** Strip hidden sources comment from content and extract sources */
const SOURCES_COMMENT_RE = /\n?\n?<!-- sources::(\[.*\]) -->\s*$/;

function extractSourcesFromContent(content: string): { cleanContent: string; embeddedSources: Source[] } {
  const match = content.match(SOURCES_COMMENT_RE);
  if (!match) return { cleanContent: content, embeddedSources: [] };

  try {
    const parsed = JSON.parse(match[1]);
    return {
      cleanContent: content.replace(SOURCES_COMMENT_RE, ""),
      embeddedSources: Array.isArray(parsed) ? parsed : [],
    };
  } catch {
    return { cleanContent: content, embeddedSources: [] };
  }
}

export default function ChatMessage({ role, content, createdAt, isStreaming, isSearching, sources }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);

  // Extract embedded sources from persisted content (for messages loaded from DB)
  const { cleanContent, embeddedSources } = useMemo(
    () => extractSourcesFromContent(content),
    [content]
  );

  // Use prop sources (from live SSE) or embedded sources (from DB)
  const displaySources = sources && sources.length > 0 ? sources : embeddedSources;

  function handleCopy() {
    navigator.clipboard.writeText(cleanContent).then(() => {
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
            <>
              {isSearching && (
                <div className="chat-message__searching">
                  <span className="chat-message__searching-dot" />
                  正在搜索网络...
                </div>
              )}
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{cleanContent}</ReactMarkdown>
            </>
          ) : (
            <span style={{ whiteSpace: "pre-wrap" }}>{content}</span>
          )}
        </div>

        {/* Source links */}
        {isAssistant && displaySources.length > 0 && !isStreaming && (
          <div className="chat-message__sources">
            <div className="chat-message__sources-title">来源</div>
            {displaySources.map((src, i) => (
              <a
                key={i}
                className="chat-message__source-item"
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="chat-message__source-num">[{i + 1}]</span>
                <span className="chat-message__source-text">{src.title || src.url}</span>
              </a>
            ))}
          </div>
        )}

        {isAssistant && cleanContent && !isStreaming && (
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
