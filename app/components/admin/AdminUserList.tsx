"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import UserFormModal from "./UserFormModal";

interface UserRow {
  id: string;
  username: string;
  name: string;
  role: string;
  createdAt: Date;
}

type ModalMode = { type: "create" } | { type: "edit"; user: UserRow } | { type: "resetPassword"; user: UserRow } | null;

const ROLE_LABEL: Record<string, { text: string; bg: string; color: string; border: string }> = {
  admin:   { text: "管理员", bg: "#fff4ef", color: "#c05500", border: "#fdd9c0" },
  teacher: { text: "老师",   bg: "#eef3ff", color: "#6278b2", border: "#dfe7ff" },
};

export default function AdminUserList({ users }: { users: UserRow[] }) {
  const router = useRouter();
  const [modal, setModal] = useState<ModalMode>(null);
  const [confirm, setConfirm] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  async function deleteUser(id: string) {
    setLoading(id);
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    const json = await res.json();
    setLoading(null);
    setConfirm(null);
    if (!res.ok) alert(json.error ?? "删除失败");
    else router.refresh();
  }

  return (
    <>
      {/* 头部 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>用户管理</div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>共 {users.length} 个账号</div>
        </div>
        <button
          onClick={() => setModal({ type: "create" })}
          style={{
            height: 44, padding: "0 22px", border: "none", borderRadius: 999,
            background: "linear-gradient(90deg, #6f86ff, #61d1ff)",
            color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 10px 22px rgba(111,134,255,.18)",
          }}
        >
          新建用户
        </button>
      </div>

      {/* 表格 */}
      <div style={{ background: "rgba(255,255,255,0.86)", border: "1px solid var(--line)", borderRadius: 22, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(238,243,255,0.7)", borderBottom: "1px solid var(--line)" }}>
              {["姓名", "用户名", "角色", "创建时间", "操作"].map(h => (
                <th key={h} style={{ padding: "14px 16px", textAlign: "left", fontSize: 13, fontWeight: 700, color: "var(--muted)", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)", fontSize: 14 }}>暂无用户</td>
              </tr>
            )}
            {users.map((u) => {
              const r = ROLE_LABEL[u.role] ?? ROLE_LABEL.teacher;
              const busy = loading === u.id;
              return (
                <tr key={u.id} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "14px 16px", fontWeight: 700, fontSize: 14 }}>{u.name}</td>
                  <td style={{ padding: "14px 16px", fontFamily: "monospace", fontSize: 13, color: "var(--muted)" }}>{u.username}</td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{ display: "inline-flex", padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: r.bg, color: r.color, border: `1px solid ${r.border}` }}>
                      {r.text}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 13, color: "var(--muted)" }}>
                    {new Date(u.createdAt).toLocaleDateString("zh-CN")}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <ActionBtn label="编辑" disabled={busy} onClick={() => setModal({ type: "edit", user: u })} />
                      <ActionBtn label="重置密码" disabled={busy} onClick={() => setModal({ type: "resetPassword", user: u })} />
                      <ActionBtn label="删除" disabled={busy} danger onClick={() => setConfirm({ id: u.id, name: u.name })} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 用户表单弹窗 */}
      {modal && (
        <UserFormModal
          mode={modal}
          onClose={() => setModal(null)}
          onSuccess={() => { setModal(null); router.refresh(); }}
        />
      )}

      {/* 删除确认 */}
      {confirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "28px 32px", width: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>确认删除</div>
            <div style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7, marginBottom: 24 }}>
              删除用户「{confirm.name}」后，该账号将无法登录。此操作不可撤销。
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirm(null)} style={{ height: 40, padding: "0 18px", borderRadius: 999, border: "1px solid var(--line)", background: "rgba(255,255,255,0.78)", fontWeight: 600, cursor: "pointer" }}>取消</button>
              <button onClick={() => deleteUser(confirm.id)} style={{ height: 40, padding: "0 18px", borderRadius: 999, border: "none", background: "#e55", color: "#fff", fontWeight: 700, cursor: "pointer" }}>确认删除</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ActionBtn({ label, onClick, danger, disabled }: { label: string; onClick: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 32, padding: "0 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
        border: danger ? "1px solid #f4d0d0" : "1px solid var(--line)",
        background: "rgba(255,255,255,0.78)",
        color: danger ? "#c44" : "var(--text)",
        opacity: disabled ? 0.5 : 1,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}
