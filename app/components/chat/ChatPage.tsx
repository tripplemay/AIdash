"use client";

import { useState, useEffect, useCallback } from "react";
import { SetTopBar } from "@/components/TopBarContext";
import { useToast } from "@/components/Toast";
import ConversationList from "./ConversationList";
import ChatArea from "./ChatArea";
import NewChatDialog from "./NewChatDialog";

interface Conversation {
  id: string;
  title: string;
  mode: string;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
}

export default function ChatPage() {
  const { showToast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);

  const activeConversation = conversations.find((c) => c.id === activeConversationId) ?? null;

  // Load conversations on mount
  useEffect(() => {
    fetch("/api/chat/conversations")
      .then((r) => r.json())
      .then((json) => {
        if (json.data && Array.isArray(json.data)) {
          setConversations(json.data);
        }
      })
      .catch(() => {
        showToast("加载对话列表失败", "error");
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectConversation = useCallback(
    (id: string) => {
      setActiveConversationId(id);
      setMessages([]);
      fetch(`/api/chat/conversations/${id}`)
        .then((r) => r.json())
        .then((json) => {
          if (json.data?.messages && Array.isArray(json.data.messages)) {
            setMessages(json.data.messages);
          }
        })
        .catch(() => {
          showToast("加载对话消息失败", "error");
        });
    },
    [showToast]
  );

  const createConversation = useCallback(
    (mode: string) => {
      setShowNewDialog(false);
      fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      })
        .then((r) => r.json())
        .then((json) => {
          const data = json.data ?? json;
          const newConv: Conversation = {
            id: data.id,
            title: data.title ?? "新对话",
            mode: data.mode ?? mode,
            createdAt: data.createdAt ?? new Date().toISOString(),
            updatedAt: data.updatedAt ?? new Date().toISOString(),
          };
          setConversations((prev) => [newConv, ...prev]);
          setActiveConversationId(newConv.id);
          setMessages([]);
        })
        .catch(() => {
          showToast("创建对话失败", "error");
        });
    },
    [showToast]
  );

  const deleteConversation = useCallback(
    (id: string) => {
      fetch(`/api/chat/conversations/${id}`, { method: "DELETE" }).catch(() => {});
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        setActiveConversationId(null);
        setMessages([]);
      }
    },
    [activeConversationId]
  );

  const renameConversation = useCallback((id: string, title: string) => {
    fetch(`/api/chat/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    }).catch(() => {});
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c))
    );
  }, []);

  const sendMessage = useCallback(
    (content: string) => {
      if (!activeConversationId || isStreaming) return;

      const userMsg: Message = {
        id: `tmp-user-${Date.now()}`,
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      };
      const assistantMsg: Message = {
        id: `tmp-assistant-${Date.now()}`,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      fetch(`/api/chat/conversations/${activeConversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Request failed");
          }
          const reader = response.body?.getReader();
          if (!reader) throw new Error("No reader");

          const decoder = new TextDecoder();
          let buffer = "";

          function processStream(): Promise<void> {
            return reader!.read().then(({ done, value }) => {
              if (done) {
                setIsStreaming(false);
                return;
              }

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() ?? "";

              for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                const jsonStr = line.slice(6).trim();
                if (!jsonStr) continue;

                try {
                  const event = JSON.parse(jsonStr);

                  if (event.type === "delta") {
                    setMessages((prev) => {
                      const updated = [...prev];
                      const last = updated[updated.length - 1];
                      if (last && last.role === "assistant") {
                        updated[updated.length - 1] = {
                          ...last,
                          content: last.content + (event.text ?? ""),
                        };
                      }
                      return updated;
                    });
                  } else if (event.type === "title") {
                    setConversations((prev) =>
                      prev.map((c) =>
                        c.id === activeConversationId
                          ? { ...c, title: event.title }
                          : c
                      )
                    );
                  } else if (event.type === "done") {
                    setIsStreaming(false);
                    // Update message IDs from server
                    if (event.userMessageId) {
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === userMsg.id ? { ...m, id: event.userMessageId } : m
                        )
                      );
                    }
                    if (event.assistantMessageId) {
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === assistantMsg.id
                            ? { ...m, id: event.assistantMessageId }
                            : m
                        )
                      );
                    }
                  } else if (event.type === "error") {
                    showToast(event.message ?? "AI 响应出错", "error");
                    setIsStreaming(false);
                  }
                } catch {
                  // Ignore invalid JSON
                }
              }

              return processStream();
            });
          }

          return processStream();
        })
        .catch(() => {
          showToast("发送消息失败", "error");
          setIsStreaming(false);
        });
    },
    [activeConversationId, isStreaming, showToast]
  );

  return (
    <>
      <SetTopBar title="问AI" />
      <div className="chat-page">
        <ConversationList
          conversations={conversations}
          activeId={activeConversationId}
          onCreate={() => setShowNewDialog(true)}
          onSelect={selectConversation}
          onDelete={deleteConversation}
          onRename={renameConversation}
        />
        <ChatArea
          messages={messages}
          isStreaming={isStreaming}
          onSendMessage={sendMessage}
          conversationMode={activeConversation?.mode ?? null}
        />
      </div>
      {showNewDialog && (
        <NewChatDialog
          onSelect={createConversation}
          onClose={() => setShowNewDialog(false)}
        />
      )}
    </>
  );
}
