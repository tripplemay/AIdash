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

/** 已知类别的排序权重和中文标签，未知类别追加到末尾 */
const CATEGORY_META: Record<string, { order: number; label: string }> = {
  course_direction: { order: 0, label: "课程方向" },
  image_style: { order: 1, label: "图片风格" },
  image_composition: { order: 2, label: "图片构图引导" },
  core_needs_tag: { order: 3, label: "核心诉求标签" },
  constraints_tag: { order: 4, label: "补充约束标签" },
  slideshow_theme: { order: 5, label: "课件主题" },
  slideshow_layout: { order: 6, label: "课件版式" },
  ai_action_registry: { order: 7, label: "动作注册表" },
};

interface Props {
  canEdit: boolean;
}

export default function PresetManager({ canEdit }: Props) {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Array<{ key: string; label: string }>>([]);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", value: "" });
  const [saving, setSaving] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [newForm, setNewForm] = useState({ name: "", value: "" });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  const fetchPresets = useCallback(async (category: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/presets?category=${category}`);
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error ?? "加载失败", "error");
        return;
      }
      const data: Preset[] = json.data ?? [];
      setPresets(data);
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].id);
        setEditForm({ name: data[0].name, value: data[0].value });
      }
    } catch {
      showToast("加载失败", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast, selectedId]);

  // Load distinct categories from DB on mount
  useEffect(() => {
    fetch("/api/admin/presets")
      .then((r) => r.json())
      .then((json) => {
        const allPresets: Preset[] = json.data ?? [];
        const catSet = new Set(allPresets.map((p) => p.category));
        const cats = [...catSet]
          .sort((a, b) => (CATEGORY_META[a]?.order ?? 999) - (CATEGORY_META[b]?.order ?? 999))
          .map((key) => ({ key, label: CATEGORY_META[key]?.label ?? key }));
        setCategories(cats);
        if (cats.length > 0 && !activeCategory) {
          setActiveCategory(cats[0].key);
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!activeCategory) return;
    setSelectedId(null);
    setAddingNew(false);
    fetchPresets(activeCategory);
  }, [activeCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSelect(preset: Preset) {
    setSelectedId(preset.id);
    setEditForm({ name: preset.name, value: preset.value });
    setAddingNew(false);
  }

  async function handleSave() {
    if (!selectedId || !editForm.name.trim()) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/presets/${selectedId}`, {
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
          p.id === selectedId ? { ...p, name: editForm.name.trim(), value: editForm.value.trim() } : p
        )
      );
    } catch {
      showToast("操作失败", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleAdd() {
    if (!newForm.name.trim()) return;

    setSaving(true);
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
      const created: Preset = json.data;
      setPresets((prev) => [...prev, created]);
      setSelectedId(created.id);
      setEditForm({ name: created.name, value: created.value });
      setAddingNew(false);
      setNewForm({ name: "", value: "" });
    } catch {
      showToast("操作失败", "error");
    } finally {
      setSaving(false);
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
      const remaining = presets.filter((p) => p.id !== id);
      setPresets(remaining);
      setConfirmDeleteId(null);
      if (selectedId === id) {
        if (remaining.length > 0) {
          setSelectedId(remaining[0].id);
          setEditForm({ name: remaining[0].name, value: remaining[0].value });
        } else {
          setSelectedId(null);
        }
      }
    } catch {
      showToast("操作失败", "error");
    }
  }

  async function handleMove(index: number, direction: "up" | "down") {
    if (reordering) return;
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= presets.length) return;

    const reordered = [...presets];
    const temp = reordered[index];
    reordered[index] = reordered[swapIndex];
    reordered[swapIndex] = temp;
    setPresets(reordered);
    setReordering(true);

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
    } finally {
      setReordering(false);
    }
  }

  const selected = presets.find((p) => p.id === selectedId);
  const categoryLabel = categories.find((c) => c.key === activeCategory)?.label ?? "";

  return (
    <div className="baseline-mgr">
      {/* 左侧：分类 + 预设项列表 */}
      <div className="baseline-mgr__sidebar">
        {categories.map((cat) => (
          <div key={cat.key} className="baseline-mgr__type-group">
            <div
              className="baseline-mgr__type-label"
              style={{ cursor: "pointer" }}
              onClick={() => setActiveCategory(cat.key)}
            >
              {cat.label}
            </div>
            {activeCategory === cat.key && presets.map((preset, index) => (
              <div key={preset.id} className="preset-mgr__sidebar-item">
                <button
                  className={`baseline-mgr__item${preset.id === selectedId ? " baseline-mgr__item--active" : ""}`}
                  onClick={() => handleSelect(preset)}
                  style={{ flex: 1 }}
                >
                  {preset.name}
                </button>
                {canEdit && (
                  <div className="preset-mgr__sort-btns">
                    <button
                      className="btn btn--ghost btn--xs"
                      onClick={() => handleMove(index, "up")}
                      disabled={index === 0 || reordering}
                      title="上移"
                    >
                      <ChevronUp size={12} />
                    </button>
                    <button
                      className="btn btn--ghost btn--xs"
                      onClick={() => handleMove(index, "down")}
                      disabled={index === presets.length - 1 || reordering}
                      title="下移"
                    >
                      <ChevronDown size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))}
            {activeCategory === cat.key && canEdit && (
              <button
                className="baseline-mgr__item"
                style={{ color: "var(--brand)", fontSize: 12 }}
                onClick={() => {
                  setActiveCategory(cat.key);
                  setAddingNew(true);
                  setSelectedId(null);
                  setNewForm({ name: "", value: "" });
                }}
              >
                + 新增
              </button>
            )}
          </div>
        ))}
      </div>

      {/* 右侧：编辑区 */}
      <div className="baseline-mgr__content">
        {addingNew ? (
          <>
            <div className="editor-header">
              <h3 className="editor-header__title">新增{categoryLabel}预设</h3>
            </div>

            <div style={{ marginBottom: "var(--sp-3)" }}>
              <label className="field-label">名称</label>
              <input
                className="input"
                value={newForm.name}
                onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="输入预设名称"
              />
            </div>

            <div style={{ marginBottom: "var(--sp-3)" }}>
              <label className="field-label">值（可选）</label>
              <textarea
                className="input baseline-mgr__editor"
                rows={8}
                value={newForm.value}
                onChange={(e) => setNewForm((f) => ({ ...f, value: e.target.value }))}
                placeholder="输入预设值"
              />
            </div>

            <div className="editor-footer__btn-group">
              <button
                className="btn btn--sm"
                onClick={handleAdd}
                disabled={saving || !newForm.name.trim()}
              >
                {saving ? "保存中..." : "保存"}
              </button>
              <button
                className="btn btn--soft btn--sm"
                onClick={() => {
                  setAddingNew(false);
                  if (presets.length > 0) {
                    setSelectedId(presets[0].id);
                    setEditForm({ name: presets[0].name, value: presets[0].value });
                  }
                }}
              >
                取消
              </button>
            </div>
          </>
        ) : selected ? (
          <>
            <div className="editor-header">
              <h3 className="editor-header__title">{selected.name}</h3>
              {canEdit && (
                <button
                  className="btn btn--soft btn--sm btn--danger"
                  onClick={() => setConfirmDeleteId(selected.id)}
                >
                  删除
                </button>
              )}
            </div>

            <div style={{ marginBottom: "var(--sp-3)" }}>
              <label className="field-label">名称</label>
              <input
                className="input"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                readOnly={!canEdit}
              />
            </div>

            <div style={{ marginBottom: "var(--sp-3)" }}>
              <label className="field-label">值（可选）</label>
              <textarea
                className="input baseline-mgr__editor"
                rows={8}
                value={editForm.value}
                onChange={(e) => setEditForm((f) => ({ ...f, value: e.target.value }))}
                readOnly={!canEdit}
              />
            </div>

            {canEdit && (
              <div className="editor-footer">
                <div className="editor-footer__btn-group">
                  <button
                    className="btn btn--sm"
                    onClick={handleSave}
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
            请从左侧选择预设项
          </div>
        )}
      </div>

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
