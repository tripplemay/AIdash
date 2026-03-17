"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/Toast";
import { ConfirmModal } from "@/components/course-rnd/CourseRndModal";
import VersionHistoryPanel from "./VersionHistoryPanel";

interface Baseline {
  id: string;
  type: string;
  label: string;
  content: string;
}

const TYPE_ORDER = ["general", "age", "level", "org_form", "deliverable", "matrix"] as const;
const TYPE_LABELS: Record<string, string> = {
  general: "通用",
  age: "年龄段",
  level: "难度",
  org_form: "组织形态",
  deliverable: "产出物",
  matrix: "矩阵",
};

interface Props {
  canEdit: boolean;
}

export default function BaselineManager({ canEdit }: Props) {
  const { showToast } = useToast();
  const [baselines, setBaselines] = useState<Baseline[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [editSummary, setEditSummary] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const fetchBaselines = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/baselines");
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error ?? "加载失败", "error");
        return;
      }
      const data: Baseline[] = json.data ?? [];
      setBaselines(data);
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].id);
        setContent(data[0].content);
      }
    } catch {
      showToast("加载失败", "error");
    }
  }, [showToast, selectedId]);

  useEffect(() => {
    fetchBaselines();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = baselines.find((b) => b.id === selectedId);

  function handleSelect(baseline: Baseline) {
    setSelectedId(baseline.id);
    setContent(baseline.content);
  }

  async function handleSave() {
    if (!selectedId || !editSummary.trim()) return;

    setSaving(true);
    setShowSaveConfirm(false);
    try {
      const res = await fetch(`/api/admin/baselines/${selectedId}`, {
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
      setBaselines((prev) =>
        prev.map((b) => (b.id === selectedId ? { ...b, content } : b))
      );
      setEditSummary("");
    } catch {
      showToast("操作失败", "error");
    } finally {
      setSaving(false);
    }
  }

  const grouped = TYPE_ORDER.map((type) => ({
    type,
    label: TYPE_LABELS[type] ?? type,
    items: baselines.filter((b) => b.type === type),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="baseline-mgr">
      <div className="baseline-mgr__sidebar">
        {grouped.map((group) => (
          <div key={group.type} className="baseline-mgr__type-group">
            <div className="baseline-mgr__type-label">{group.label}</div>
            {group.items.map((item) => (
              <button
                key={item.id}
                className={`baseline-mgr__item${item.id === selectedId ? " baseline-mgr__item--active" : ""}`}
                onClick={() => handleSelect(item)}
              >
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="baseline-mgr__content">
        {selected ? (
          <>
            <div className="editor-header">
              <h3 className="editor-header__title">{selected.label}</h3>
              <button
                className="btn btn--soft btn--sm"
                onClick={() => setShowHistory(true)}
              >
                版本历史
              </button>
            </div>

            <textarea
              className="input baseline-mgr__editor"
              rows={20}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              readOnly={!canEdit}
            />

            {canEdit && (
              <div className="editor-footer">
                <div className="editor-footer__btn-group">
                  <button
                    className="btn btn--sm"
                    onClick={() => setShowSaveConfirm(true)}
                    disabled={saving}
                  >
                    {saving ? "保存中..." : "保存"}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="muted editor-empty">
            请从左侧选择基线项
          </div>
        )}
      </div>

      {showSaveConfirm && (
        <div className="modal-overlay" onClick={() => setShowSaveConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal__title">保存基线</h3>
            <div className="modal__body">
              <input
                className="input"
                placeholder="修改说明（必填）"
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                autoFocus
              />
            </div>
            <div className="modal__actions">
              <button className="btn btn--soft" onClick={() => setShowSaveConfirm(false)}>取消</button>
              <button
                className="btn"
                onClick={handleSave}
                disabled={!editSummary.trim()}
              >
                确认保存
              </button>
            </div>
          </div>
        </div>
      )}

      {showHistory && selectedId && (
        <VersionHistoryPanel
          entityType="baseline"
          entityId={selectedId}
          onClose={() => {
            setShowHistory(false);
            fetchBaselines();
          }}
        />
      )}
    </div>
  );
}
