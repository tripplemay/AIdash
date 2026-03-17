"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/components/Toast";
import VersionHistoryPanel from "./VersionHistoryPanel";

interface Template {
  id: string;
  actionKey: string;
  actionLabel: string;
  content: string;
}

interface Variable {
  key: string;
  label: string;
  group: string;
}

interface Props {
  canEdit: boolean;
}

export default function PromptTemplateEditor({ canEdit }: Props) {
  const { showToast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [editSummary, setEditSummary] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/prompt-templates");
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error ?? "加载失败", "error");
        return;
      }
      const data: Template[] = json.data ?? [];
      setTemplates(data);
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].id);
        setContent(data[0].content);
      }
    } catch {
      showToast("加载失败", "error");
    }
  }, [showToast, selectedId]);

  useEffect(() => {
    fetchTemplates();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    async function loadVars() {
      try {
        const res = await fetch("/api/admin/prompt-templates/variables");
        const json = await res.json();
        if (res.ok) {
          setVariables(json.data ?? []);
        }
      } catch {
        /* silently ignore */
      }
    }
    loadVars();
  }, []);

  const selected = templates.find((t) => t.id === selectedId);

  function handleSelect(template: Template) {
    setSelectedId(template.id);
    setContent(template.content);
    setShowSaveInput(false);
    setEditSummary("");
  }

  function handleInsertVariable(key: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const insertion = `{{${key}}}`;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = content.slice(0, start);
    const after = content.slice(end);
    const newContent = before + insertion + after;
    setContent(newContent);

    const cursorPos = start + insertion.length;
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorPos, cursorPos);
    });
  }

  async function handleSave() {
    if (!showSaveInput) {
      setShowSaveInput(true);
      return;
    }
    if (!selectedId || !editSummary.trim()) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/prompt-templates/${selectedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, editSummary: editSummary.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error ?? "操作失败", "error");
        return;
      }
      showToast("保存成功");
      setTemplates((prev) =>
        prev.map((t) => (t.id === selectedId ? { ...t, content } : t))
      );
      setShowSaveInput(false);
      setEditSummary("");
    } catch {
      showToast("操作失败", "error");
    } finally {
      setSaving(false);
    }
  }

  const varGroups = variables.reduce<Record<string, Variable[]>>((acc, v) => {
    const group = v.group || "其他";
    return { ...acc, [group]: [...(acc[group] ?? []), v] };
  }, {});

  return (
    <div className="template-editor">
      <div className="template-editor__nav">
        {templates.map((t) => (
          <button
            key={t.id}
            className={`template-editor__nav-item${t.id === selectedId ? " template-editor__nav-item--active" : ""}`}
            onClick={() => handleSelect(t)}
          >
            {t.actionLabel}
          </button>
        ))}
      </div>

      <div className="template-editor__main">
        {selected ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--sp-3)" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>{selected.actionLabel}</h3>
              <button
                className="btn btn--soft btn--sm"
                onClick={() => setShowHistory(true)}
              >
                版本历史
              </button>
            </div>

            <textarea
              ref={textareaRef}
              className="input"
              rows={25}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              readOnly={!canEdit}
              style={{ width: "100%", fontFamily: "monospace", fontSize: 13, lineHeight: 1.6 }}
            />

            {canEdit && (
              <div style={{ marginTop: "var(--sp-3)" }}>
                {showSaveInput && (
                  <div style={{ marginBottom: "var(--sp-2)" }}>
                    <input
                      className="input input--sm"
                      placeholder="修改说明（必填）"
                      value={editSummary}
                      onChange={(e) => setEditSummary(e.target.value)}
                      style={{ width: "100%", maxWidth: 400 }}
                    />
                  </div>
                )}
                <div style={{ display: "flex", gap: "var(--sp-2)" }}>
                  <button
                    className="btn btn--sm"
                    onClick={handleSave}
                    disabled={saving || (showSaveInput && !editSummary.trim())}
                  >
                    {saving ? "保存中..." : "保存"}
                  </button>
                  {showSaveInput && (
                    <button
                      className="btn btn--soft btn--sm"
                      onClick={() => {
                        setShowSaveInput(false);
                        setEditSummary("");
                      }}
                    >
                      取消
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="muted" style={{ textAlign: "center", padding: "var(--sp-8) 0" }}>
            请从左侧选择模板
          </div>
        )}
      </div>

      <div className="template-editor__var-sidebar">
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: "var(--sp-3)", color: "var(--muted)" }}>
          可用变量
        </div>
        {Object.entries(varGroups).map(([group, vars]) => (
          <div key={group} className="template-editor__var-group">
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: "var(--sp-1)", fontWeight: 600 }}>
              {group}
            </div>
            {vars.map((v) => (
              <button
                key={v.key}
                className="template-editor__var-item"
                onClick={() => handleInsertVariable(v.key)}
                title={v.label}
              >
                {`{{${v.key}}}`}
              </button>
            ))}
          </div>
        ))}
      </div>

      {showHistory && selectedId && (
        <VersionHistoryPanel
          entityType="template"
          entityId={selectedId}
          onClose={() => {
            setShowHistory(false);
            fetchTemplates();
          }}
        />
      )}
    </div>
  );
}
