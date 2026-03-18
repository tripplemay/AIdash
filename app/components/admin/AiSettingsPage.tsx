"use client";

import { useState, useEffect } from "react";
import ProviderCard from "./ai-settings/ProviderCard";
import ActionMappingRow from "./ai-settings/ActionMappingRow";
import UsageStats from "./ai-settings/UsageStats";
import { SetTopBar } from "@/components/TopBarContext";

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

interface ActionConfig {
  id: string;
  actionKey: string;
  actionLabel: string;
  actionType: string;
  providerId: string;
  modelName: string;
  inputPricePerM: number | null;
  outputPricePerM: number | null;
  pricePerCall: number | null;
  pricingSource: string | null;
  pricingUpdatedAt: string | null;
  provider?: { id: string; name: string };
}

interface PricingInfo {
  usdToCny: number;
  lastUpdated: string | null;
}

const DEFAULT_ACTIONS = [
  { key: "generate_framework", label: "生成课程框架", type: "text" },
  { key: "revise_framework", label: "调整框架", type: "text" },
  { key: "regenerate_lesson", label: "生成/重新生成课次", type: "text" },
  { key: "revise_lesson", label: "按意见修改课次", type: "text" },
  { key: "rewrite_field", label: "单字段改写", type: "text" },
  { key: "validate_lesson", label: "课次审核", type: "text" },
  { key: "lesson_cover", label: "课次封面图", type: "image" },
  { key: "lesson_illustration", label: "课内插图", type: "image" },
  { key: "package_cover", label: "课程包封面图", type: "image" },
];

export default function AiSettingsPage({ canEdit = true }: { canEdit?: boolean }) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [actions, setActions] = useState<ActionConfig[]>([]);
  const [pricingInfo, setPricingInfo] = useState<PricingInfo | null>(null);
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [newProvider, setNewProvider] = useState({ name: "", baseUrl: "", apiKey: "", supportText: true, supportImage: false, proxyUrl: "" });
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/ai-providers").then(r => r.json()).then(d => setProviders(d.data ?? [])).catch(() => {});
    fetch("/api/admin/ai-actions").then(r => r.json()).then(d => setActions(d.data ?? [])).catch(() => {});
    fetch("/api/admin/refresh-pricing").then(r => r.json()).then(d => setPricingInfo(d.data ?? null)).catch(() => {});
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
      setNewProvider({ name: "", baseUrl: "", apiKey: "", supportText: true, supportImage: false, proxyUrl: "" });
    } catch {
      setError("操作失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAction(actionKey: string, actionLabel: string, actionType: string, providerId: string, modelName: string, manualPricing?: { inputPricePerM?: number; outputPricePerM?: number; pricePerCall?: number; priceCurrency?: string }) {
    try {
      const res = await fetch("/api/admin/ai-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionKey, actionLabel, actionType, providerId, modelName, ...manualPricing }),
      });
      const json = await res.json();
      if (!res.ok) {
        return { error: json.error, testFailed: json.testFailed };
      }
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
      return { pricingAvailable: json.pricingAvailable };
    } catch {
      return { error: "保存失败" };
    }
  }

  async function handleRefreshPricing() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/refresh-pricing", { method: "POST" });
      const json = await res.json();
      if (res.ok && json.data?.exchangeRate) {
        setPricingInfo({ usdToCny: json.data.exchangeRate.rate, lastUpdated: new Date().toISOString() });
      }
      // 刷新动作配置以获取最新价格
      const actionsRes = await fetch("/api/admin/ai-actions");
      const actionsJson = await actionsRes.json();
      setActions(actionsJson.data ?? []);
    } catch {
      setError("刷新失败");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <>
      <SetTopBar
        breadcrumb="管理后台"
        title="AI 服务配置"
      />

      {!canEdit && (
        <div className="admin-readonly-banner">
          该页面由管理员统一配置，您可以查看当前配置
        </div>
      )}

      {error && <div className="field-error" style={{ marginBottom: "var(--sp-4)" }}>{error}</div>}

      {/* 用量统计 */}
      <UsageStats />

      {/* 服务提供商 */}
      <div className="card--glass" style={{ padding: "var(--sp-5)", marginBottom: "var(--sp-5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--sp-4)" }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>AI 服务提供商</h3>
          {canEdit && <button className="btn btn--sm" onClick={() => setShowAddProvider(true)}>+ 添加</button>}
        </div>

        {providers.length === 0 && !showAddProvider && (
          <div className="muted" style={{ textAlign: "center", padding: "var(--sp-5) 0" }}>
            暂未配置提供商，请先添加。
          </div>
        )}

        <div style={{ display: "grid", gap: "var(--sp-3)" }}>
          {providers.map(p => (
            <ProviderCard
              key={p.id}
              provider={p}
              canEdit={canEdit}
              onUpdate={updated => setProviders(prev => prev.map(pp => pp.id === updated.id ? updated : pp))}
              onDelete={id => setProviders(prev => prev.filter(pp => pp.id !== id))}
            />
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-3)", marginBottom: "var(--sp-3)" }}>
              <div>
                <label className="field-label">API Key</label>
                <input className="input input--sm" type="password" value={newProvider.apiKey} onChange={e => setNewProvider(p => ({ ...p, apiKey: e.target.value }))} placeholder="sk-..." />
              </div>
              <div>
                <label className="field-label">代理地址（可选，留空直连）</label>
                <input className="input input--sm" value={newProvider.proxyUrl} onChange={e => setNewProvider(p => ({ ...p, proxyUrl: e.target.value }))} placeholder="socks5://127.0.0.1:1080" />
              </div>
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--sp-4)" }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>动作与模型映射</h3>
            <p className="muted small" style={{ marginTop: "var(--sp-1)" }}>
              保存时自动测试模型可用性并获取价格。
              {pricingInfo && (
                <span> · 汇率 1 USD = {pricingInfo.usdToCny.toFixed(2)} CNY
                  {pricingInfo.lastUpdated && ` · 更新于 ${new Date(pricingInfo.lastUpdated).toLocaleDateString()}`}
                </span>
              )}
            </p>
          </div>
          {canEdit && (
            <button className="btn btn--soft btn--sm" onClick={handleRefreshPricing} disabled={refreshing}>
              {refreshing ? "刷新中..." : "刷新价格"}
            </button>
          )}
        </div>

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
                currentPricing={existing ? {
                  inputPricePerM: existing.inputPricePerM,
                  outputPricePerM: existing.outputPricePerM,
                  pricePerCall: existing.pricePerCall,
                  pricingSource: existing.pricingSource,
                  pricingUpdatedAt: existing.pricingUpdatedAt,
                } : undefined}
                canEdit={canEdit}
                onSave={(providerId, modelName, manualPricing) => handleSaveAction(da.key, da.label, da.type, providerId, modelName, manualPricing)}
              />
            );
          })}
        </div>
      </div>
    </>
  );
}
