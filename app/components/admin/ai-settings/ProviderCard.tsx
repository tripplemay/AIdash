"use client";

import { useState } from "react";

interface Provider {
  id: string;
  name: string;
  baseUrl: string;
  apiKeyMasked: string;
  protocol: string;
  supportText: boolean;
  supportImage: boolean;
  isActive: boolean;
  proxyUrl: string | null;
}

interface Props {
  provider: Provider;
  canEdit?: boolean;
  onUpdate: (updated: Provider) => void;
  onDelete: (id: string) => void;
}

export default function ProviderCard({ provider, canEdit = true, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: provider.name,
    baseUrl: provider.baseUrl,
    supportText: provider.supportText,
    supportImage: provider.supportImage,
    apiKey: "",
    proxyUrl: provider.proxyUrl ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState("");

  async function handleToggleActive() {
    const res = await fetch(`/api/admin/ai-providers/${provider.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !provider.isActive }),
    });
    const json = await res.json();
    if (res.ok) onUpdate(json.data);
  }

  async function handleSaveEdit() {
    setSaving(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        name: editData.name,
        baseUrl: editData.baseUrl,
        supportText: editData.supportText,
        supportImage: editData.supportImage,
        proxyUrl: editData.proxyUrl || null,
      };
      if (editData.apiKey) body.apiKey = editData.apiKey;

      const res = await fetch(`/api/admin/ai-providers/${provider.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error); return; }
      onUpdate(json.data);
      setEditing(false);
      setEditData(d => ({ ...d, apiKey: "" }));
    } catch {
      setError("保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/admin/ai-providers/${provider.id}/test`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        const msg = json.modelCount > 0
          ? `连接正常 · ${json.modelCount} 个模型`
          : "连接正常 · 该服务商需手动输入模型 ID";
        setTestResult({ success: true, message: msg });
        setTimeout(() => setTestResult(null), 8000);
      } else {
        setTestResult({ success: false, message: json.error ?? "测试失败" });
      }
    } catch {
      setTestResult({ success: false, message: "网络错误" });
    } finally {
      setTesting(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`确认删除服务商「${provider.name}」？`)) return;
    const res = await fetch(`/api/admin/ai-providers/${provider.id}`, { method: "DELETE" });
    const json = await res.json();
    if (res.ok) {
      onDelete(provider.id);
    } else {
      setError(json.error);
    }
  }

  return (
    <div className="provider-card">
      <div className="provider-card__main">
        <div className="provider-card__info">
          <div className="provider-card__name">{provider.name}</div>
          <div className="provider-card__detail muted">
            {provider.baseUrl} · Key: {provider.apiKeyMasked}
          </div>
          <div className="provider-card__tags">
            {provider.supportText && <span className="pill pill--sm">文本</span>}
            {provider.supportImage && <span className="pill pill--sm">图片</span>}
            {provider.proxyUrl && <span className="pill pill--sm" title={provider.proxyUrl}>代理</span>}
          </div>
        </div>
        <div className="provider-card__actions">
          {testResult && (
            <span className={`provider-card__test-result ${testResult.success ? "provider-card__test-result--ok" : "provider-card__test-result--fail"}`}>
              {testResult.message}
            </span>
          )}
          {canEdit && (
            <>
              <button className="btn btn--soft btn--xs" onClick={handleTest} disabled={testing}>
                {testing ? "测试中..." : "测试连接"}
              </button>
              <button
                className={`btn btn--xs ${provider.isActive ? "btn--soft" : "btn--primary"}`}
                onClick={handleToggleActive}
              >
                {provider.isActive ? "禁用" : "启用"}
              </button>
              <button className="btn btn--soft btn--xs" onClick={() => { setEditing(!editing); setError(""); }}>
                {editing ? "取消" : "编辑"}
              </button>
              <button className="btn btn--soft btn--xs btn--danger" onClick={handleDelete}>删除</button>
            </>
          )}
        </div>
      </div>

      {error && <div className="field-error" style={{ marginTop: "var(--sp-2)" }}>{error}</div>}

      {editing && (
        <div className="provider-card__edit-form">
          <div className="provider-card__edit-grid">
            <div>
              <label className="field-label">名称</label>
              <input className="input input--sm" value={editData.name} onChange={e => setEditData(d => ({ ...d, name: e.target.value }))} />
            </div>
            <div>
              <label className="field-label">API 地址</label>
              <input className="input input--sm" value={editData.baseUrl} onChange={e => setEditData(d => ({ ...d, baseUrl: e.target.value }))} />
            </div>
          </div>
          <div className="provider-card__edit-grid" style={{ marginTop: "var(--sp-2)" }}>
            <div>
              <label className="field-label">更换 API Key（留空保持不变）</label>
              <input className="input input--sm" type="password" value={editData.apiKey} onChange={e => setEditData(d => ({ ...d, apiKey: e.target.value }))} placeholder="留空保持不变" />
            </div>
            <div>
              <label className="field-label">代理地址（留空直连）</label>
              <input className="input input--sm" value={editData.proxyUrl} onChange={e => setEditData(d => ({ ...d, proxyUrl: e.target.value }))} placeholder="socks5://127.0.0.1:1080" />
            </div>
          </div>
          <div className="provider-card__edit-checks">
            <label><input type="checkbox" checked={editData.supportText} onChange={e => setEditData(d => ({ ...d, supportText: e.target.checked }))} /> 文本</label>
            <label><input type="checkbox" checked={editData.supportImage} onChange={e => setEditData(d => ({ ...d, supportImage: e.target.checked }))} /> 图片</label>
          </div>
          <button className="btn btn--sm" onClick={handleSaveEdit} disabled={saving || !editData.name || !editData.baseUrl}>
            {saving ? "保存中..." : "保存修改"}
          </button>
        </div>
      )}
    </div>
  );
}
