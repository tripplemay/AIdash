import https from "node:https";
import http from "node:http";
import { prisma } from "@/lib/prisma";
import { decryptApiKey } from "@/lib/crypto";
import { proxyFetch } from "@/lib/proxy-fetch";
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

export interface ChatStreamChunk {
  text: string;        // delta text for this chunk
  totalChars: number;  // running total of characters received
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
  chatStream?(params: ChatParams): AsyncGenerator<ChatStreamChunk, ChatResult>;
  generateImage?(params: ImageParams): Promise<ImageResult>;
}

// ─── SSE Parsing ───

interface SSEEvent {
  data: string;
}

/**
 * Parse SSE stream from a ReadableStream (native fetch) or NodeJS.ReadableStream (node:https).
 * Yields parsed SSE events. Handles partial lines across chunks and multi-event chunks.
 */
async function* parseSSEStream(
  stream: ReadableStream<Uint8Array> | NodeJS.ReadableStream,
): AsyncGenerator<SSEEvent> {
  let buffer = "";
  const decoder = new TextDecoder();

  if ("getReader" in stream) {
    // Web ReadableStream
    const reader = stream.getReader();
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = extractSSEEvents(buffer);
        buffer = events.remainder;
        for (const evt of events.parsed) {
          yield evt;
        }
      }
    } finally {
      reader.releaseLock();
    }
  } else {
    // Node.js ReadableStream (IncomingMessage)
    for await (const chunk of stream) {
      const text = typeof chunk === "string" ? chunk : decoder.decode(chunk as Buffer, { stream: true });
      buffer += text;
      const events = extractSSEEvents(buffer);
      buffer = events.remainder;
      for (const evt of events.parsed) {
        yield evt;
      }
    }
  }
}

/**
 * Extract complete SSE events from a buffer string.
 * SSE events are separated by double newlines. Returns parsed events and remaining buffer.
 */
function extractSSEEvents(buffer: string): { parsed: SSEEvent[]; remainder: string } {
  const parsed: SSEEvent[] = [];
  // Split on double newline (SSE event boundary)
  const parts = buffer.split(/\n\n/);
  // Last part may be incomplete
  const remainder = parts.pop() ?? "";

  for (const part of parts) {
    const lines = part.split("\n");
    let data = "";
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        data += (data ? "\n" : "") + line.slice(6);
      } else if (line.startsWith("data:")) {
        data += (data ? "\n" : "") + line.slice(5);
      }
    }
    if (data) {
      parsed.push({ data });
    }
  }

  return { parsed, remainder };
}

// ─── 从数据库获取 Provider 配置 ───

interface ProviderConfig {
  baseUrl: string;
  apiKey: string;
  protocol: string;
  supportImage: boolean;
  proxyUrl?: string | null;
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
          proxyUrl: config.provider.proxyUrl,
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
  const { apiKey, proxyUrl } = config;
  const base = config.baseUrl.replace(/\/+$/, "");
  const chatUrl = `${base}/chat/completions`;
  const imageUrl = `${base}/images/generations`;

