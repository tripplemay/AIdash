"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import UploadModal from "./UploadModal";

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

export default function AdminPackageList({ packages }: { packages: PackageRow[] }) {
  const router = useRouter();
  const [showUpload, setShowUpload] = useState(false);
  const [confirm, setConfirm] = useState<{ type: "delete" | "offline" | "online"; slug: string; title: string } | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

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

  async function deletePackage(slug: string) {
    setLoading(slug);
    await fetch(`/api/admin/packages/${slug}`, { method: "DELETE" });
    setLoading(null);
    setConfirm(null);
    router.refresh();
  }

  return (
    <>
      <div className="admin-header">
        <div>
          <h2 className="admin-header__title">课程包管理</h2>
          <p className="admin-header__subtitle">共 {packages.length} 个课程包</p>
        </div>
        <button className="btn" onClick={() => setShowUpload(true)}>上传课程包 zip</button>
      </div>

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
                  <td style={{ fontSize: 13 }}>{pkg.ageRange} 岁</td>
                  <td style={{ fontSize: 13 }}>{pkg.level}</td>
                  <td><span className={s.cls}>{s.text}</span></td>
                  <td style={{ fontSize: 13 }}>{pkg._count.lessons} 课</td>
                  <td>
                    <div style={{ display: "flex", gap: "var(--sp-2)" }}>
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

      {showUpload && (
        <UploadModal onClose={() => setShowUpload(false)} onSuccess={() => { setShowUpload(false); router.refresh(); }} />
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
                className={confirm.type !== "online" ? "btn btn--danger" : "btn"}
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
