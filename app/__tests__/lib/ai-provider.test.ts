import { createAiProvider, calculateCost, getModelForAction } from "@/lib/ai/provider";

// Mock fetch for OpenRouter
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => jest.clearAllMocks());

describe("createAiProvider", () => {
  it("calls OpenRouter with correct URL and headers", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "test response" } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 },
        model: "openai/gpt-4o-mini",
      }),
    });

    const provider = createAiProvider();
    const result = await provider.chat({
      systemPrompt: "You are a helper",
      userMessage: "Hello",
      model: "openai/gpt-4o-mini",
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(options.headers["Authorization"]).toContain("Bearer");
    expect(result.content).toBe("test response");
    expect(result.inputTokens).toBe(100);
    expect(result.outputTokens).toBe(50);
    expect(result.model).toBe("openai/gpt-4o-mini");
  });

  it("throws on API error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => "Rate limited",
    });

    const provider = createAiProvider();
    await expect(
      provider.chat({ systemPrompt: "", userMessage: "test", model: "openai/gpt-4o-mini" })
    ).rejects.toThrow();
  });

  it("throws on timeout", async () => {
    mockFetch.mockImplementation(() => new Promise((_, reject) =>
      setTimeout(() => reject(new Error("AbortError")), 100)
    ));

    const provider = createAiProvider({ timeoutMs: 50 });
    await expect(
      provider.chat({ systemPrompt: "", userMessage: "test", model: "openai/gpt-4o-mini" })
    ).rejects.toThrow();
  }, 5000);
});

describe("calculateCost", () => {
  it("calculates CNY cost correctly", () => {
    const cost = calculateCost({
      inputTokens: 1000,
      outputTokens: 500,
      inputPricePerMillion: 3.0,
      outputPricePerMillion: 15.0,
      usdToCny: 7.2,
    });
    // (1000 * 3.0 + 500 * 15.0) / 1_000_000 * 7.2
    // = (3000 + 7500) / 1_000_000 * 7.2
    // = 0.0105 * 7.2
    // = 0.0756
    expect(cost).toBeCloseTo(0.0756, 4);
  });

  it("returns 0 for zero tokens", () => {
    const cost = calculateCost({
      inputTokens: 0,
      outputTokens: 0,
      inputPricePerMillion: 3.0,
      outputPricePerMillion: 15.0,
      usdToCny: 7.2,
    });
    expect(cost).toBe(0);
  });
});

describe("getModelForAction", () => {
  it("returns configured model for known action", () => {
    const model = getModelForAction("generate_framework");
    expect(typeof model).toBe("string");
    expect(model.length).toBeGreaterThan(0);
  });

  it("returns default model for unknown action", () => {
    const model = getModelForAction("unknown_action");
    expect(typeof model).toBe("string");
  });
});