  const commonHeaders: Record<string, string> = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://ai.dashedu.net",
    "X-Title": "AI Dash Course RnD",
  };

  return {
    async chat({ systemPrompt, userMessage, model, temperature = 0.7, maxTokens = 8192 }) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await proxyFetch(chatUrl, {
          method: "POST",
          headers: commonHeaders,
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
          proxyUrl,
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

    async *chatStream({ systemPrompt, userMessage, model, temperature = 0.7, maxTokens = 8192 }): AsyncGenerator<ChatStreamChunk, ChatResult> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const bodyPayload = JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature,
        max_tokens: maxTokens,
        stream: true,
        stream_options: { include_usage: true },
      });

      try {
        let sseStream: ReadableStream<Uint8Array> | NodeJS.ReadableStream;

        if (!proxyUrl?.trim()) {
          // Non-proxy: use native fetch with streaming
          const res = await fetch(chatUrl, {
            method: "POST",
            headers: commonHeaders,
            body: bodyPayload,
            signal: controller.signal,
          });
          if (!res.ok) {
            const text = await res.text();
            throw new Error(`API error ${res.status}: ${text}`);
          }
          if (!res.body) {
            throw new Error("Response body is null — streaming not supported");
          }
          sseStream = res.body;
        } else {
          // Proxy: use node:https/http with agent, return raw IncomingMessage as stream
          const trimmed = proxyUrl.trim();
          let agent: http.Agent | undefined;
          if (trimmed.startsWith("socks5://") || trimmed.startsWith("socks4://") || trimmed.startsWith("socks://")) {
            const { SocksProxyAgent } = await import("socks-proxy-agent");
            agent = new SocksProxyAgent(trimmed);
          } else if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            const { HttpsProxyAgent } = await import("https-proxy-agent");
            agent = new HttpsProxyAgent(trimmed);
          }

          sseStream = await new Promise<NodeJS.ReadableStream>((resolve, reject) => {
            const parsed = new URL(chatUrl);
            const mod = parsed.protocol === "https:" ? https : http;

            const req = mod.request(chatUrl, {
              method: "POST",
              headers: commonHeaders,
              agent,
              signal: controller.signal,
            }, (res) => {
              if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
                const chunks: Buffer[] = [];
                res.on("data", (chunk: Buffer) => chunks.push(chunk));
                res.on("end", () => {
                  reject(new Error(`API error ${res.statusCode}: ${Buffer.concat(chunks).toString()}`));
                });
                return;
              }
              resolve(res);
            });

            req.on("error", reject);
            req.write(bodyPayload);
            req.end();
          });
        }

        // Parse SSE events and yield chunks
        let fullContent = "";
        let totalChars = 0;
        let lastModel = model;
        let inputTokens = 0;
        let outputTokens = 0;

        for await (const event of parseSSEStream(sseStream)) {
          if (event.data === "[DONE]") break;

          try {
            const parsed = JSON.parse(event.data);

            // Extract model name
            if (parsed.model) lastModel = parsed.model;

            // Extract usage from final chunk (if provider includes it)
            if (parsed.usage) {
              inputTokens = parsed.usage.prompt_tokens ?? inputTokens;
              outputTokens = parsed.usage.completion_tokens ?? outputTokens;
            }

            // Extract delta content
            const delta = parsed.choices?.[0]?.delta?.content;
            if (typeof delta === "string" && delta.length > 0) {
              fullContent += delta;
              totalChars += delta.length;
              yield { text: delta, totalChars };
            }
          } catch {
            // Skip malformed JSON in SSE data
          }
        }

        // Estimate tokens if usage not provided by the API
        if (outputTokens === 0 && totalChars > 0) {
          outputTokens = Math.round(totalChars / 2.5);
        }

        return {
          content: fullContent,
          inputTokens,
          outputTokens,
          model: lastModel,
        };
      } finally {
        clearTimeout(timer);
      }
    },

    async generateImage({ prompt, model, size = "1792x1024" }) {
      // 先尝试 /chat/completions（Gemini 等模型通过 chat 生成图片）
      // 这是大多数 OpenRouter 图片模型的接口方式
      // 失败后再回退到 /images/generations（DALL-E 等传统接口）
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 120_000); // 2 分钟超时

      try {
        const chatRes = await proxyFetch(chatUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://ai.dashedu.net",
            "X-Title": "AI Dash Image Gen",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "user", content: `Generate a wide landscape image (aspect ratio approximately 16:9) based on this description. Only output the image, no text.\n\n${prompt}` },
            ],
          }),
          signal: controller.signal,
          proxyUrl,
        });

        if (chatRes.ok) {
          const chatJson = await chatRes.json();
          const message = chatJson.choices?.[0]?.message;

          // GPT-5-image 等模型：图片在 message.images 数组中
          if (Array.isArray(message?.images)) {
            for (const img of message.images) {
              if (img.type === "image_url" && img.image_url?.url) {
                return { url: img.image_url.url, model };
              }
              if (typeof img === "string" && img.startsWith("data:image/")) {
                return { url: img, model };
              }
            }
          }

          if (message?.content) {
            // Gemini 等模型：图片在 content 数组中
            if (Array.isArray(message.content)) {
              for (const part of message.content) {
                if (part.type === "image_url" && part.image_url?.url) {
                  return { url: part.image_url.url, model };
                }
                if (part.type === "image" && part.source?.data) {
                  return { url: `data:image/png;base64,${part.source.data}`, model };
                }
              }
            }
            // base64 data URL 在文本中
            const dataUrlMatch = (typeof message.content === "string" ? message.content : "")
              .match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
            if (dataUrlMatch) {
              return { url: dataUrlMatch[0], model };
            }
          }
        }
      } catch (e) {
        // chat 接口失败（非 abort），尝试回退
        if (e instanceof Error && e.name === "AbortError") {
          throw new Error("图片生成超时（2 分钟）");
        }
      } finally {
        clearTimeout(timer);
      }

      // 回退：/images/generations（DALL-E 等标准接口）
      const controller2 = new AbortController();
      const timer2 = setTimeout(() => controller2.abort(), 120_000);

      try {
        const res = await proxyFetch(imageUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ model, prompt, n: 1, size }),
          signal: controller2.signal,
          proxyUrl,
        });

        if (res.ok) {
          const json = await res.json();
          const url = json.data?.[0]?.url ?? json.data?.[0]?.b64_json;
          if (url) return { url, model };
        }

        const text = await res.text();
        throw new Error(`Image generation failed ${res.status}: ${text}`);
      } finally {
        clearTimeout(timer2);
      }

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
        proxyUrl: provider.proxyUrl,
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
