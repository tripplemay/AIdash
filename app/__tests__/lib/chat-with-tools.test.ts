import { chatWithToolsStream, type ChatToolStreamEvent } from "@/lib/ai/chat-with-tools";
import type { AiProvider, ChatResult, ChatStreamChunk } from "@/lib/ai/provider";

// Mock tavily
jest.mock("@/lib/ai/tavily", () => ({
  isTavilyConfigured: jest.fn(),
  searchWeb: jest.fn(),
}));

import { isTavilyConfigured, searchWeb } from "@/lib/ai/tavily";

const mockIsTavilyConfigured = isTavilyConfigured as jest.Mock;
const mockSearchWeb = searchWeb as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

/** Helper: create a mock provider */
function createMockProvider(
  chatResult: ChatResult,
  streamChunks?: ChatStreamChunk[],
): AiProvider {
  return {
    chat: jest.fn().mockResolvedValue(chatResult),
    chatStream: streamChunks
      ? jest.fn().mockImplementation(function* () {
          for (const chunk of streamChunks) {
            yield chunk;
          }
          return chatResult;
        })
      : undefined,
  };
}

/** Helper: collect all events from the stream */
async function collectEvents(
  stream: AsyncGenerator<ChatToolStreamEvent>,
): Promise<ChatToolStreamEvent[]> {
  const events: ChatToolStreamEvent[] = [];
  for await (const event of stream) {
    events.push(event);
  }
  return events;
}

const baseParams = {
  model: "test-model",
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Hello" },
  ],
  systemPrompt: "You are a helpful assistant.",
  userMessage: "Hello",
};

describe("chatWithToolsStream", () => {
  it("passes through directly when Tavily is not configured", async () => {
    mockIsTavilyConfigured.mockResolvedValue(false);

    const result: ChatResult = {
      content: "Hello! How can I help?",
      inputTokens: 10,
      outputTokens: 20,
      model: "test-model",
    };
    const chunks = [
      { text: "Hello! ", totalChars: 7 },
      { text: "How can I help?", totalChars: 22 },
    ];

    const provider = createMockProvider(result, chunks);
    const events = await collectEvents(
      chatWithToolsStream({ ...baseParams, provider })
    );

    const deltas = events.filter((e) => e.type === "delta");
    expect(deltas).toHaveLength(2);
    expect((deltas[0] as { type: "delta"; text: string }).text).toBe("Hello! ");

    const done = events.find((e) => e.type === "done");
    expect(done).toBeDefined();
    expect((done as { type: "done"; content: string }).content).toBe("Hello! How can I help?");
  });

  it("passes through when LLM responds without tool calls", async () => {
    mockIsTavilyConfigured.mockResolvedValue(true);

    const result: ChatResult = {
      content: "2 + 2 = 4",
      inputTokens: 10,
      outputTokens: 5,
      model: "test-model",
    };
    const chunks = [{ text: "2 + 2 = 4", totalChars: 9 }];

    const provider = createMockProvider(result, chunks);
    const events = await collectEvents(
      chatWithToolsStream({ ...baseParams, provider })
    );

    // No searching event
    expect(events.find((e) => e.type === "searching")).toBeUndefined();

    const done = events.find((e) => e.type === "done");
    expect(done).toBeDefined();
  });

  it("executes search when LLM returns tool_calls", async () => {
    mockIsTavilyConfigured.mockResolvedValue(true);
    mockSearchWeb.mockResolvedValue({
      results: [
        { title: "News 1", url: "https://news.com/1", content: "Breaking news content" },
      ],
    });

    const firstResult: ChatResult = {
      content: "",
      inputTokens: 10,
      outputTokens: 5,
      model: "test-model",
      toolCalls: [
        {
          id: "call_1",
          function: { name: "web_search", arguments: '{"query":"latest news"}' },
        },
      ],
    };

    const secondResult: ChatResult = {
      content: "According to [1], here is the latest news.",
      inputTokens: 50,
      outputTokens: 20,
      model: "test-model",
    };

    // Provider with two different responses
    const provider: AiProvider = {
      chat: jest.fn().mockResolvedValue(firstResult),
      chatStream: jest.fn()
        .mockImplementationOnce(function* () {
          return firstResult;
        })
        .mockImplementationOnce(function* () {
          yield { text: "According to [1], here is the latest news.", totalChars: 43 };
          return secondResult;
        }),
    };

    const events = await collectEvents(
      chatWithToolsStream({ ...baseParams, provider })
    );

    // Should have searching event
    const searching = events.find((e) => e.type === "searching");
    expect(searching).toBeDefined();
    expect((searching as { type: "searching"; query: string }).query).toBe("latest news");

    // Should have sources event
    const sources = events.find((e) => e.type === "sources");
    expect(sources).toBeDefined();

    // Should have called searchWeb
    expect(mockSearchWeb).toHaveBeenCalledWith("latest news");

    // Should have delta from second call
    const deltas = events.filter((e) => e.type === "delta");
    expect(deltas.length).toBeGreaterThan(0);
  });

  it("handles search failure gracefully", async () => {
    mockIsTavilyConfigured.mockResolvedValue(true);
    mockSearchWeb.mockRejectedValue(new Error("Tavily API error 500: Internal Server Error"));

    const firstResult: ChatResult = {
      content: "",
      inputTokens: 10,
      outputTokens: 5,
      model: "test-model",
      toolCalls: [
        {
          id: "call_1",
          function: { name: "web_search", arguments: '{"query":"test search"}' },
        },
      ],
    };

    const secondResult: ChatResult = {
      content: "I could not search the web, but here is what I know.",
      inputTokens: 20,
      outputTokens: 15,
      model: "test-model",
    };

    const provider: AiProvider = {
      chat: jest.fn().mockResolvedValue(firstResult),
      chatStream: jest.fn()
        .mockImplementationOnce(function* () {
          return firstResult;
        })
        .mockImplementationOnce(function* () {
          yield { text: "I could not search the web, but here is what I know.", totalChars: 52 };
          return secondResult;
        }),
    };

    const events = await collectEvents(
      chatWithToolsStream({ ...baseParams, provider })
    );

    // Should have error event for search failure
    const errorEvent = events.find((e) => e.type === "error");
    expect(errorEvent).toBeDefined();
    expect((errorEvent as { type: "error"; message: string }).message).toContain("搜索失败");
  });

  it("detects prompt-based search intent as fallback", async () => {
    mockIsTavilyConfigured.mockResolvedValue(true);
    mockSearchWeb.mockResolvedValue({
      results: [
        { title: "Weather", url: "https://weather.com", content: "Sunny today" },
      ],
    });

    const firstResult: ChatResult = {
      content: "[SEARCH: weather today]",
      inputTokens: 10,
      outputTokens: 5,
      model: "test-model",
      // No toolCalls — model didn't use function calling
    };

    const secondResult: ChatResult = {
      content: "Based on [1], it is sunny today.",
      inputTokens: 30,
      outputTokens: 10,
      model: "test-model",
    };

    const provider: AiProvider = {
      chat: jest.fn().mockResolvedValue(firstResult),
      chatStream: jest.fn()
        .mockImplementationOnce(function* () {
          return firstResult;
        })
        .mockImplementationOnce(function* () {
          yield { text: "Based on [1], it is sunny today.", totalChars: 32 };
          return secondResult;
        }),
    };

    const events = await collectEvents(
      chatWithToolsStream({ ...baseParams, provider })
    );

    const searching = events.find((e) => e.type === "searching");
    expect(searching).toBeDefined();
    expect((searching as { type: "searching"; query: string }).query).toBe("weather today");
  });
});
