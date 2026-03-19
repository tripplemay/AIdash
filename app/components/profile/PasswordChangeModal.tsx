"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";

interface PasswordChangeModalProps {
  onClose: () => void;
}

export default function PasswordChangeModal({ onClose }: PasswordChangeModalProps) {
  const { showToast } = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setError("");

    // Client-side validation
    if (!currentPassword) {
      setError("请输入当前密码");
      return;
    }
    if (newPassword.length < 6) {
      setError("新密码至少需要 6 个字符");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("两次输入的新密码不一致");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "修改密码失败");
      } else {
        showToast("密码修改成功", "success");
        onClose();
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3 className="modal__title">修改密码</h3>

        {error && (
          <div className="field-error" style={{ marginBottom: "var(--sp-4)" }}>
            {error}
          </div>
        )}

        <div className="modal__body" style={{ display: "grid", gap: "var(--sp-4)" }}>
          <div>
            <label className="field-label">当前密码 <span className="field-required">*</span></label>
            <input
              className="input input--sm"
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="请输入当前密码"
            />
          </div>

          <div>
            <label className="field-label">新密码 <span className="field-required">*</span></label>
            <input
              className="input input--sm"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="至少 6 个字符"
            />
          </div>

          <div>
            <label className="field-label">确认新密码 <span className="field-required">*</span></label>
            <input
              className="input input--sm"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="再次输入新密码"
            />
          </div>
        </div>

        <div className="modal__actions" style={{ marginTop: "var(--sp-6)" }}>
          <button className="btn btn--soft" onClick={onClose}>取消</button>
          <button className="btn" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "提交中..." : "确认修改"}
          </button>
        </div>
      </div>
    </div>
  );
}
