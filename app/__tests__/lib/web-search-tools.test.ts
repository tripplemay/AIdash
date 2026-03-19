import {
  WEB_SEARCH_TOOL,
  getSearchFallbackInstruction,
  parseSearchIntent,
  formatSearchResultsForLLM,
  getCitationInstruction,
} from "@/lib/ai/web-search-tools";

describe("WEB_SEARCH_TOOL", () => {
  it("has correct structure", () => {
    expect(WEB_SEARCH_TOOL.type).toBe("function");
    expect(WEB_SEARCH_TOOL.function.name).toBe("web_search");
    expect(WEB_SEARCH_TOOL.function.parameters.required).toContain("query");
  });
});

describe("getSearchFallbackInstruction", () => {
  it("returns a non-empty string containing [SEARCH:", () => {
    const instruction = getSearchFallbackInstruction();
    expect(instruction).toContain("[SEARCH:");
    expect(instruction.length).toBeGreaterThan(10);
  });
});

describe("parseSearchIntent", () => {
  it("extracts search query from valid pattern", () => {
    expect(parseSearchIntent("[SEARCH: 最新AI新闻]")).toBe("最新AI新闻");
  });

  it("extracts query from multiline content", () => {
    const content = "[SEARCH: weather today]\nSome other text";
    expect(parseSearchIntent(content)).toBe("weather today");
  });

  it("returns null for content without search pattern", () => {
    expect(parseSearchIntent("Hello, how are you?")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseSearchIntent("")).toBeNull();
  });

  it("returns null for similar but incorrect patterns", () => {
    expect(parseSearchIntent("SEARCH: something")).toBeNull();
    expect(parseSearchIntent("[SEARCH something]")).toBeNull();
  });

  it("trims whitespace from extracted query", () => {
    expect(parseSearchIntent("[SEARCH:   spaced query   ]")).toBe("spaced query");
  });
});

describe("formatSearchResultsForLLM", () => {
  it("formats results with numbered citations", () => {
    const results = [
      { title: "Title 1", url: "https://a.com", content: "Content 1" },
      { title: "Title 2", url: "https://b.com", content: "Content 2" },
    ];
    const formatted = formatSearchResultsForLLM(results);
    expect(formatted).toContain("[1] Title 1");
    expect(formatted).toContain("[2] Title 2");
    expect(formatted).toContain("URL: https://a.com");
  });

  it("returns fallback for empty results", () => {
    expect(formatSearchResultsForLLM([])).toContain("No search results");
  });
});

describe("getCitationInstruction", () => {
  it("mentions citation format", () => {
    const instruction = getCitationInstruction();
    expect(instruction).toContain("[1]");
    expect(instruction).toContain("[2]");
  });
});
