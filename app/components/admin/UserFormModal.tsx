"use client";

import { useState } from "react";

interface UserRow {
  id: string;
  username: string;
  name: string;
  role: string;
}

type ModalMode =
  | { type: "create" }
  | { type: "edit"; user: UserRow }
  | { type: "resetPassword"; user: UserRow };

interface Props {
  mode: ModalMode;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UserFormModal({ mode, onClose, onSuccess }: Props) {
  const isCreate = mode.type === "create";
  const isReset = mode.type === "resetPassword";
  const editUser = mode.type !== "create" ? mode.user : null;

  const [name, setName] = useState(editUser?.name ?? "");
  const [username, setUsername] = useState(editUser?.username ?? "");
  const [role, setRole] = useState(editUser?.role ?? "teacher");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setError("");
    setSubmitting(true);

    try {
      let res: Response;

      if (isCreate) {
        res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, name, role, password }),
        });
      } else if (isReset) {
        res = await fetch(`/api/admin/users/${editUser!.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPassword: password }),
        });
      } else {
        res = await fetch(`/api/admin/users/${editUser!.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, role }),
        });
      }

      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "操作失败");
      } else {
        onSuccess();
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setSubmitting(false);
    }
  }

  const title = isCreate ? "新建用户" : isReset ? "重置密码" : "编辑用户";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3 className="modal__title">{title}</h3>

        {error && <div className="field-error" style={{ marginBottom: "var(--sp-4)" }}>{error}</div>}

        <div className="modal__body" style={{ display: "grid", gap: "var(--sp-4)" }}>
          {!isReset && (
            <div>
              <label className="field-label">姓名 <span className="field-required">*</span></label>
              <input className="input input--sm" value={name} onChange={e => setName(e.target.value)} placeholder="例：张老师" />
            </div>
          )}

          {isCreate && (
            <div>
              <label className="field-label">用户名 <span className="field-required">*</span></label>
              <input className="input input--sm" value={username} onChange={e => setUsername(e.target.value)} placeholder="登录用，创建后不可修改" />
            </div>
          )}
          {!isCreate && !isReset && (
            <div>
              <label className="field-label">用户名</label>
              <input className="input input--sm" value={editUser!.username} disabled />
            </div>
          )}

          {!isReset && (
            <div>
              <label className="field-label">角色 <span className="field-required">*</span></label>
              <select className="select" value={role} onChange={e => setRole(e.target.value)}>
                <option value="teacher">老师</option>
                <option value="admin">管理员</option>
              </select>
            </div>
          )}

          {(isCreate || isReset) && (
            <div>
              <label className="field-label">{isReset ? "新密码" : "初始密码"} <span className="field-required">*</span></label>
              <input className="input input--sm" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="最少 6 位" />
            </div>
          )}
        </div>

        <div className="modal__actions" style={{ marginTop: "var(--sp-6)" }}>
          <button className="btn btn--soft" onClick={onClose}>取消</button>
          <button className="btn" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "提交中…" : "确认"}
          </button>
        </div>
      </div>
    </div>
  );
}
