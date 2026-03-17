jest.mock("@/lib/prisma", () => ({
  prisma: {
    aiActionConfig: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    systemConfig: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

jest.mock("@/lib/crypto", () => ({
  decryptApiKey: jest.fn((enc: string) => `decrypted-${enc}`),
}));

jest.mock("@/lib/proxy-fetch", () => ({
  proxyFetch: jest.fn(),
}));

// Mock global fetch for refreshExchangeRate
const originalFetch = global.fetch;

import {
  calculateCallCostFromDb,
  getUsdToCny,
  fetchModelPricing,
  refreshExchangeRate,
  refreshAllActionPricing,
  testModel,
} from "@/lib/ai/pricing-service";
import { prisma } from "@/lib/prisma";
import { proxyFetch } from "@/lib/proxy-fetch";

const mockFindUniqueConfig = prisma.aiActionConfig.findUnique as jest.Mock;
const mockFindManyConfig = prisma.aiActionConfig.findMany as jest.Mock;
const mockUpdateConfig = prisma.aiActionConfig.update as jest.Mock;
const mockFindUniqueSysConfig = prisma.systemConfig.findUnique as jest.Mock;
const mockUpsertSysConfig = prisma.systemConfig.upsert as jest.Mock;
const mockProxyFetch = proxyFetch as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = originalFetch;
});

// ─── calculateCallCostFromDb ───

describe("calculateCallCostFromDb", () => {
  it("returns 0 when no config found for actionKey", async () => {
    mockFindUniqueConfig.mockResolvedValue(null);
    const cost = await calculateCallCostFromDb("unknown_action", 1000, 500);
    expect(cost).toBe(0);
  });

  it("calculates per-token cost for text model", async () => {
    mockFindUniqueConfig.mockResolvedValue({
      inputPricePerM: 3, // $3 per million input tokens
      outputPricePerM: 15, // $15 per million output tokens
      pricePerCall: null,
    });
    mockFindUniqueSysConfig.mockResolvedValue({ key: "usd_to_cny", value: "7.0" });

    const cost = await calculateCallCostFromDb("generate_framework", 1_000_000, 500_000);
    // USD cost = (1_000_000 * 3 + 500_000 * 15) / 1_000_000 = 3 + 7.5 = 10.5
    // CNY cost = 10.5 * 7.0 = 73.5
    expect(cost).toBeCloseTo(73.5);
  });

  it("calculates per-call cost for image model (pricePerCall field)", async () => {
    mockFindUniqueConfig.mockResolvedValue({
      inputPricePerM: null,
      outputPricePerM: null,
      pricePerCall: 0.04, // $0.04 per call
    });
    mockFindUniqueSysConfig.mockResolvedValue({ key: "usd_to_cny", value: "7.0" });

    const cost = await calculateCallCostFromDb("generate_image", 0, 0);
    // CNY cost = 0.04 * 7.0 = 0.28
    expect(cost).toBeCloseTo(0.28);
  });

  it("returns 0 when config exists but pricing fields are missing", async () => {
    mockFindUniqueConfig.mockResolvedValue({
      inputPricePerM: null,
      outputPricePerM: null,
      pricePerCall: null,
    });
    mockFindUniqueSysConfig.mockResolvedValue(null);

    const cost = await calculateCallCostFromDb("some_action", 1000, 500);
    expect(cost).toBe(0);
  });

  it("returns 0 when inputPricePerM is 0", async () => {
    mockFindUniqueConfig.mockResolvedValue({
      inputPricePerM: 0,
      outputPricePerM: 0,
      pricePerCall: null,
    });
    mockFindUniqueSysConfig.mockResolvedValue(null);

    const cost = await calculateCallCostFromDb("some_action_zero", 1000, 500);
    expect(cost).toBe(0);
  });
});

// ─── getUsdToCny ───

describe("getUsdToCny", () => {
  it("returns rate from DB config", async () => {
    mockFindUniqueSysConfig.mockResolvedValue({ key: "usd_to_cny", value: "7.30" });
    const rate = await getUsdToCny();
    expect(rate).toBeCloseTo(7.3);
  });

  it("returns fallback 7.24 when no DB config", async () => {
    mockFindUniqueSysConfig.mockResolvedValue(null);
    const rate = await getUsdToCny();
    expect(rate).toBe(7.24);
  });

  it("returns fallback 7.24 when DB value is non-numeric", async () => {
    mockFindUniqueSysConfig.mockResolvedValue({ key: "usd_to_cny", value: "invalid" });
    const rate = await getUsdToCny();
    expect(rate).toBe(7.24);
  });
});

// ─── fetchModelPricing ───

describe("fetchModelPricing", () => {
  it("returns pricing when model found with valid pricing", async () => {
    mockProxyFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: "gpt-4o",
            pricing: { prompt: "0.000005", completion: "0.000015" },
          },
        ],
      }),
    });

    const result = await fetchModelPricing("https://api.example.com/v1/", "key", "gpt-4o");
    expect(result).toEqual({
      inputPricePerM: 5,
      outputPricePerM: 15,
    });
  });

  it("returns null when API returns non-ok", async () => {
    mockProxyFetch.mockResolvedValue({ ok: false });
    const result = await fetchModelPricing("https://api.example.com/v1", "key", "gpt-4o");
    expect(result).toBeNull();
  });

  it("returns null when model not found in response", async () => {
    mockProxyFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: "other-model" }] }),
    });
    const result = await fetchModelPricing("https://api.example.com/v1", "key", "gpt-4o");
    expect(result).toBeNull();
  });

  it("returns null when pricing fields are missing", async () => {
    mockProxyFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ id: "gpt-4o", pricing: {} }],
      }),
    });
    const result = await fetchModelPricing("https://api.example.com/v1", "key", "gpt-4o");
    expect(result).toBeNull();
  });

  it("returns null when pricing values are NaN", async () => {
    mockProxyFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ id: "gpt-4o", pricing: { prompt: "abc", completion: "def" } }],
      }),
    });
    const result = await fetchModelPricing("https://api.example.com/v1", "key", "gpt-4o");
    expect(result).toBeNull();
  });

  it("returns null when proxyFetch throws", async () => {
    mockProxyFetch.mockRejectedValue(new Error("network error"));
    const result = await fetchModelPricing("https://api.example.com/v1", "key", "gpt-4o");
    expect(result).toBeNull();
  });

  it("strips trailing slashes from baseUrl", async () => {
    mockProxyFetch.mockResolvedValue({ ok: false });
    await fetchModelPricing("https://api.example.com/v1///", "key", "gpt-4o");
    expect(mockProxyFetch).toHaveBeenCalledWith(
      "https://api.example.com/v1/models",
      expect.any(Object),
    );
  });
});

