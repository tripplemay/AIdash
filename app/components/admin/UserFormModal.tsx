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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 24, padding: "32px 36px", width: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 24 }}>{title}</div>

        {error && (
          <div style={{ background: "#fff5f5", border: "1px solid #fdd", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#c44", marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: "grid", gap: 16 }}>
          {/* 姓名 */}
          {!isReset && (
            <Field label="姓名" required>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="例：张老师"
                style={inputStyle}
              />
            </Field>
          )}

          {/* 用户名 */}
          {isCreate && (
            <Field label="用户名" required>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="登录用，创建后不可修改"
                style={inputStyle}
              />
            </Field>
          )}
          {!isCreate && !isReset && (
            <Field label="用户名">
              <input value={editUser!.username} disabled style={{ ...inputStyle, background: "#f5f5f5", color: "#999" }} />
            </Field>
          )}

          {/* 角色 */}
          {!isReset && (
            <Field label="角色" required>
              <select value={role} onChange={e => setRole(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="teacher">老师</option>
                <option value="admin">管理员</option>
              </select>
            </Field>
          )}

          {/* 密码 */}
          {(isCreate || isReset) && (
            <Field label={isReset ? "新密码" : "初始密码"} required>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="最少 6 位"
                style={inputStyle}
              />
            </Field>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 28 }}>
          <button onClick={onClose} style={{ height: 40, padding: "0 18px", borderRadius: 999, border: "1px solid var(--line)", background: "rgba(255,255,255,0.78)", fontWeight: 600, cursor: "pointer" }}>
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{ height: 40, padding: "0 22px", borderRadius: 999, border: "none", background: submitting ? "#ccc" : "linear-gradient(90deg,#6f86ff,#61d1ff)", color: "#fff", fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer" }}
          >
            {submitting ? "提交中…" : "确认"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", height: 44, borderRadius: 12,
  border: "1px solid #dde5fb", background: "rgba(255,255,255,0.72)",
  padding: "0 14px", fontSize: 14, color: "var(--text)", outline: "none",
  boxSizing: "border-box",
};

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text)" }}>
        {label}{required && <span style={{ color: "#e55", marginLeft: 4 }}>*</span>}
      </div>
      {children}
    </div>
  );
}
