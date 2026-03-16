import { prisma } from "@/lib/prisma";
import { decryptApiKey } from "@/lib/crypto";
import aiConfigFile from "@/config/ai-models.json";

// ─── Types ───

export interface ChatParams {
  systemPrompt: string;
  userMessage: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export interface ImageParams {
  prompt: string;
  model: string;
  size?: string;
}

export interface ImageResult {
  url: string;
  model: string;
}

export interface StreamCallbacks {
  onToken?: (tokenCount: number) => void;
  onDone?: (result: ChatResult) => void;
}

export interface AiProvider {
  chat(params: ChatParams): Promise<ChatResult>;
  generateImage?(params: ImageParams): Promise<ImageResult>;
}

// ─── 从数据库获取 Provider 配置 ───

interface ProviderConfig {
  baseUrl: string;
  apiKey: string;
  protocol: string;
  supportImage: boolean;
}

async function getProviderForAction(actionKey: string): Promise<{ provider: ProviderConfig; modelName: string } | null> {
  try {
    const config = await prisma.aiActionConfig.findUnique({
      where: { actionKey },
      include: { provider: true },
    });

    if (config?.provider) {
      return {
        provider: {
          baseUrl: config.provider.baseUrl,
          apiKey: decryptApiKey(config.provider.apiKeyEnc),
          protocol: config.provider.protocol,
          supportImage: config.provider.supportImage,
        },
        modelName: config.modelName,
      };
    }
  } catch {
    // 数据库查询失败
  }

  // 未配置：返回 null
  return null;
}

// ─── OpenAI 兼容 Provider ───

function createOpenAICompatProvider(config: ProviderConfig, timeoutMs = 180_000): AiProvider {
  const { baseUrl, apiKey } = config;
  const chatUrl = `${baseUrl}/chat/completions`;
  const imageUrl = `${baseUrl}/images/generations`;

  return {
    async chat({ systemPrompt, userMessage, model, temperature = 0.7, maxTokens = 8192 }) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetch(chatUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://ai.dashedu.net",
            "X-Title": "AI Dash Course RnD",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage },
            ],
            temperature,
            max_tokens: maxTokens,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`API error ${res.status}: ${text}`);
        }

        const json = await res.json();
        const choice = json.choices?.[0];

        return {
          content: choice?.message?.content ?? "",
          inputTokens: json.usage?.prompt_tokens ?? 0,
          outputTokens: json.usage?.completion_tokens ?? 0,
          model: json.model ?? model,
        };
      } finally {
        clearTimeout(timer);
      }
    },

    async generateImage({ prompt, model, size = "1024x1024" }) {
      const res = await fetch(imageUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model, prompt, n: 1, size }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Image API error ${res.status}: ${text}`);
      }

      const json = await res.json();
      const url = json.data?.[0]?.url ?? json.data?.[0]?.b64_json;
      if (!url) throw new Error("No image URL in response");

      return { url, model };
    },
  };
}

// ─── 公共 API ───

/** 创建默认 Provider 实例（从数据库第一个活跃 provider，无则报错） */
export async function createDefaultProvider(options?: { timeoutMs?: number }): Promise<AiProvider> {
  try {
    const provider = await prisma.aiProvider.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    });
    if (provider) {
      return createOpenAICompatProvider({
        baseUrl: provider.baseUrl,
        apiKey: decryptApiKey(provider.apiKeyEnc),
        protocol: provider.protocol,
        supportImage: provider.supportImage,
      }, options?.timeoutMs);
    }
  } catch {}

  throw new Error("AI 服务未配置。请管理员在「管理后台 → AI 服务配置」中添加服务提供商。");
}

/** @deprecated 仅用于测试，生产环境请使用 createDefaultProvider 或 getProviderAndModel */
export function createAiProvider(options?: { timeoutMs?: number }): AiProvider {
  return createOpenAICompatProvider({
    baseUrl: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY ?? "",
    protocol: "openai",
    supportImage: true,
  }, options?.timeoutMs);
}

/** 根据动作获取 Provider + 模型（从数据库读取，未配置时抛错） */
export async function getProviderAndModel(actionKey: string): Promise<{ provider: AiProvider; model: string }> {
  const config = await getProviderForAction(actionKey);
  if (!config) {
    throw new Error("AI 服务未配置。请管理员在「管理后台 → AI 服务配置」中添加服务提供商并配置动作映射。");
  }
  return {
    provider: createOpenAICompatProvider(config.provider),
    model: config.modelName,
  };
}

/** 获取动作对应的模型名（从 json fallback） */
export function getModelForAction(action: string): string {
  const actions = (aiConfigFile as { actions: Record<string, string> }).actions;
  return actions[action] ?? (aiConfigFile as { defaultModel: string }).defaultModel;
}

// ─── Cost calculation ───

interface CostParams {
  inputTokens: number;
  outputTokens: number;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  usdToCny: number;
}

export function calculateCost({ inputTokens, outputTokens, inputPricePerMillion, outputPricePerMillion, usdToCny }: CostParams): number {
  const usdCost = (inputTokens * inputPricePerMillion + outputTokens * outputPricePerMillion) / 1_000_000;
  return usdCost * usdToCny;
}

export function getModelPricing(modelName: string): { inputPrice: number; outputPrice: number } | null {
  const models = (aiConfigFile as { models: Record<string, { inputPrice: { value: number }; outputPrice: { value: number } }> }).models;
  const model = models[modelName];
  if (!model) return null;
  return { inputPrice: model.inputPrice.value, outputPrice: model.outputPrice.value };
}

export function getUsdToCny(): number {
  return (aiConfigFile as { usdToCny: { value: number } }).usdToCny.value;
}

export function calculateCallCost(modelName: string, inputTokens: number, outputTokens: number): number {
  const pricing = getModelPricing(modelName);
  if (!pricing) return 0;
  return calculateCost({
    inputTokens, outputTokens,
    inputPricePerMillion: pricing.inputPrice,
    outputPricePerMillion: pricing.outputPrice,
    usdToCny: getUsdToCny(),
  });
}
