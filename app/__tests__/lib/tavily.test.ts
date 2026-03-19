import { searchWeb, isTavilyConfigured } from "@/lib/ai/tavily";

// Mock prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    systemConfig: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock crypto
jest.mock("@/lib/crypto", () => ({
  decryptApiKey: jest.fn((v: string) => `decrypted_${v}`),
}));

import { prisma } from "@/lib/prisma";

const mockFindUnique = prisma.systemConfig.findUnique as jest.Mock;

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("isTavilyConfigured", () => {
  it("returns true when API key is configured", async () => {
    mockFindUnique.mockResolvedValue({ key: "tavily_api_key", value: "encrypted_key" });
    expect(await isTavilyConfigured()).toBe(true);
  });

  it("returns false when API key is not configured", async () => {
    mockFindUnique.mockResolvedValue(null);
    expect(await isTavilyConfigured()).toBe(false);
  });

  it("returns false when value is empty", async () => {
    mockFindUnique.mockResolvedValue({ key: "tavily_api_key", value: "" });
    expect(await isTavilyConfigured()).toBe(false);
  });
});

describe("searchWeb", () => {
  it("throws when API key is not configured", async () => {
    mockFindUnique.mockResolvedValue(null);
    await expect(searchWeb("test query")).rejects.toThrow("Tavily API Key 未配置");
  });

  it("returns search results on success", async () => {
    mockFindUnique.mockResolvedValue({ key: "tavily_api_key", value: "enc_key" });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { title: "Result 1", url: "https://example.com/1", content: "Content 1" },
          { title: "Result 2", url: "https://example.com/2", content: "Content 2" },
        ],
      }),
    });

    const result = await searchWeb("test query");
    expect(result.results).toHaveLength(2);
    expect(result.results[0].title).toBe("Result 1");
    expect(result.results[0].url).toBe("https://example.com/1");

    // Verify fetch was called with correct params
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.tavily.com/search",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("test query"),
      })
    );
  });

  it("throws on API error", async () => {
    mockFindUnique.mockResolvedValue({ key: "tavily_api_key", value: "enc_key" });
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    });

    await expect(searchWeb("test")).rejects.toThrow("Tavily API error 401");
  });

  it("handles missing fields in results gracefully", async () => {
    mockFindUnique.mockResolvedValue({ key: "tavily_api_key", value: "enc_key" });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { title: "Only title" },
          {},
        ],
      }),
    });

    const result = await searchWeb("test");
    expect(result.results).toHaveLength(2);
    expect(result.results[0].title).toBe("Only title");
    expect(result.results[0].url).toBe("");
    expect(result.results[1].title).toBe("");
  });
});