// ─── refreshExchangeRate ───

describe("refreshExchangeRate", () => {
  it("fetches rate and upserts to DB", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ rates: { CNY: 7.25 } }),
    }) as jest.Mock;
    mockUpsertSysConfig.mockResolvedValue({});

    const result = await refreshExchangeRate();
    expect(result).toEqual({ rate: 7.25, source: "open.er-api.com" });
    expect(mockUpsertSysConfig).toHaveBeenCalledWith({
      where: { key: "usd_to_cny" },
      update: { value: "7.25" },
      create: { key: "usd_to_cny", value: "7.25" },
    });
  });

  it("throws when API returns non-ok", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as jest.Mock;
    await expect(refreshExchangeRate()).rejects.toThrow("汇率 API 返回 500");
  });

  it("throws when rate is not a valid number", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ rates: { CNY: null } }),
    }) as jest.Mock;
    await expect(refreshExchangeRate()).rejects.toThrow("汇率数据异常");
  });

  it("throws when rate is zero", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ rates: { CNY: 0 } }),
    }) as jest.Mock;
    await expect(refreshExchangeRate()).rejects.toThrow("汇率数据异常");
  });
});

// ─── refreshAllActionPricing ───

describe("refreshAllActionPricing", () => {
  it("skips actions with manual pricingSource", async () => {
    mockFindManyConfig.mockResolvedValue([
      { id: "1", actionKey: "manual_action", pricingSource: "manual", actionType: "text", provider: {} },
    ]);

    const results = await refreshAllActionPricing();
    expect(results).toEqual([{ actionKey: "manual_action", status: "skipped" }]);
  });

  it("skips actions with image actionType", async () => {
    mockFindManyConfig.mockResolvedValue([
      { id: "2", actionKey: "gen_image", pricingSource: "auto", actionType: "image", provider: {} },
    ]);

    const results = await refreshAllActionPricing();
    expect(results).toEqual([{ actionKey: "gen_image", status: "skipped" }]);
  });

  it("updates pricing when fetchModelPricing succeeds", async () => {
    mockFindManyConfig.mockResolvedValue([
      {
        id: "3",
        actionKey: "generate_framework",
        pricingSource: "auto",
        actionType: "text",
        modelName: "gpt-4o",
        provider: { apiKeyEnc: "enc-key", baseUrl: "https://api.example.com/v1", proxyUrl: null },
      },
    ]);
    mockProxyFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ id: "gpt-4o", pricing: { prompt: "0.000005", completion: "0.000015" } }],
      }),
    });
    mockUpdateConfig.mockResolvedValue({});

    const results = await refreshAllActionPricing();
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("updated");
    expect(results[0].pricing).toEqual({ inputPricePerM: 5, outputPricePerM: 15 });
    expect(mockUpdateConfig).toHaveBeenCalledWith({
      where: { id: "3" },
      data: expect.objectContaining({
        inputPricePerM: 5,
        outputPricePerM: 15,
        pricingSource: "auto",
      }),
    });
  });

  it("marks unavailable when pricing fetch fails", async () => {
    mockFindManyConfig.mockResolvedValue([
      {
        id: "4",
        actionKey: "some_action",
        pricingSource: "auto",
        actionType: "text",
        modelName: "unknown-model",
        provider: { apiKeyEnc: "enc-key", baseUrl: "https://api.example.com/v1", proxyUrl: null },
      },
    ]);
    mockProxyFetch.mockResolvedValue({ ok: false });

    const results = await refreshAllActionPricing();
    expect(results).toEqual([{ actionKey: "some_action", status: "unavailable" }]);
  });
});

