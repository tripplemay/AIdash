"use client";

import { useState, useEffect } from "react";

interface UsageEntry {
  model?: string;
  action?: string;
  calls: number;
  tokens: number;
  cost: number;
}

interface Provider {
  id: string;
  name: string;
  baseUrl: string;
  apiKeyMasked: string;
  protocol: string;
  supportText: boolean;
  supportImage: boolean;
  isActive: boolean;
}

interface ActionConfig {
  id: string;
  actionKey: string;
  actionLabel: string;
  actionType: string;
  providerId: string;
  modelName: string;
  provider?: { id: string; name: string };
}

interface Props {
  usageByModel: UsageEntry[];
  usageByAction: UsageEntry[];
  totalCost: number;
  totalCalls: number;
}

const ACTION_LABELS: Record<string, string> = {
  generate_framework: "生成课程框架",
  revise_framework: "调整框架",
  generate_plan: "生成详细方案",
  regenerate_lesson: "生成/重新生成课次",
  revise_lesson: "按意见修改课次",
  rewrite_field: "单字段改写",
  lesson_cover: "课次封面图",
  lesson_illustration: "课内插图",
  package_cover: "课程包封面图",
};

export default function AiSettingsPage({ usageByModel, usageByAction, totalCost, totalCalls }: Props) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [actions, setActions] = useState<ActionConfig[]>([]);
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [newProvider, setNewProvider] = useState({ name: "", baseUrl: "", apiKey: "", supportText: true, supportImage: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/ai-providers").then(r => r.json()).then(d => setProviders(d.data ?? [])).catch(() => {});
    fetch("/api/admin/ai-actions").then(r => r.json()).then(d => setActions(d.data ?? [])).catch(() => {});
  }, []);

  async function handleAddProvider() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/ai-providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProvider),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error); return; }
      setProviders(prev => [...prev, json.data]);
      setShowAddProvider(false);
      setNewProvider({ name: "", baseUrl: "", apiKey: "", supportText: true, supportImage: false });
    } catch {
      setError("操作失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="admin-header">
        <div>
          <h2 className="admin-header__title">AI 服务配置</h2>
          <p className="admin-header__subtitle">管理 AI 服务提供商、模型映射和用量统计</p>
        </div>
      </div>

      {error && <div className="field-error" style={{ marginBottom: "var(--sp-4)" }}>{error}</div>}

      {/* 用量统计 */}
      <div className="card--glass" style={{ padding: "var(--sp-5)", marginBottom: "var(--sp-5)" }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: "var(--sp-4)" }}>
          AI 用量统计 · {totalCalls} 次调用 · 总计 ¥{totalCost.toFixed(2)}
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-4)" }}>
          {/* 按模型 */}
          <div>
            <div className="field-label">按模型</div>
            <div className="table-wrap">
              <table className="table" style={{ fontSize: 12 }}>
                <thead><tr><th>模型</th><th>调用</th><th>token</th><th>费用</th></tr></thead>
                <tbody>
                  {usageByModel.map(u => (
                    <tr key={u.model}>
                      <td className="table__cell--mono" style={{ fontSize: 11 }}>{(u.model ?? "").split("/").pop()}</td>
                      <td>{u.calls}</td>
                      <td>{(u.tokens / 1000).toFixed(1)}k</td>
                      <td>¥{u.cost.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 按动作 */}
          <div>
            <div className="field-label">按动作</div>
            <div className="table-wrap">
              <table className="table" style={{ fontSize: 12 }}>
                <thead><tr><th>动作</th><th>调用</th><th>费用</th><th>平均</th></tr></thead>
                <tbody>
                  {usageByAction.map(u => (
                    <tr key={u.action}>
                      <td>{ACTION_LABELS[u.action ?? ""] ?? u.action}</td>
                      <td>{u.calls}</td>
                      <td>¥{u.cost.toFixed(2)}</td>
                      <td>¥{u.calls > 0 ? (u.cost / u.calls).toFixed(3) : "0"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 服务提供商 */}
      <div className="card--glass" style={{ padding: "var(--sp-5)", marginBottom: "var(--sp-5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--sp-4)" }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>AI 服务提供商</h3>
          <button className="btn btn--sm" onClick={() => setShowAddProvider(true)}>+ 添加</button>
        </div>

        {providers.length === 0 && (
          <div className="muted" style={{ textAlign: "center", padding: "var(--sp-5) 0" }}>
            暂未配置提供商。当前使用环境变量中的 OpenRouter Key。
          </div>
        )}

        <div style={{ display: "grid", gap: "var(--sp-3)" }}>
          {providers.map(p => (
            <div key={p.id} style={{ padding: "var(--sp-3)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {p.baseUrl} · Key: {p.apiKeyMasked}
                </div>
                <div style={{ fontSize: 11, marginTop: "var(--sp-1)" }}>
                  {p.supportText && <span className="pill" style={{ fontSize: 10, marginRight: 4 }}>文本</span>}
                  {p.supportImage && <span className="pill" style={{ fontSize: 10 }}>图片</span>}
                </div>
              </div>
              <span style={{ color: p.isActive ? "var(--green)" : "var(--muted)", fontSize: 12 }}>
                {p.isActive ? "✅ 已启用" : "⚠ 已禁用"}
              </span>
            </div>
          ))}
        </div>

        {/* 添加提供商表单 */}
        {showAddProvider && (
          <div style={{ marginTop: "var(--sp-4)", padding: "var(--sp-4)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", background: "var(--bg-faint)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-3)", marginBottom: "var(--sp-3)" }}>
              <div>
                <label className="field-label">名称</label>
                <input className="input input--sm" value={newProvider.name} onChange={e => setNewProvider(p => ({ ...p, name: e.target.value }))} placeholder="如 OpenRouter" />
              </div>
              <div>
                <label className="field-label">API 地址</label>
                <input className="input input--sm" value={newProvider.baseUrl} onChange={e => setNewProvider(p => ({ ...p, baseUrl: e.target.value }))} placeholder="https://openrouter.ai/api/v1" />
              </div>
            </div>
            <div style={{ marginBottom: "var(--sp-3)" }}>
              <label className="field-label">API Key</label>
              <input className="input input--sm" type="password" value={newProvider.apiKey} onChange={e => setNewProvider(p => ({ ...p, apiKey: e.target.value }))} placeholder="sk-..." />
            </div>
            <div style={{ display: "flex", gap: "var(--sp-4)", marginBottom: "var(--sp-3)", fontSize: 13 }}>
              <label><input type="checkbox" checked={newProvider.supportText} onChange={e => setNewProvider(p => ({ ...p, supportText: e.target.checked }))} /> 支持文本生成</label>
              <label><input type="checkbox" checked={newProvider.supportImage} onChange={e => setNewProvider(p => ({ ...p, supportImage: e.target.checked }))} /> 支持图片生成</label>
            </div>
            <div style={{ display: "flex", gap: "var(--sp-2)" }}>
              <button className="btn btn--sm" onClick={handleAddProvider} disabled={saving || !newProvider.name || !newProvider.baseUrl || !newProvider.apiKey}>
                {saving ? "保存中..." : "保存"}
              </button>
              <button className="btn btn--soft btn--sm" onClick={() => setShowAddProvider(false)}>取消</button>
            </div>
          </div>
        )}
      </div>

      {/* 动作映射配置 */}
      <div className="card--glass" style={{ padding: "var(--sp-5)" }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: "var(--sp-4)" }}>动作与模型映射</h3>
        <p className="muted small" style={{ marginBottom: "var(--sp-4)" }}>
          为每个 AI 动作指定使用的服务提供商和模型。未配置的动作将无法使用。
        </p>

        <div style={{ display: "grid", gap: "var(--sp-3)" }}>
          {DEFAULT_ACTIONS.map(da => {
            const existing = actions.find(a => a.actionKey === da.key);
            return (
              <ActionMappingRow
                key={da.key}
                actionKey={da.key}
                actionLabel={da.label}
                actionType={da.type}
                providers={providers}
                currentProviderId={existing?.providerId ?? ""}
                currentModelName={existing?.modelName ?? ""}
                onSave={(providerId, modelName) => handleSaveAction(da.key, da.label, da.type, providerId, modelName)}
              />
            );
          })}
        </div>
      </div>
    </>
  );

  async function handleSaveAction(actionKey: string, actionLabel: string, actionType: string, providerId: string, modelName: string) {
    try {
      const res = await fetch("/api/admin/ai-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionKey, actionLabel, actionType, providerId, modelName }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error); return; }
      // 更新本地状态
      setActions(prev => {
        const idx = prev.findIndex(a => a.actionKey === actionKey);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = json.data;
          return next;
        }
        return [...prev, json.data];
      });
    } catch {
      setError("保存失败");
    }
  }
}

// ─── 预定义的 AI 动作列表 ───

const DEFAULT_ACTIONS = [
  { key: "generate_framework", label: "生成课程框架", type: "text" },
  { key: "revise_framework", label: "调整框架", type: "text" },
  { key: "regenerate_lesson", label: "生成/重新生成课次", type: "text" },
  { key: "revise_lesson", label: "按意见修改课次", type: "text" },
  { key: "rewrite_field", label: "单字段改写", type: "text" },
  { key: "lesson_cover", label: "课次封面图", type: "image" },
  { key: "lesson_illustration", label: "课内插图", type: "image" },
  { key: "package_cover", label: "课程包封面图", type: "image" },
];

// ─── 单行动作映射配置组件 ───

function ActionMappingRow({
  actionKey, actionLabel, actionType, providers, currentProviderId, currentModelName, onSave,
}: {
  actionKey: string;
  actionLabel: string;
  actionType: string;
  providers: Provider[];
  currentProviderId: string;
  currentModelName: string;
  onSave: (providerId: string, modelName: string) => void;
}) {
  const [providerId, setProviderId] = useState(currentProviderId);
  const [modelName, setModelName] = useState(currentModelName);
  const [models, setModels] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [saving, setSaving] = useState(false);
  const changed = providerId !== currentProviderId || modelName !== currentModelName;

  const availableProviders = providers.filter(p =>
    actionType === "image" ? p.supportImage : p.supportText
  );

  // 选择服务商后自动拉取模型列表
  function handleProviderChange(newId: string) {
    setProviderId(newId);
    setModelName("");
    setModels([]);
    if (!newId) return;

    setLoadingModels(true);
    fetch(`/api/admin/ai-providers/${newId}/models`)
      .then(r => r.json())
      .then(json => setModels(json.data ?? []))
      .catch(() => setModels([]))
      .finally(() => setLoadingModels(false));
  }

  // 首次加载时，如果已有 providerId，拉取模型列表
  useEffect(() => {
    if (currentProviderId) {
      fetch(`/api/admin/ai-providers/${currentProviderId}/models`)
        .then(r => r.json())
        .then(json => setModels(json.data ?? []))
        .catch(() => {});
    }
  }, [currentProviderId]);

  async function handleSave() {
    if (!providerId || !modelName) return;
    setSaving(true);
    await onSave(providerId, modelName);
    setSaving(false);
  }

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "180px 50px 1fr 1fr auto",
      gap: "var(--sp-2)",
      alignItems: "center",
      padding: "var(--sp-2) var(--sp-3)",
      border: "1px solid var(--line)",
      borderRadius: "var(--radius-sm)",
      background: currentProviderId ? "var(--panel-solid)" : "var(--bg-faint)",
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{actionLabel}</div>
      </div>
      <div>
        <span className="pill" style={{ fontSize: 10 }}>{actionType === "image" ? "图片" : "文本"}</span>
      </div>
      <select
        className="select"
        style={{ height: 34, fontSize: 12 }}
        value={providerId}
        onChange={e => handleProviderChange(e.target.value)}
      >
        <option value="">选择服务商</option>
        {availableProviders.map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      {loadingModels ? (
        <div className="muted" style={{ fontSize: 12 }}>加载模型列表...</div>
      ) : models.length > 0 ? (
        <select
          className="select"
          style={{ height: 34, fontSize: 12 }}
          value={modelName}
          onChange={e => setModelName(e.target.value)}
        >
          <option value="">选择模型</option>
          {models.map(m => (
            <option key={m.id} value={m.id}>{m.id}</option>
          ))}
        </select>
      ) : (
        <input
          className="input input--sm"
          style={{ fontSize: 12 }}
          value={modelName}
          onChange={e => setModelName(e.target.value)}
          placeholder="模型 ID"
        />
      )}
      <button
        className="btn btn--sm"
        onClick={handleSave}
        disabled={saving || !changed || !providerId || !modelName}
        style={{ whiteSpace: "nowrap" }}
      >
        {saving ? "..." : currentProviderId ? "更新" : "保存"}
      </button>
    </div>
  );
}
