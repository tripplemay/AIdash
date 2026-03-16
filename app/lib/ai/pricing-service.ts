import { prisma } from "@/lib/prisma";
import { decryptApiKey } from "@/lib/crypto";

// ─── 汇率刷新 ───

export async function refreshExchangeRate(): Promise<{ rate: number; source: string }> {
  const res = await fetch("https://open.er-api.com/v6/latest/USD", {
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`汇率 API 返回 ${res.status}`);
  }

  const json = await res.json();
  const rate = json.rates?.CNY;
  if (typeof rate !== "number" || rate <= 0) {
    throw new Error("汇率数据异常");
  }

  await prisma.systemConfig.upsert({
    where: { key: "usd_to_cny" },
    update: { value: String(rate) },
    create: { key: "usd_to_cny", value: String(rate) },
  });

  return { rate, source: "open.er-api.com" };
}

// ─── 获取当前汇率 ───

export async function getUsdToCny(): Promise<number> {
  const config = await prisma.systemConfig.findUnique({ where: { key: "usd_to_cny" } });
  return config ? parseFloat(config.value) || 7.24 : 7.24;
}

// ─── 单个模型价格获取 ───

interface ModelPricing {
  inputPricePerM: number;
  outputPricePerM: number;
}

/** 从提供商 API 获取指定模型的价格 */
export async function fetchModelPricing(
  baseUrl: string,
  apiKey: string,
  modelName: string,
): Promise<ModelPricing | null> {
  try {
    const base = baseUrl.replace(/\/+$/, "");
    const res = await fetch(`${base}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) return null;

    const json = await res.json();
    const models = json.data as Array<{
      id: string;
      pricing?: { prompt?: string; completion?: string };
    }>;

    const model = models?.find(m => m.id === modelName);
    if (!model?.pricing?.prompt || !model?.pricing?.completion) return null;

    // OpenRouter pricing 是 USD per token，转换为 per million
    const inputPerToken = parseFloat(model.pricing.prompt);
    const outputPerToken = parseFloat(model.pricing.completion);

    if (isNaN(inputPerToken) || isNaN(outputPerToken)) return null;

    return {
      inputPricePerM: inputPerToken * 1_000_000,
      outputPricePerM: outputPerToken * 1_000_000,
    };
  } catch {
    return null;
  }
}

// ─── 刷新所有已配置动作的价格 ───

interface RefreshResult {
  actionKey: string;
  status: "updated" | "unavailable" | "skipped";
  pricing?: ModelPricing;
}

export async function refreshAllActionPricing(): Promise<RefreshResult[]> {
  const actions = await prisma.aiActionConfig.findMany({
    include: { provider: true },
  });

  const results: RefreshResult[] = [];

  for (const action of actions) {
    // 手动设置的价格不自动覆盖
    if (action.pricingSource === "manual") {
      results.push({ actionKey: action.actionKey, status: "skipped" });
      continue;
    }

    const apiKey = decryptApiKey(action.provider.apiKeyEnc);
    const pricing = await fetchModelPricing(
      action.provider.baseUrl,
      apiKey,
      action.modelName,
    );

    if (pricing) {
      await prisma.aiActionConfig.update({
        where: { id: action.id },
        data: {
          inputPricePerM: pricing.inputPricePerM,
          outputPricePerM: pricing.outputPricePerM,
          pricingSource: "auto",
          pricingUpdatedAt: new Date(),
        },
      });
      results.push({ actionKey: action.actionKey, status: "updated", pricing });
    } else {
      results.push({ actionKey: action.actionKey, status: "unavailable" });
    }
  }

  return results;
}

// ─── 模型测试（发送极简请求验证可用性） ───

export async function testModel(
  baseUrl: string,
  apiKey: string,
  modelName: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const base = baseUrl.replace(/\/+$/, "");
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: "user", content: "reply ok" }],
        max_tokens: 5,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { success: false, error: `API 返回 ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}` };
    }

    const json = await res.json();
    if (!json.choices?.[0]?.message?.content) {
      return { success: false, error: "模型未返回有效响应" };
    }

    return { success: true };
  } catch (e) {
    const message = e instanceof Error
      ? (e.name === "AbortError" ? "模型响应超时（15 秒）" : e.message)
      : String(e);
    return { success: false, error: message };
  }
}

// ─── DB-backed 费用计算 ───

export async function calculateCallCostFromDb(
  actionKey: string,
  inputTokens: number,
  outputTokens: number,
): Promise<number> {
  const config = await prisma.aiActionConfig.findUnique({
    where: { actionKey },
  });

  if (!config?.inputPricePerM || !config?.outputPricePerM) {
    return 0;
  }

  const usdToCny = await getUsdToCny();
  const usdCost = (inputTokens * config.inputPricePerM + outputTokens * config.outputPricePerM) / 1_000_000;
  return usdCost * usdToCny;
}
