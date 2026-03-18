"use client";

import { useRef, useEffect, useState, useCallback, type KeyboardEvent, type ChangeEvent } from "react";
import ChatMessage from "./ChatMessage";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
}

interface ChatAreaProps {
  messages: Message[];
  isStreaming: boolean;
  onSendMessage: (content: string) => void;
  conversationMode?: string | null;
}

export default function ChatArea({ messages, isStreaming, onSendMessage, conversationMode }: ChatAreaProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, []);

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    adjustHeight();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    onSendMessage(trimmed);
    setInput("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  if (!conversationMode) {
    return (
      <div className="chat-area">
        <div className="chat-area__empty">
          选择或创建一个对话开始
        </div>
      </div>
    );
  }

  return (
    <div className="chat-area">
      <div className="chat-area__messages">
        {messages.map((msg, i) => (
          <ChatMessage
            key={msg.id}
            role={msg.role}
            content={msg.content}
            createdAt={msg.createdAt}
            isStreaming={isStreaming && i === messages.length - 1 && msg.role === "assistant"}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-area__input-bar">
        <textarea
          ref={textareaRef}
          className="chat-area__input"
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="输入消息...（Shift+Enter 换行）"
          disabled={isStreaming}
          rows={1}
        />
        <button
          className="btn btn--sm"
          onClick={handleSend}
          disabled={isStreaming || !input.trim()}
        >
          发送
        </button>
      </div>
    </div>
  );
}
