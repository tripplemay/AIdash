"use client";

import { useState, useEffect } from "react";
import ModelCombobox from "./ModelCombobox";

interface Provider {
  id: string;
  name: string;
  supportText: boolean;
  supportImage: boolean;
}

interface ModelOption {
  id: string;
  name: string;
  pricing?: { inputPerM: number; outputPerM: number };
}

interface Props {
  actionKey: string;
  actionLabel: string;
  actionType: string;
  providers: Provider[];
  currentProviderId: string;
  currentModelName: string;
  currentPricing?: { inputPricePerM: number | null; outputPricePerM: number | null; pricingSource: string | null; pricingUpdatedAt: string | null };
  onSave: (providerId: string, modelName: string) => Promise<{ pricingAvailable?: boolean; testFailed?: boolean; error?: string }>;
}

export default function ActionMappingRow({
  actionKey, actionLabel, actionType, providers, currentProviderId, currentModelName, currentPricing, onSave,
}: Props) {
  const [providerId, setProviderId] = useState(currentProviderId);
  const [modelName, setModelName] = useState(currentModelName);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "ok" | "warn" | "error"; message: string } | null>(null);
  const changed = providerId !== currentProviderId || modelName !== currentModelName;

  const availableProviders = providers.filter(p =>
    actionType === "image" ? p.supportImage : p.supportText
  );

  function handleProviderChange(newId: string) {
    setProviderId(newId);
    setModelName("");
    setModels([]);
    setStatus(null);
    if (!newId) return;

    setLoadingModels(true);
    fetch(`/api/admin/ai-providers/${newId}/models`)
      .then(r => r.json())
      .then(json => setModels(json.data ?? []))
      .catch(() => setModels([]))
      .finally(() => setLoadingModels(false));
  }

  // 首次加载已有配置时拉取模型列表
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
    setStatus(null);
    const result = await onSave(providerId, modelName);
    setSaving(false);

    if (result.error) {
      if (result.testFailed) {
        setStatus({ type: "error", message: result.error });
      } else {
        setStatus({ type: "error", message: result.error });
      }
    } else if (result.pricingAvailable === false) {
      setStatus({ type: "warn", message: "已保存，但无法自动获取价格" });
    } else {
      setStatus({ type: "ok", message: "已保存" });
      setTimeout(() => setStatus(null), 3000);
    }
  }

  // 价格显示
  const hasPricing = currentPricing?.inputPricePerM != null && currentPricing?.outputPricePerM != null;

  return (
    <div className="action-mapping-row" style={{
      background: currentProviderId ? "var(--panel-solid)" : "var(--bg-faint)",
    }}>
      <div className="action-mapping-row__grid">
        <div className="action-mapping-row__label">
          <div style={{ fontSize: 13, fontWeight: 600 }}>{actionLabel}</div>
          <span className="pill pill--sm">{actionType === "image" ? "图片" : "文本"}</span>
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
        <ModelCombobox
          models={models}
          value={modelName}
          onChange={setModelName}
          loading={loadingModels}
        />
        <button
          className="btn btn--sm"
          onClick={handleSave}
          disabled={saving || !changed || !providerId || !modelName}
          style={{ whiteSpace: "nowrap" }}
        >
          {saving ? "测试并保存中..." : currentProviderId ? "更新" : "保存"}
        </button>
      </div>

      {/* 状态提示 + 价格信息 */}
      <div className="action-mapping-row__meta">
        {status && (
          <span className={`action-mapping-row__status action-mapping-row__status--${status.type}`}>
            {status.message}
          </span>
        )}
        {hasPricing && !status && (
          <span className="muted" style={{ fontSize: 11 }}>
            ${currentPricing!.inputPricePerM!.toFixed(2)}/M 输入 · ${currentPricing!.outputPricePerM!.toFixed(2)}/M 输出
            {currentPricing!.pricingSource === "manual" && " (手动)"}
          </span>
        )}
      </div>
    </div>
  );
}
