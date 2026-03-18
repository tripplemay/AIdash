"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatAgeRange } from "@/lib/age-range-labels";
import { SetTopBar } from "@/components/TopBarContext";

interface PackageRow {
  id: string;
  slug: string;
  title: string;
  ageRange: string;
  level: string;
  status: string;
  createdAt: Date;
  _count: { lessons: number };
}

const STATUS_MAP: Record<string, { text: string; cls: string }> = {
  published: { text: "已发布", cls: "badge-status badge-status--published" },
  offline:   { text: "已下线", cls: "badge-status badge-status--offline" },
  draft:     { text: "草稿",   cls: "badge-status badge-status--draft" },
};

const AGE_OPTIONS = [
  { value: "A1", label: "A1｜6-7岁" },
  { value: "A2", label: "A2｜8-9岁" },
  { value: "A3", label: "A3｜10-12岁" },
  { value: "A4", label: "A4｜13-15岁" },
];

const LEVEL_OPTIONS = [
  { value: "L1", label: "L1" },
  { value: "L2", label: "L2" },
  { value: "L3", label: "L3" },
  { value: "L4", label: "L4" },
];

export default function AdminPackageList({ packages, ageRangeLabels }: { packages: PackageRow[]; ageRangeLabels?: Record<string, string> }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<{ type: "delete" | "offline" | "online"; slug: string; title: string } | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [editPkg, setEditPkg] = useState<{ slug: string; title: string; ageRange: string; level: string } | null>(null);
  const [editForm, setEditForm] = useState({ title: "", ageRange: "", level: "" });
  const [editSaving, setEditSaving] = useState(false);

  async function toggleStatus(slug: string, nextStatus: string) {
    setLoading(slug);
    await fetch(`/api/admin/packages/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    setLoading(null);
    setConfirm(null);
    router.refresh();
  }

  function openEdit(pkg: PackageRow) {
    setEditPkg({ slug: pkg.slug, title: pkg.title, ageRange: pkg.ageRange, level: pkg.level });
    setEditForm({ title: pkg.title, ageRange: pkg.ageRange, level: pkg.level });
  }

  async function handleSaveEdit() {
    if (!editPkg || !editForm.title.trim()) return;
    setEditSaving(true);
    await fetch(`/api/admin/packages/${editPkg.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editForm.title.trim(), ageRange: editForm.ageRange, level: editForm.level }),
    });
    setEditSaving(false);
    setEditPkg(null);
    router.refresh();
  }

  async function deletePackage(slug: string) {
    setLoading(slug);
    await fetch(`/api/admin/packages/${slug}`, { method: "DELETE" });
    setLoading(null);
    setConfirm(null);
    router.refresh();
  }

  return (
    <>
      <SetTopBar
        breadcrumb="管理后台"
        title="课程包管理"
      />

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {["课程包名称", "Slug", "年龄段", "级别", "状态", "课次数", "操作"].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {packages.length === 0 && (
              <tr><td colSpan={7} className="table__empty">暂无课程包，请上传 zip 接入</td></tr>
            )}
            {packages.map((pkg) => {
              const s = STATUS_MAP[pkg.status] ?? STATUS_MAP.draft;
              const busy = loading === pkg.slug;
              return (
                <tr key={pkg.id}>
                  <td className="bold" style={{ fontSize: 14 }}>{pkg.title}</td>
                  <td className="table__cell--mono">{pkg.slug}</td>
                  <td style={{ fontSize: 13 }}>{formatAgeRange(pkg.ageRange, ageRangeLabels)}</td>
                  <td style={{ fontSize: 13 }}>{pkg.level}</td>
                  <td><span className={s.cls}>{s.text}</span></td>
                  <td style={{ fontSize: 13 }}>{pkg._count.lessons} 课</td>
                  <td>
                    <div style={{ display: "flex", gap: "var(--sp-2)" }}>
                      <button className="btn btn--sm btn--soft" disabled={busy} onClick={() => openEdit(pkg)}>
                        编辑
                      </button>
                      {pkg.status === "published" ? (
                        <button className="btn btn--sm btn--soft" style={{ borderColor: "var(--danger-border)", color: "var(--danger)" }} disabled={busy} onClick={() => setConfirm({ type: "offline", slug: pkg.slug, title: pkg.title })}>
                          下线
                        </button>
                      ) : (
                        <button className="btn btn--sm btn--soft" disabled={busy} onClick={() => setConfirm({ type: "online", slug: pkg.slug, title: pkg.title })}>
                          上线
                        </button>
                      )}
                      <button className="btn btn--sm btn--soft" style={{ borderColor: "var(--danger-border)", color: "var(--danger)" }} disabled={busy} onClick={() => setConfirm({ type: "delete", slug: pkg.slug, title: pkg.title })}>
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editPkg && (
        <div className="modal-overlay" onClick={() => setEditPkg(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal__title">编辑课程包</h3>
            <div className="modal__body">
              <div style={{ marginBottom: "var(--sp-3)" }}>
                <label className="field-label">课程包标题</label>
                <input
                  className="input"
                  value={editForm.title}
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-3)" }}>
                <div>
                  <label className="field-label">年龄段</label>
                  <select
                    className="select"
                    value={editForm.ageRange}
                    onChange={e => setEditForm(f => ({ ...f, ageRange: e.target.value }))}
                  >
                    {AGE_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">级别</label>
                  <select
                    className="select"
                    value={editForm.level}
                    onChange={e => setEditForm(f => ({ ...f, level: e.target.value }))}
                  >
                    {LEVEL_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal__actions">
              <button className="btn btn--soft" onClick={() => setEditPkg(null)}>取消</button>
              <button
                className="btn"
                onClick={handleSaveEdit}
                disabled={editSaving || !editForm.title.trim()}
              >
                {editSaving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <div className="modal-overlay" onClick={() => setConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal__title">
              {confirm.type === "delete" ? "确认删除" : confirm.type === "offline" ? "确认下线" : "确认上线"}
            </h3>
            <div className="modal__body" style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7 }}>
              {confirm.type === "delete"
                ? `删除「${confirm.title}」后，数据库记录将永久移除（文件保留）。此操作不可撤销。`
                : confirm.type === "offline"
                ? `下线后，老师端将无法看到「${confirm.title}」。`
                : `上线后，「${confirm.title}」将对所有老师可见。`}
            </div>
            <div className="modal__actions">
              <button className="btn btn--soft" onClick={() => setConfirm(null)}>取消</button>
              <button
                className={confirm.type !== "online" ? "btn btn--danger-fill" : "btn"}
                onClick={() => {
                  if (confirm.type === "delete") deletePackage(confirm.slug);
                  else if (confirm.type === "offline") toggleStatus(confirm.slug, "offline");
                  else toggleStatus(confirm.slug, "published");
                }}
              >
                {confirm.type === "delete" ? "确认删除" : confirm.type === "offline" ? "确认下线" : "确认上线"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
