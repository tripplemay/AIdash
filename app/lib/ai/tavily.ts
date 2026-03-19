import { prisma } from "@/lib/prisma";
import { decryptApiKey } from "@/lib/crypto";

// ─── Types ───

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
}

export interface TavilySearchResponse {
  results: TavilySearchResult[];
}

// ─── Config ───

const TAVILY_API_URL = "https://api.tavily.com/search";
const TAVILY_TIMEOUT_MS = 10_000;
const TAVILY_MAX_RESULTS = 5;

// ─── API Key ───

async function getTavilyApiKey(): Promise<string | null> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: "tavily_api_key" },
    });
    if (!config?.value) return null;
    return decryptApiKey(config.value);
  } catch {
    return null;
  }
}

/** Check whether Tavily is configured (API key exists in SystemConfig) */
export async function isTavilyConfigured(): Promise<boolean> {
  const key = await getTavilyApiKey();
  return !!key;
}

// ─── Search ───

/** Search the web via Tavily API. Returns empty results on failure. */
export async function searchWeb(query: string): Promise<TavilySearchResponse> {
  const apiKey = await getTavilyApiKey();
  if (!apiKey) {
    throw new Error("Tavily API Key 未配置。请管理员在「管理后台 → AI 服务配置」中设置。");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TAVILY_TIMEOUT_MS);

  try {
    const res = await fetch(TAVILY_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: TAVILY_MAX_RESULTS,
        include_answer: false,
        search_depth: "basic",
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Tavily API error ${res.status}: ${text}`);
    }

    const json = await res.json();
    const results: TavilySearchResult[] = (json.results ?? []).map(
      (r: { title?: string; url?: string; content?: string }) => ({
        title: r.title ?? "",
        url: r.url ?? "",
        content: r.content ?? "",
      })
    );

    return { results };
  } finally {
    clearTimeout(timer);
  }
}
