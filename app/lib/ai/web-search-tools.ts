// ─── OpenAI Function Calling Tool Definition ───

export const WEB_SEARCH_TOOL = {
  type: "function" as const,
  function: {
    name: "web_search",
    description:
      "Search the web for current information. Use this when the user asks about recent events, real-time data, specific facts you are unsure about, or anything that may require up-to-date information.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query, in the language most likely to yield relevant results",
        },
      },
      required: ["query"],
    },
  },
};

// ─── Prompt-Based Fallback (for models without function calling) ───

const SEARCH_PATTERN = /^\[SEARCH:\s*(.+?)\]\s*$/m;

/**
 * Instruction appended to system prompt for models that may not support function calling.
 * Tells the model to output a special marker when it wants to search.
 */
export function getSearchFallbackInstruction(): string {
  return `\n\n如果你需要搜索网络获取最新信息，请在回答的第一行输出：[SEARCH: 搜索关键词]
然后等待搜索结果。仅在确实需要最新信息时使用搜索。`;
}

/**
 * Parse the model's output for a prompt-based search intent.
 * Returns the search query if found, null otherwise.
 */
export function parseSearchIntent(content: string): string | null {
  const match = content.match(SEARCH_PATTERN);
  return match ? match[1].trim() : null;
}

// ─── Search Result Formatting ───

/**
 * Format Tavily search results into a context string for the LLM's second call.
 * Includes numbered sources for citation.
 */
export function formatSearchResultsForLLM(
  results: Array<{ title: string; url: string; content: string }>
): string {
  if (results.length === 0) return "No search results found.";

  const formatted = results
    .map(
      (r, i) =>
        `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content}`
    )
    .join("\n\n");

  return formatted;
}

/**
 * Instruction telling the LLM how to use search results and cite sources.
 */
export function getCitationInstruction(): string {
  return `请根据以上搜索结果回答用户的问题。要求：
1. 在回答中使用 [1]、[2] 等标注引用来源
2. 确保引用编号与搜索结果编号对应
3. 回答要准确、全面，综合多个来源的信息
4. 使用 Markdown 格式组织回答`;
}
