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

const STATUS_LABEL: Record<string, { text: string; bg: string; color: string; border: string }> = {
  published: { text: "已发布", bg: "#eefaf2", color: "#228654", border: "#d7f0e0" },
  offline:   { text: "已下线", bg: "#f3f3f3", color: "#888",    border: "#e0e0e0" },
  draft:     { text: "草稿",   bg: "#eef3ff", color: "#6278b2", border: "#dfe7ff" },
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
      {/* 头部 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>课程包管理</div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>共 {packages.length} 个课程包</div>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          style={{
            height: 44, padding: "0 22px", border: "none", borderRadius: 999,
            background: "linear-gradient(90deg, #6f86ff, #61d1ff)",
            color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 10px 22px rgba(111,134,255,.18)",
          }}
        >
          上传课程包 zip
        </button>
      </div>

      {/* 表格 */}
      <div style={{ background: "rgba(255,255,255,0.86)", border: "1px solid var(--line)", borderRadius: 22, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(238,243,255,0.7)", borderBottom: "1px solid var(--line)" }}>
              {["课程包名称", "Slug", "年龄段", "级别", "状态", "课次数", "操作"].map(h => (
                <th key={h} style={{ padding: "14px 16px", textAlign: "left", fontSize: 13, fontWeight: 700, color: "var(--muted)", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {packages.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)", fontSize: 14 }}>暂无课程包，请上传 zip 接入</td>
              </tr>
            )}
            {packages.map((pkg) => {
              const s = STATUS_LABEL[pkg.status] ?? STATUS_LABEL.draft;
              const busy = loading === pkg.slug;
              return (
                <tr key={pkg.id} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "14px 16px", fontWeight: 700, fontSize: 14 }}>{pkg.title}</td>
                  <td style={{ padding: "14px 16px", fontFamily: "monospace", fontSize: 13, color: "var(--muted)" }}>{pkg.slug}</td>
                  <td style={{ padding: "14px 16px", fontSize: 13 }}>{pkg.ageRange} 岁</td>
                  <td style={{ padding: "14px 16px", fontSize: 13 }}>{pkg.level}</td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{ display: "inline-flex", padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                      {s.text}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 13 }}>{pkg._count.lessons} 课</td>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      {pkg.status === "published" ? (
                        <ActionBtn
                          label="下线"
                          disabled={busy}
                          danger
                          onClick={() => setConfirm({ type: "offline", slug: pkg.slug, title: pkg.title })}
                        />
                      ) : (
                        <ActionBtn
                          label="上线"
                          disabled={busy}
                          onClick={() => setConfirm({ type: "online", slug: pkg.slug, title: pkg.title })}
                        />
                      )}
                      <ActionBtn
                        label="删除"
                        disabled={busy}
                        danger
                        onClick={() => setConfirm({ type: "delete", slug: pkg.slug, title: pkg.title })}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 上传弹窗 */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={() => { setShowUpload(false); router.refresh(); }}
        />
      )}

      {/* 确认弹窗 */}
      {confirm && (
        <ConfirmDialog
          title={confirm.type === "delete" ? "确认删除" : confirm.type === "offline" ? "确认下线" : "确认上线"}
          message={
            confirm.type === "delete"
              ? `删除「${confirm.title}」后，数据库记录将永久移除（文件保留）。此操作不可撤销。`
              : confirm.type === "offline"
              ? `下线后，老师端将无法看到「${confirm.title}」。`
              : `上线后，「${confirm.title}」将对所有老师可见。`
          }
          confirmLabel={confirm.type === "delete" ? "确认删除" : confirm.type === "offline" ? "确认下线" : "确认上线"}
          danger={confirm.type !== "online"}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            if (confirm.type === "delete") deletePackage(confirm.slug);
            else if (confirm.type === "offline") toggleStatus(confirm.slug, "offline");
            else toggleStatus(confirm.slug, "published");
          }}
        />
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
      }}
    >
      {label}
    </button>
  );
}

function ConfirmDialog({ title, message, confirmLabel, danger, onCancel, onConfirm }: {
  title: string; message: string; confirmLabel: string; danger?: boolean;
  onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: "28px 32px", width: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>{title}</div>
        <div style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7, marginBottom: 24 }}>{message}</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ height: 40, padding: "0 18px", borderRadius: 999, border: "1px solid var(--line)", background: "rgba(255,255,255,0.78)", fontWeight: 600, cursor: "pointer" }}>取消</button>
          <button onClick={onConfirm} style={{ height: 40, padding: "0 18px", borderRadius: 999, border: "none", background: danger ? "#e55" : "linear-gradient(90deg,#6f86ff,#61d1ff)", color: "#fff", fontWeight: 700, cursor: "pointer" }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
