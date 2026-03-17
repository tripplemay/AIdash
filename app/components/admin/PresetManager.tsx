"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/Toast";
import { ChevronUp, ChevronDown } from "lucide-react";
import { ConfirmModal } from "@/components/course-rnd/CourseRndModal";

interface Preset {
  id: string;
  category: string;
  name: string;
  value: string;
  sortOrder: number;
}

const CATEGORIES = [
  { key: "course_direction", label: "课程方向" },
  { key: "image_style", label: "图片风格" },
  { key: "image_composition", label: "图片构图引导" },
  { key: "core_needs_tag", label: "核心诉求标签" },
  { key: "constraints_tag", label: "补充约束标签" },
] as const;

interface Props {
  canEdit: boolean;
}

export default function PresetManager({ canEdit }: Props) {
  const { showToast } = useToast();
  const [activeCategory, setActiveCategory] = useState<string>(CATEGORIES[0].key);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", value: "" });
  const [addingNew, setAddingNew] = useState(false);
  const [newForm, setNewForm] = useState({ name: "", value: "" });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchPresets = useCallback(async (category: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/presets?category=${category}`);
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error ?? "加载失败", "error");
        return;
      }
      setPresets(json.data ?? []);
    } catch {
      showToast("加载失败", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchPresets(activeCategory);
    setEditingId(null);
    setAddingNew(false);
  }, [activeCategory, fetchPresets]);

  function startEdit(preset: Preset) {
    setEditingId(preset.id);
    setEditForm({ name: preset.name, value: preset.value });
    setAddingNew(false);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({ name: "", value: "" });
  }

  async function handleSaveEdit() {
    if (!editingId || !editForm.name.trim()) return;

    setSavingId(editingId);
    try {
      const res = await fetch(`/api/admin/presets/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editForm.name.trim(), value: editForm.value.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error ?? "操作失败", "error");
        return;
      }
      showToast("保存成功");
      setPresets((prev) =>
        prev.map((p) =>
          p.id === editingId ? { ...p, name: editForm.name.trim(), value: editForm.value.trim() } : p
        )
      );
      setEditingId(null);
    } catch {
      showToast("操作失败", "error");
    } finally {
      setSavingId(null);
    }
  }

  async function handleAdd() {
    if (!newForm.name.trim()) return;

    setSavingId("new");
    try {
      const res = await fetch("/api/admin/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: activeCategory,
          name: newForm.name.trim(),
          value: newForm.value.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error ?? "操作失败", "error");
        return;
      }
      showToast("新增成功");
      setPresets((prev) => [...prev, json.data]);
      setAddingNew(false);
      setNewForm({ name: "", value: "" });
    } catch {
      showToast("操作失败", "error");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/admin/presets/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error ?? "操作失败", "error");
        return;
      }
      showToast("已删除");
      setPresets((prev) => prev.filter((p) => p.id !== id));
      setConfirmDeleteId(null);
    } catch {
      showToast("操作失败", "error");
    }
  }

  async function handleMove(index: number, direction: "up" | "down") {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= presets.length) return;

    const reordered = [...presets];
    const temp = reordered[index];
    reordered[index] = reordered[swapIndex];
    reordered[swapIndex] = temp;
    setPresets(reordered);

    try {
      const res = await fetch("/api/admin/presets/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: reordered.map((p) => p.id) }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error ?? "操作失败", "error");
        await fetchPresets(activeCategory);
      }
    } catch {
      showToast("操作失败", "error");
      await fetchPresets(activeCategory);
    }
  }

  return (
    <div>
      <div className="prompt-config__tabs">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            className={`prompt-config__tab${cat.key === activeCategory ? " prompt-config__tab--active" : ""}`}
            onClick={() => setActiveCategory(cat.key)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="muted editor-empty">
          加载中...
        </div>
      )}

      {!loading && (
        <div className="preset-mgr__list">
          {presets.length === 0 && !addingNew && (
            <div className="muted editor-empty">
              暂无预设项
            </div>
          )}

          {presets.map((preset, index) => (
            <div key={preset.id} className="preset-mgr__item">
              {editingId === preset.id ? (
                <div className="preset-mgr__form">
                  <input
                    className="input input--sm preset-mgr__form-input"
                    placeholder="名称"
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  />
                  <textarea
                    className="input input--sm preset-mgr__form-input"
                    placeholder="值（可选）"
                    rows={3}
                    value={editForm.value}
                    onChange={(e) => setEditForm((f) => ({ ...f, value: e.target.value }))}
                  />
                  <div className="editor-footer__btn-group">
                    <button
                      className="btn btn--sm"
                      onClick={handleSaveEdit}
                      disabled={savingId === preset.id || !editForm.name.trim()}
                    >
                      {savingId === preset.id ? "保存中..." : "保存"}
                    </button>
                    <button className="btn btn--soft btn--sm" onClick={cancelEdit}>
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="preset-mgr__item-content">
                    <div className="preset-mgr__item-name">{preset.name}</div>
                    {preset.value && (
                      <div className="preset-mgr__item-value">{preset.value}</div>
                    )}
                  </div>

                  {canEdit && (
                    <div className="preset-mgr__item-controls">
                      <button
                        className="btn btn--soft btn--xs"
                        onClick={() => handleMove(index, "up")}
                        disabled={index === 0}
                        title="上移"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        className="btn btn--soft btn--xs"
                        onClick={() => handleMove(index, "down")}
                        disabled={index === presets.length - 1}
                        title="下移"
                      >
                        <ChevronDown size={14} />
                      </button>
                      <button
                        className="btn btn--soft btn--xs"
                        onClick={() => startEdit(preset)}
                      >
                        编辑
                      </button>
                      <button
                        className="btn btn--danger btn--xs"
                        onClick={() => setConfirmDeleteId(preset.id)}
                      >
                        删除
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}

          {addingNew && (
            <div className="preset-mgr__item preset-mgr__item--new">
              <div className="preset-mgr__form">
                <input
                  className="input input--sm preset-mgr__form-input"
                  placeholder="名称"
                  value={newForm.name}
                  onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))}
                />
                <textarea
                  className="input input--sm preset-mgr__form-input"
                  placeholder="值（可选）"
                  rows={3}
                  value={newForm.value}
                  onChange={(e) => setNewForm((f) => ({ ...f, value: e.target.value }))}
                />
                <div className="editor-footer__btn-group">
                  <button
                    className="btn btn--sm"
                    onClick={handleAdd}
                    disabled={savingId === "new" || !newForm.name.trim()}
                  >
                    {savingId === "new" ? "保存中..." : "保存"}
                  </button>
                  <button
                    className="btn btn--soft btn--sm"
                    onClick={() => {
                      setAddingNew(false);
                      setNewForm({ name: "", value: "" });
                    }}
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {canEdit && !addingNew && (
        <div className="preset-mgr__add-bar">
          <button
            className="btn btn--soft btn--sm"
            onClick={() => {
              setAddingNew(true);
              setEditingId(null);
            }}
          >
            + 新增
          </button>
        </div>
      )}

      {confirmDeleteId && (
        <ConfirmModal
          title="确认删除"
          message="确定要删除此预设项吗？此操作不可撤销。"
          confirmLabel="删除"
          danger
          onConfirm={() => handleDelete(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}
