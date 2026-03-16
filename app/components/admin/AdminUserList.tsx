"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import UserFormModal from "./UserFormModal";
import { SetTopBar } from "@/components/TopBarContext";

interface UserRow {
  id: string;
  username: string;
  name: string;
  role: string;
  createdAt: Date;
}

type ModalMode = { type: "create" } | { type: "edit"; user: UserRow } | { type: "resetPassword"; user: UserRow } | null;

const ROLE_MAP: Record<string, { text: string; cls: string }> = {
  admin:   { text: "管理员", cls: "badge-role badge-role--admin" },
  teacher: { text: "老师",   cls: "badge-role badge-role--teacher" },
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
      <SetTopBar
        breadcrumb="管理后台"
        title="用户管理"
        actions={<button className="btn btn--sm" onClick={() => setModal({ type: "create" })}>新建用户</button>}
      />

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {["姓名", "用户名", "角色", "创建时间", "操作"].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr><td colSpan={5} className="table__empty">暂无用户</td></tr>
            )}
            {users.map((u) => {
              const r = ROLE_MAP[u.role] ?? ROLE_MAP.teacher;
              const busy = loading === u.id;
              return (
                <tr key={u.id}>
                  <td className="bold" style={{ fontSize: 14 }}>{u.name}</td>
                  <td className="table__cell--mono">{u.username}</td>
                  <td><span className={r.cls}>{r.text}</span></td>
                  <td className="muted" style={{ fontSize: 13 }}>{new Date(u.createdAt).toLocaleDateString("zh-CN")}</td>
                  <td>
                    <div style={{ display: "flex", gap: "var(--sp-2)" }}>
                      <button className="btn btn--sm btn--soft" disabled={busy} onClick={() => setModal({ type: "edit", user: u })}>编辑</button>
                      <button className="btn btn--sm btn--soft" disabled={busy} onClick={() => setModal({ type: "resetPassword", user: u })}>重置密码</button>
                      <button className="btn btn--sm btn--soft" style={{ borderColor: "var(--danger-border)", color: "var(--danger)" }} disabled={busy} onClick={() => setConfirm({ id: u.id, name: u.name })}>删除</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <UserFormModal mode={modal} onClose={() => setModal(null)} onSuccess={() => { setModal(null); router.refresh(); }} />
      )}

      {confirm && (
        <div className="modal-overlay" onClick={() => setConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal__title">确认删除</h3>
            <div className="modal__body" style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7 }}>
              删除用户「{confirm.name}」后，该账号将无法登录。此操作不可撤销。
            </div>
            <div className="modal__actions">
              <button className="btn btn--soft" onClick={() => setConfirm(null)}>取消</button>
              <button className="btn btn--danger-fill" onClick={() => deleteUser(confirm.id)}>确认删除</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
