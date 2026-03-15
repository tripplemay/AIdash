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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3 className="modal__title">上传课程包 zip</h3>
        <p className="muted small" style={{ marginBottom: "var(--sp-6)", lineHeight: 1.7 }}>
          选择由 ChatGPT 按接入规范 v2 生成的压缩包。上传后系统自动解压并导入数据库，课程包将立即发布。
        </p>

        {status !== "success" && (
          <div
            className={`upload-zone${fileName ? " upload-zone--has-file" : ""}`}
            onClick={() => fileRef.current?.click()}
            style={{ marginBottom: "var(--sp-5)" }}
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
                <div style={{ fontSize: 24, marginBottom: "var(--sp-1)" }}>📦</div>
                <div className="bold" style={{ fontSize: 14 }}>{fileName}</div>
                <div className="muted small" style={{ marginTop: "var(--sp-1)" }}>点击重新选择</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 24, marginBottom: "var(--sp-1)" }}>☁️</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>点击选择 .zip 文件</div>
                <div className="muted small" style={{ marginTop: "var(--sp-1)" }}>最大 50MB</div>
              </>
            )}
          </div>
        )}

        {status === "uploading" && (
          <div className="text-center muted" style={{ padding: "var(--sp-4) 0" }}>正在上传并处理，请稍候…</div>
        )}

        {status === "success" && result && (
          <div className="upload-result upload-result--success" style={{ marginBottom: "var(--sp-5)" }}>
            <div className="bold text-success" style={{ fontSize: 16, marginBottom: "var(--sp-3)" }}>✓ 导入成功</div>
            <div style={{ display: "grid", gap: "var(--sp-1)" }}>
              {[
                ["课程包", result.title],
                ["Slug", result.slug],
                ["导入课次", `${result.lessonsImported} 节`],
                ["导入附件", `${result.attachmentsImported} 个`],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span className="muted">{label}</span>
                  <span className="bold">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="upload-result upload-result--error" style={{ marginBottom: "var(--sp-5)" }}>
            {errorMsg}
          </div>
        )}

        <div className="modal__actions">
          <button className="btn btn--soft" onClick={status === "success" ? onSuccess : onClose}>
            {status === "success" ? "关闭" : "取消"}
          </button>
          {status !== "success" && (
            <button
              className="btn"
              onClick={handleUpload}
              disabled={!fileName || status === "uploading"}
            >
              {status === "uploading" ? "上传中…" : "开始上传"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
