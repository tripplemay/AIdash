"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/Toast";

interface InviteCode {
  id: string;
  code: string;
  maxUses: number;
  usedCount: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  createdBy: { name: string } | null;
}

interface InviteCodeManagerProps {
  onClose: () => void;
}

export default function InviteCodeManager({ onClose }: InviteCodeManagerProps) {
  const { showToast } = useToast();

  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showGenForm, setShowGenForm] = useState(false);
  const [maxUses, setMaxUses] = useState(10);
  const [expiresInDays, setExpiresInDays] = useState(30);

  async function fetchCodes() {
    try {
      const res = await fetch("/api/admin/invites");
      const json = await res.json();
      const data = json.data ?? json;
      setCodes(Array.isArray(data) ? data : []);
    } catch {
      showToast("加载邀请码失败", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCodes();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxUses, expiresInDays }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error ?? "生成失败", "error");
      } else {
        showToast("邀请码已生成", "success");
        setShowGenForm(false);
        fetchCodes();
      }
    } catch {
      showToast("网络错误", "error");
    } finally {
      setGenerating(false);
    }
  }

  async function handleToggle(id: string, isActive: boolean) {
    try {
      const res = await fetch(`/api/admin/invites/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (!res.ok) {
        const json = await res.json();
        showToast(json.error ?? "操作失败", "error");
      } else {
        fetchCodes();
      }
    } catch {
      showToast("网络错误", "error");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("确认删除此邀请码？")) return;
    try {
      const res = await fetch(`/api/admin/invites/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        showToast(json.error ?? "删除失败", "error");
      } else {
        showToast("邀请码已删除", "success");
        fetchCodes();
      }
    } catch {
      showToast("网络错误", "error");
    }
  }

  function copyToClipboard(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      showToast("已复制到剪贴板", "success");
    }).catch(() => {
      showToast("复制失败", "error");
    });
  }

  function getStatus(code: InviteCode): { text: string; cls: string } {
    if (!code.isActive) return { text: "已禁用", cls: "muted" };
    if (code.expiresAt && new Date(code.expiresAt) < new Date()) return { text: "已过期", cls: "muted" };
    if (code.usedCount >= code.maxUses) return { text: "已用完", cls: "muted" };
    return { text: "有效", cls: "green" };
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <h3 className="modal__title">邀请码管理</h3>

        <div className="modal__body">
          {/* Generate form */}
          {showGenForm ? (
            <div className="invite-mgr__gen-form">
              <div style={{ display: "flex", gap: "var(--sp-3)", alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <label className="field-label">最大使用次数</label>
                  <input
                    className="input input--sm"
                    type="number"
                    min={1}
                    value={maxUses}
                    onChange={e => setMaxUses(Number(e.target.value))}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="field-label">有效期</label>
                  <select className="select" value={expiresInDays} onChange={e => setExpiresInDays(Number(e.target.value))}>
                    <option value={7}>7 天</option>
                    <option value={30}>30 天</option>
                    <option value={90}>90 天</option>
                  </select>
                </div>
                <button className="btn btn--sm" onClick={handleGenerate} disabled={generating}>
                  {generating ? "生成中..." : "生成"}
                </button>
                <button className="btn btn--sm btn--soft" onClick={() => setShowGenForm(false)}>
                  取消
                </button>
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: "var(--sp-3)" }}>
              <button className="btn btn--sm" onClick={() => setShowGenForm(true)}>
                生成邀请码
              </button>
            </div>
          )}

          {/* Code list */}
          {loading ? (
            <p style={{ color: "var(--muted)", textAlign: "center" }}>加载中...</p>
          ) : codes.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "var(--sp-4)" }}>
              暂无邀请码
            </p>
          ) : (
            <div className="invite-mgr__list">
              {codes.map(code => {
                const status = getStatus(code);
                return (
                  <div key={code.id} className="invite-mgr__item">
                    <div className="invite-mgr__item-main">
                      <span className="invite-mgr__code">{code.code}</span>
                      <button
                        className="btn btn--xs btn--soft"
                        onClick={() => copyToClipboard(code.code)}
                        title="复制"
                      >
                        复制
                      </button>
                    </div>
                    <div className="invite-mgr__item-meta">
                      <span style={{ color: status.cls === "green" ? "var(--green)" : "var(--muted)" }}>
                        {status.text}
                      </span>
                      <span className="muted">
                        {code.usedCount}/{code.maxUses} 次
                      </span>
                      {code.expiresAt && (
                        <span className="muted">
                          {new Date(code.expiresAt).toLocaleDateString("zh-CN")} 到期
                        </span>
                      )}
                    </div>
                    <div className="invite-mgr__item-actions">
                      <button
                        className="btn btn--xs btn--soft"
                        onClick={() => handleToggle(code.id, code.isActive)}
                      >
                        {code.isActive ? "禁用" : "启用"}
                      </button>
                      <button
                        className="btn btn--xs btn--soft"
                        style={{ borderColor: "var(--danger-border)", color: "var(--danger)" }}
                        onClick={() => handleDelete(code.id)}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal__actions" style={{ marginTop: "var(--sp-6)" }}>
          <button className="btn btn--soft" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
}
