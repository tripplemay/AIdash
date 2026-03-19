"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/Toast";

interface Department {
  id: string;
  name: string;
  _count?: { users: number };
}

interface DepartmentManagerProps {
  onClose: () => void;
}

export default function DepartmentManager({ onClose }: DepartmentManagerProps) {
  const { showToast } = useToast();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function fetchDepartments() {
    try {
      const res = await fetch("/api/admin/departments");
      const json = await res.json();
      const data = json.data ?? json;
      setDepartments(Array.isArray(data) ? data : []);
    } catch {
      showToast("加载部门列表失败", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDepartments();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAdd() {
    if (!newName.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error ?? "添加失败", "error");
      } else {
        setNewName("");
        showToast("部门已添加", "success");
        fetchDepartments();
      }
    } catch {
      showToast("网络错误", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(id: string) {
    if (!editingName.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/departments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingName.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error ?? "更新失败", "error");
      } else {
        setEditingId(null);
        showToast("部门已更新", "success");
        fetchDepartments();
      }
    } catch {
      showToast("网络错误", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string, deptName: string) {
    if (!confirm(`确认删除部门「${deptName}」？`)) return;
    try {
      const res = await fetch(`/api/admin/departments/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error ?? "删除失败", "error");
      } else {
        showToast("部门已删除", "success");
        fetchDepartments();
      }
    } catch {
      showToast("网络错误", "error");
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <h3 className="modal__title">部门管理</h3>

        <div className="modal__body">
          {loading ? (
            <p style={{ color: "var(--muted)", textAlign: "center" }}>加载中...</p>
          ) : (
            <div style={{ display: "grid", gap: "var(--sp-2)" }}>
              {departments.map(dept => (
                <div key={dept.id} className="dept-mgr__item">
                  {editingId === dept.id ? (
                    <div style={{ display: "flex", gap: "var(--sp-2)", flex: 1 }}>
                      <input
                        className="input input--sm"
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        style={{ flex: 1 }}
                        onKeyDown={e => { if (e.key === "Enter") handleUpdate(dept.id); }}
                      />
                      <button className="btn btn--sm" onClick={() => handleUpdate(dept.id)} disabled={submitting}>
                        保存
                      </button>
                      <button className="btn btn--sm btn--soft" onClick={() => setEditingId(null)}>
                        取消
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="dept-mgr__name">{dept.name}</span>
                      {dept._count && (
                        <span className="dept-mgr__count">{dept._count.users} 人</span>
                      )}
                      <div className="dept-mgr__actions">
                        <button
                          className="btn btn--xs btn--soft"
                          onClick={() => { setEditingId(dept.id); setEditingName(dept.name); }}
                        >
                          编辑
                        </button>
                        <button
                          className="btn btn--xs btn--soft"
                          style={{ borderColor: "var(--danger-border)", color: "var(--danger)" }}
                          onClick={() => handleDelete(dept.id, dept.name)}
                        >
                          删除
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {departments.length === 0 && (
                <p style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "var(--sp-4)" }}>
                  暂无部门
                </p>
              )}
            </div>
          )}

          {/* Add new department */}
          <div style={{ display: "flex", gap: "var(--sp-2)", marginTop: "var(--sp-4)" }}>
            <input
              className="input input--sm"
              placeholder="新部门名称"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              style={{ flex: 1 }}
              onKeyDown={e => { if (e.key === "Enter") handleAdd(); }}
            />
            <button className="btn btn--sm" onClick={handleAdd} disabled={submitting || !newName.trim()}>
              添加
            </button>
          </div>
        </div>

        <div className="modal__actions" style={{ marginTop: "var(--sp-6)" }}>
          <button className="btn btn--soft" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
}
