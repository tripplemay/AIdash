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
  outputModalities?: string[];
  pricing?: { inputPerM: number; outputPerM: number };
}

interface ManualPricing {
  inputPricePerM?: number;
  outputPricePerM?: number;
  pricePerCall?: number;
  priceCurrency?: string;
}

interface Props {
  actionKey: string;
  actionLabel: string;
  actionType: string;
  providers: Provider[];
  currentProviderId: string;
  currentModelName: string;
  currentPricing?: {
    inputPricePerM: number | null;
    outputPricePerM: number | null;
    pricePerCall?: number | null;
    pricingSource: string | null;
    pricingUpdatedAt: string | null;
  };
  canEdit?: boolean;
  onSave: (providerId: string, modelName: string, manualPricing?: ManualPricing) => Promise<{ pricingAvailable?: boolean; testFailed?: boolean; error?: string }>;
}

export default function ActionMappingRow({
  actionKey, actionLabel, actionType, providers, currentProviderId, currentModelName, currentPricing, canEdit = true, onSave,
}: Props) {
  const [providerId, setProviderId] = useState(currentProviderId);
  const [modelName, setModelName] = useState(currentModelName);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  // 同步 props → state（actions 异步加载完成后 props 会更新）
  useEffect(() => { setProviderId(currentProviderId); }, [currentProviderId]);
  useEffect(() => { setModelName(currentModelName); }, [currentModelName]);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "ok" | "warn" | "error"; message: string } | null>(null);

  // 手动价格输入
  const [showManualPricing, setShowManualPricing] = useState(false);
  const [manualInputPrice, setManualInputPrice] = useState("");
  const [manualOutputPrice, setManualOutputPrice] = useState("");
  const [manualCallPrice, setManualCallPrice] = useState("");
  const [priceCurrency, setPriceCurrency] = useState<"USD" | "CNY">("USD");

  const changed = providerId !== currentProviderId || modelName !== currentModelName;
  const isImage = actionType === "image";

  const availableProviders = providers.filter(p =>
    isImage ? p.supportImage : p.supportText
  );

  // 跟踪当前应该加载哪个 provider 的模型（防止竞态）
  const [modelsForProviderId, setModelsForProviderId] = useState(currentProviderId);

  function handleProviderChange(newId: string) {
    setProviderId(newId);
    setModelName("");
    setModels([]);
    setModelsForProviderId(newId);
    setStatus(null);
  }

  // 统一的模型列表加载：监听 modelsForProviderId 变化
  useEffect(() => {
    if (!modelsForProviderId) {
      setModels([]);
      return;
    }
    let cancelled = false;
    setLoadingModels(true);
    fetch(`/api/admin/ai-providers/${modelsForProviderId}/models`)
      .then(r => r.json())
      .then(json => { if (!cancelled) setModels(json.data ?? []); })
      .catch(() => { if (!cancelled) setModels([]); })
      .finally(() => { if (!cancelled) setLoadingModels(false); });
    return () => { cancelled = true; };
  }, [modelsForProviderId]);

  // 当 props 中的 currentProviderId 变化时，同步更新
  useEffect(() => {
    setModelsForProviderId(currentProviderId);
  }, [currentProviderId]);

  async function handleSave() {
    if (!providerId || !modelName) return;
    setSaving(true);
    setStatus(null);
    const result = await onSave(providerId, modelName);
    setSaving(false);

    if (result.error) {
      setStatus({ type: "error", message: result.error });
    } else if (result.pricingAvailable === false) {
      setStatus({ type: "warn", message: "已保存，但无法自动获取价格" });
      setShowManualPricing(true);
    } else {
      setStatus({ type: "ok", message: "已保存" });
      setTimeout(() => setStatus(null), 3000);
    }
  }

  async function handleSaveManualPricing() {
    if (!providerId || !modelName) return;

    const manualPricing: ManualPricing = { priceCurrency };

    if (isImage) {
      const callPrice = parseFloat(manualCallPrice);
      if (isNaN(callPrice) || callPrice <= 0) return;
      manualPricing.pricePerCall = callPrice;
    } else {
      const inputP = parseFloat(manualInputPrice);
      const outputP = parseFloat(manualOutputPrice);
      if (isNaN(inputP) || isNaN(outputP) || inputP < 0 || outputP < 0) return;
      manualPricing.inputPricePerM = inputP;
      manualPricing.outputPricePerM = outputP;
    }

    setSaving(true);
    setStatus(null);
    const result = await onSave(providerId, modelName, manualPricing);
    setSaving(false);

    if (result.error) {
      setStatus({ type: "error", message: result.error });
    } else {
      setStatus({ type: "ok", message: "价格已保存" });
      setShowManualPricing(false);
      setManualInputPrice("");
      setManualOutputPrice("");
      setManualCallPrice("");
      setTimeout(() => setStatus(null), 3000);
    }
  }

  // 价格显示
  const hasTokenPricing = currentPricing?.inputPricePerM != null && currentPricing?.outputPricePerM != null;
  const hasCallPricing = currentPricing?.pricePerCall != null;
  const hasPricing = hasTokenPricing || hasCallPricing;
  const isManual = currentPricing?.pricingSource === "manual";

  return (
    <div className="action-mapping-row" style={{
      background: currentProviderId ? "var(--panel-solid)" : "var(--bg-faint)",
    }}>
      <div className="action-mapping-row__grid">
        <div className="action-mapping-row__label">
          <div style={{ fontSize: 13, fontWeight: 600 }}>{actionLabel}</div>
          <span className="pill pill--sm">{isImage ? "图片" : "文本"}</span>
        </div>
        <select
          className="select"
          style={{ height: 34, fontSize: 12 }}
          value={providerId}
          onChange={e => handleProviderChange(e.target.value)}
          disabled={!canEdit}
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
          actionType={actionType as "text" | "image"}
          loading={loadingModels}
          disabled={!canEdit}
        />
        {canEdit && (
          <button
            className="btn btn--sm"
            onClick={handleSave}
            disabled={saving || !changed || !providerId || !modelName}
            style={{ whiteSpace: "nowrap" }}
          >
            {saving ? "测试并保存中..." : currentProviderId ? "更新" : "保存"}
          </button>
        )}
      </div>

      {/* 状态提示 + 价格信息 */}
      <div className="action-mapping-row__meta">
        {status && (
          <span className={`action-mapping-row__status action-mapping-row__status--${status.type}`}>
            {status.message}
          </span>
        )}
        {hasPricing && !status && (
          <span style={{ fontSize: 11, display: "inline-flex", alignItems: "center", gap: "var(--sp-2)" }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: isManual ? "#e67e22" : "var(--green)", padding: "1px 6px", borderRadius: "var(--radius-sm)", background: isManual ? "#fef9e7" : "var(--green-light)" }}>
              {isManual ? "手动" : "自动"}
            </span>
            <span className="muted">
              {hasCallPricing
                ? `$${currentPricing!.pricePerCall!.toFixed(4)}/次`
                : `$${currentPricing!.inputPricePerM!.toFixed(2)}/M 输入 · $${currentPricing!.outputPricePerM!.toFixed(2)}/M 输出`
              }
            </span>
          </span>
        )}
        {!hasPricing && !status && currentProviderId && (
          <span className="muted" style={{ fontSize: 11 }}>未设置</span>
        )}
        {canEdit && currentProviderId && !showManualPricing && (
          <span style={{ display: "inline-flex", gap: "var(--sp-1)", marginLeft: "var(--sp-2)" }}>
            <button
              className="btn btn--ghost btn--xs"
              style={{ fontSize: 11 }}
              onClick={() => setShowManualPricing(true)}
            >
              {hasPricing ? "修改价格" : "手动设置价格"}
            </button>
            {isManual && (
              <button
                className="btn btn--ghost btn--xs"
                style={{ fontSize: 11 }}
                onClick={() => onSave(providerId, modelName)}
              >
                恢复自动
              </button>
            )}
          </span>
        )}
      </div>

      {/* 手动价格输入 */}
      {showManualPricing && canEdit && (
        <div style={{
          marginTop: "var(--sp-2)",
          padding: "var(--sp-3)",
          background: "var(--bg-faint)",
          borderRadius: "var(--radius-sm)",
          display: "flex",
          alignItems: "flex-end",
          gap: "var(--sp-2)",
          flexWrap: "wrap",
        }}>
          {isImage ? (
            <div style={{ display: "flex", alignItems: "flex-end", gap: "var(--sp-2)" }}>
              <div>
                <label className="field-label" style={{ fontSize: 11 }}>单次价格</label>
                <input
                  className="input input--sm"
                  style={{ width: 100 }}
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="0.00"
                  value={manualCallPrice}
                  onChange={e => setManualCallPrice(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "flex-end", gap: "var(--sp-2)" }}>
              <div>
                <label className="field-label" style={{ fontSize: 11 }}>输入价格 /M</label>
                <input
                  className="input input--sm"
                  style={{ width: 100 }}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={manualInputPrice}
                  onChange={e => setManualInputPrice(e.target.value)}
                />
              </div>
              <div>
                <label className="field-label" style={{ fontSize: 11 }}>输出价格 /M</label>
                <input
                  className="input input--sm"
                  style={{ width: 100 }}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={manualOutputPrice}
                  onChange={e => setManualOutputPrice(e.target.value)}
                />
              </div>
            </div>
          )}
          <div>
            <label className="field-label" style={{ fontSize: 11 }}>币种</label>
            <select
              className="select"
              style={{ height: 34, fontSize: 12, width: 80 }}
              value={priceCurrency}
              onChange={e => setPriceCurrency(e.target.value as "USD" | "CNY")}
            >
              <option value="USD">USD</option>
              <option value="CNY">CNY</option>
            </select>
          </div>
          <button
            className="btn btn--sm"
            onClick={handleSaveManualPricing}
            disabled={saving || (isImage ? !manualCallPrice : (!manualInputPrice || !manualOutputPrice))}
          >
            {saving ? "保存中..." : "保存价格"}
          </button>
          <button
            className="btn btn--soft btn--sm"
            onClick={() => setShowManualPricing(false)}
          >
            取消
          </button>
        </div>
      )}
    </div>
  );
}
