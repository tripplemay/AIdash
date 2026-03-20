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
  { key: "chat", label: "AI 对话", type: "text" },
];

interface SystemConfigEntry {
  key: string;
  value: string;
  isConfigured: boolean;
}

export default function AiSettingsPage({ canEdit = true }: { canEdit?: boolean }) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [actions, setActions] = useState<ActionConfig[]>([]);
  const [pricingInfo, setPricingInfo] = useState<PricingInfo | null>(null);
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [newProvider, setNewProvider] = useState({ name: "", baseUrl: "", apiKey: "", supportText: true, supportImage: false, proxyUrl: "" });
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // External service keys
  const [tavilyKey, setTavilyKey] = useState("");
  const [tavilyConfigured, setTavilyConfigured] = useState(false);
  const [tavilyMasked, setTavilyMasked] = useState("");
  const [tavilySaving, setTavilySaving] = useState(false);
  const [tavilyTesting, setTavilyTesting] = useState(false);
  const [tavilyTestResult, setTavilyTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [exportToken, setExportToken] = useState("");
  const [exportConfigured, setExportConfigured] = useState(false);
  const [exportMasked, setExportMasked] = useState("");
  const [exportSaving, setExportSaving] = useState(false);
  const [exportResult, setExportResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/ai-providers").then(r => r.json()).then(d => setProviders(d.data ?? [])).catch(() => {});
    fetch("/api/admin/ai-actions").then(r => r.json()).then(d => setActions(d.data ?? [])).catch(() => {});
    fetch("/api/admin/refresh-pricing").then(r => r.json()).then(d => setPricingInfo(d.data ?? null)).catch(() => {});
    fetch("/api/admin/system-config").then(r => r.json()).then(json => {
      const configs: SystemConfigEntry[] = json.data ?? [];
      const tavily = configs.find(c => c.key === "tavily_api_key");
      if (tavily) {
        setTavilyConfigured(tavily.isConfigured);
        setTavilyMasked(tavily.value);
      }
      const exportTk = configs.find(c => c.key === "export_api_token");
      if (exportTk) {
        setExportConfigured(exportTk.isConfigured);
        setExportMasked(exportTk.value);
      }
    }).catch(() => {});
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

      {/* 外部服务密钥 */}
      <div className="card--glass" style={{ padding: "var(--sp-5)", marginBottom: "var(--sp-5)" }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: "var(--sp-4)" }}>外部服务密钥</h3>

        <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--sp-3)" }}>
          <div style={{ flex: 1 }}>
            <label className="field-label">
              Tavily API Key（联网搜索）
              {tavilyConfigured && (
                <span style={{ color: "var(--success)", fontSize: 12, marginLeft: "var(--sp-2)" }}>已配置</span>
              )}
              {!tavilyConfigured && (
                <span style={{ color: "var(--muted)", fontSize: 12, marginLeft: "var(--sp-2)" }}>未配置</span>
              )}
            </label>
            {canEdit ? (
              <input
                className="input input--sm"
                type="password"
                value={tavilyKey}
                onChange={e => { setTavilyKey(e.target.value); setTavilyTestResult(null); }}
                placeholder={tavilyConfigured ? tavilyMasked : "tvly-..."}
              />
            ) : (
              <div style={{ fontSize: 13, color: "var(--muted)" }}>{tavilyConfigured ? tavilyMasked : "未配置"}</div>
            )}
            {tavilyTestResult && (
              <div style={{ fontSize: 12, marginTop: "var(--sp-1)", color: tavilyTestResult.ok ? "var(--success)" : "var(--danger)" }}>
                {tavilyTestResult.message}
              </div>
            )}
          </div>
          {canEdit && (
            <div style={{ display: "flex", gap: "var(--sp-2)", marginTop: 22 }}>
              <button
                className="btn btn--sm"
                disabled={tavilySaving || !tavilyKey.trim()}
                onClick={async () => {
                  setTavilySaving(true);
                  try {
                    const res = await fetch("/api/admin/system-config", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ key: "tavily_api_key", value: tavilyKey.trim() }),
                    });
                    if (res.ok) {
                      setTavilyConfigured(true);
                      setTavilyMasked(tavilyKey.slice(0, 6) + "****" + tavilyKey.slice(-4));
                      setTavilyKey("");
                      setTavilyTestResult({ ok: true, message: "已保存" });
                    } else {
                      const json = await res.json();
                      setTavilyTestResult({ ok: false, message: json.error ?? "保存失败" });
                    }
                  } catch {
                    setTavilyTestResult({ ok: false, message: "保存失败" });
                  } finally {
                    setTavilySaving(false);
                  }
                }}
              >
                {tavilySaving ? "保存中..." : "保存"}
              </button>
              <button
                className="btn btn--soft btn--sm"
                disabled={tavilyTesting || (!tavilyKey.trim() && !tavilyConfigured)}
                onClick={async () => {
                  setTavilyTesting(true);
                  setTavilyTestResult(null);
                  try {
                    // If user entered a new key, save it first
                    if (tavilyKey.trim()) {
                      await fetch("/api/admin/system-config", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ key: "tavily_api_key", value: tavilyKey.trim() }),
                      });
                      setTavilyConfigured(true);
                      setTavilyMasked(tavilyKey.slice(0, 6) + "****" + tavilyKey.slice(-4));
                      setTavilyKey("");
                    }
                    // Test by calling a search
                    const res = await fetch("/api/admin/system-config/test-tavily", { method: "POST" });
                    const json = await res.json();
                    if (res.ok) {
                      setTavilyTestResult({ ok: true, message: `测试成功，返回 ${json.data?.resultCount ?? 0} 条结果` });
                    } else {
                      setTavilyTestResult({ ok: false, message: json.error ?? "测试失败" });
                    }
                  } catch {
                    setTavilyTestResult({ ok: false, message: "测试失败" });
                  } finally {
                    setTavilyTesting(false);
                  }
                }}
              >
                {tavilyTesting ? "测试中..." : "测试"}
              </button>
            </div>
          )}
        </div>
        <p className="muted small" style={{ marginTop: "var(--sp-2)" }}>
          配置后，问AI对话中 AI 将自动判断是否需要联网搜索。获取 Key：<a href="https://tavily.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>tavily.com</a>
        </p>

        {/* Export API Token */}
        <div style={{ marginTop: "var(--sp-5)", paddingTop: "var(--sp-4)", borderTop: "1px solid var(--line)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--sp-3)" }}>
            <div style={{ flex: 1 }}>
              <label className="field-label">
                Export API Token（ChatGPT GPTs 对接）
                {exportConfigured && (
                  <span style={{ color: "var(--success)", fontSize: 12, marginLeft: "var(--sp-2)" }}>已配置</span>
                )}
                {!exportConfigured && (
                  <span style={{ color: "var(--muted)", fontSize: 12, marginLeft: "var(--sp-2)" }}>未配置</span>
                )}
              </label>
              {canEdit ? (
                <input
                  className="input input--sm"
                  type="text"
                  value={exportToken}
                  onChange={e => { setExportToken(e.target.value); setExportResult(null); }}
                  placeholder={exportConfigured ? exportMasked : "输入或生成一个 64 位随机 Token"}
                  style={{ fontFamily: "monospace", fontSize: 12 }}
                />
              ) : (
                <div style={{ fontSize: 13, color: "var(--muted)" }}>{exportConfigured ? exportMasked : "未配置"}</div>
              )}
              {exportResult && (
                <div style={{ fontSize: 12, marginTop: "var(--sp-1)", color: exportResult.ok ? "var(--success)" : "var(--danger)" }}>
                  {exportResult.message}
                </div>
              )}
            </div>
            {canEdit && (
              <div style={{ display: "flex", gap: "var(--sp-2)", marginTop: 22 }}>
                <button
                  className="btn btn--soft btn--sm"
                  onClick={() => {
                    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
                    let token = "";
                    for (let i = 0; i < 64; i++) token += chars[Math.floor(Math.random() * chars.length)];
                    setExportToken(token);
                    setExportResult(null);
                  }}
                >
                  生成
                </button>
                <button
                  className="btn btn--soft btn--sm"
                  disabled={!exportToken.trim()}
                  onClick={() => {
                    navigator.clipboard.writeText(exportToken).then(() => {
                      setExportResult({ ok: true, message: "已复制到剪贴板" });
                    });
                  }}
                >
                  复制
                </button>
                <button
                  className="btn btn--sm"
                  disabled={exportSaving || !exportToken.trim()}
                  onClick={async () => {
                    setExportSaving(true);
                    try {
                      const res = await fetch("/api/admin/system-config", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ key: "export_api_token", value: exportToken.trim() }),
                      });
                      if (res.ok) {
                        setExportConfigured(true);
                        setExportMasked(exportToken.slice(0, 6) + "****" + exportToken.slice(-4));
                        setExportToken("");
                        setExportResult({ ok: true, message: "已保存" });
                      } else {
                        const json = await res.json();
                        setExportResult({ ok: false, message: json.error ?? "保存失败" });
                      }
                    } catch {
                      setExportResult({ ok: false, message: "保存失败" });
                    } finally {
                      setExportSaving(false);
                    }
                  }}
                >
                  {exportSaving ? "保存中..." : "保存"}
                </button>
              </div>
            )}
          </div>
          <p className="muted small" style={{ marginTop: "var(--sp-2)" }}>
            供 ChatGPT GPTs 通过 Export API 读取课程产出物。点击「生成」创建随机 Token，保存后在 GPTs Actions 中配置 Bearer 认证。
          </p>
        </div>
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
