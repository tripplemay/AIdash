"use client";

import { useState, useRef } from "react";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

type Status = "idle" | "uploading" | "success" | "error";

interface UploadResult {
  slug: string;
  title: string;
  lessonsImported: number;
  attachmentsImported: number;
}

export default function UploadModal({ onClose, onSuccess }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<UploadResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setStatus("uploading");
    setErrorMsg("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) {
        setStatus("error");
        setErrorMsg(json.error ?? "上传失败");
      } else {
        setStatus("success");
        setResult(json.data);
      }
    } catch {
      setStatus("error");
      setErrorMsg("网络错误，请重试");
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 24, padding: "32px 36px", width: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>上传课程包 zip</div>
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24, lineHeight: 1.7 }}>
          选择由 ChatGPT 按接入规范 v1 生成的压缩包。上传后系统自动解压并导入数据库，课程包将立即发布。
        </div>

        {/* 文件选择区 */}
        {status !== "success" && (
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              border: "2px dashed #c5d3ff", borderRadius: 16, padding: "28px 24px",
              textAlign: "center", cursor: "pointer", marginBottom: 20,
              background: fileName ? "#f5f8ff" : "rgba(238,243,255,0.4)",
              transition: "background 0.2s",
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".zip"
              style={{ display: "none" }}
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
            />
            {fileName ? (
              <>
                <div style={{ fontSize: 24, marginBottom: 6 }}>📦</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{fileName}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>点击重新选择</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 24, marginBottom: 6 }}>☁️</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#6278b2" }}>点击选择 .zip 文件</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>最大 50MB</div>
              </>
            )}
          </div>
        )}

        {/* 上传中 */}
        {status === "uploading" && (
          <div style={{ textAlign: "center", padding: "16px 0", color: "var(--muted)", fontSize: 14 }}>
            正在上传并处理，请稍候…
          </div>
        )}

        {/* 成功 */}
        {status === "success" && result && (
          <div style={{ background: "#eefaf2", border: "1px solid #d7f0e0", borderRadius: 16, padding: "20px 24px", marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#228654", marginBottom: 12 }}>✓ 导入成功</div>
            <div style={{ display: "grid", gap: 6 }}>
              {[
                ["课程包", result.title],
                ["Slug", result.slug],
                ["导入课次", `${result.lessonsImported} 节`],
                ["导入附件", `${result.attachmentsImported} 个`],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--muted)" }}>{label}</span>
                  <span style={{ fontWeight: 700 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 错误 */}
        {status === "error" && (
          <div style={{ background: "#fff5f5", border: "1px solid #fdd", borderRadius: 14, padding: "14px 18px", marginBottom: 20, fontSize: 13, color: "#c44" }}>
            {errorMsg}
          </div>
        )}

        {/* 操作按钮 */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={status === "success" ? onSuccess : onClose}
            style={{ height: 40, padding: "0 18px", borderRadius: 999, border: "1px solid var(--line)", background: "rgba(255,255,255,0.78)", fontWeight: 600, cursor: "pointer" }}
          >
            {status === "success" ? "关闭" : "取消"}
          </button>
          {status !== "success" && (
            <button
              onClick={handleUpload}
              disabled={!fileName || status === "uploading"}
              style={{
                height: 40, padding: "0 22px", borderRadius: 999, border: "none",
                background: !fileName || status === "uploading" ? "#ccc" : "linear-gradient(90deg,#6f86ff,#61d1ff)",
                color: "#fff", fontWeight: 700, cursor: !fileName || status === "uploading" ? "not-allowed" : "pointer",
              }}
            >
              {status === "uploading" ? "上传中…" : "开始上传"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