// ─── testModel ───

describe("testModel", () => {
  it("returns success when model responds correctly", async () => {
    mockProxyFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "ok" } }],
      }),
    });

    const result = await testModel("https://api.example.com/v1", "key", "gpt-4o");
    expect(result).toEqual({ success: true });
  });

  it("returns failure when API returns non-ok", async () => {
    mockProxyFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    });

    const result = await testModel("https://api.example.com/v1", "key", "gpt-4o");
    expect(result.success).toBe(false);
    expect(result.error).toContain("API 返回 401");
    expect(result.error).toContain("Unauthorized");
  });

  it("returns failure when response has no valid content", async () => {
    mockProxyFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [] }),
    });

    const result = await testModel("https://api.example.com/v1", "key", "gpt-4o");
    expect(result.success).toBe(false);
    expect(result.error).toBe("模型未返回有效响应");
  });

  it("returns timeout error on AbortError", async () => {
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    mockProxyFetch.mockRejectedValue(abortError);

    const result = await testModel("https://api.example.com/v1", "key", "gpt-4o");
    expect(result.success).toBe(false);
    expect(result.error).toBe("模型响应超时（15 秒）");
  });

  it("returns error message on generic error", async () => {
    mockProxyFetch.mockRejectedValue(new Error("ECONNREFUSED"));

    const result = await testModel("https://api.example.com/v1", "key", "gpt-4o");
    expect(result.success).toBe(false);
    expect(result.error).toBe("ECONNREFUSED");
  });

  it("handles non-Error thrown values", async () => {
    mockProxyFetch.mockRejectedValue("string error");

    const result = await testModel("https://api.example.com/v1", "key", "gpt-4o");
    expect(result.success).toBe(false);
    expect(result.error).toBe("string error");
  });

  it("handles text() rejection on error response", async () => {
    mockProxyFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => { throw new Error("read failed"); },
    });

    const result = await testModel("https://api.example.com/v1", "key", "gpt-4o");
    expect(result.success).toBe(false);
    expect(result.error).toContain("API 返回 500");
  });
});
