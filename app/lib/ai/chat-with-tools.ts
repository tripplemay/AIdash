import type { AiProvider, ChatStreamChunk, ChatResult, ToolCall } from "./provider";
import { WEB_SEARCH_TOOL, getSearchFallbackInstruction, parseSearchIntent, formatSearchResultsForLLM, getCitationInstruction } from "./web-search-tools";
import { searchWeb } from "./tavily";
import { isTavilyConfigured } from "./tavily";

// ─── Types ───

export type ChatToolStreamEvent =
  | { type: "delta"; text: string }
  | { type: "searching"; query: string }
  | { type: "sources"; sources: Array<{ title: string; url: string }> }
  | { type: "done"; content: string; inputTokens: number; outputTokens: number; sources?: Array<{ title: string; url: string }> }
  | { type: "error"; message: string };

export interface ChatWithToolsParams {
  provider: AiProvider;
  model: string;
  messages: Array<{ role: string; content: string | null; tool_calls?: ToolCall[]; tool_call_id?: string }>;
  systemPrompt: string;
  userMessage: string;
}

// ─── Orchestrator ───

/**
 * Chat with optional web search tool.
 * Flow: LLM call 1 (with tools) → detect search intent → execute Tavily → LLM call 2 (with results) → stream answer.
 * If Tavily is not configured, behaves like a normal chat (no tools).
 */
export async function* chatWithToolsStream(
  params: ChatWithToolsParams
): AsyncGenerator<ChatToolStreamEvent> {
  const { provider, model, messages, systemPrompt, userMessage } = params;

  // Check if Tavily is configured
  const searchEnabled = await isTavilyConfigured();

  // Build API messages
  const apiMessages = [...messages];

  // If search is enabled, append fallback instruction to system prompt (belt-and-suspenders)
  const finalSystemPrompt = searchEnabled
    ? systemPrompt + getSearchFallbackInstruction()
    : systemPrompt;

  // Replace system prompt in messages
  if (apiMessages.length > 0 && apiMessages[0].role === "system") {
    apiMessages[0] = { ...apiMessages[0], content: finalSystemPrompt };
  }

  // Prepare tools
  const tools = searchEnabled ? [WEB_SEARCH_TOOL] : undefined;

  // ─── First LLM Call ───
  let firstCallResult: ChatResult;
  let firstCallContent = "";

  try {
    if (provider.chatStream) {
      const generator = provider.chatStream({
        systemPrompt: finalSystemPrompt,
        userMessage,
        model,
        messages: apiMessages,
        tools,
      });

      // Collect the first call's output
      // If tool_calls are returned, we won't yield deltas yet (the search needs to happen first)
      // If no tool_calls, yield deltas as they come
      const bufferedDeltas: string[] = [];

      while (true) {
        const iterResult = await generator.next();
        if (iterResult.done) {
          firstCallResult = iterResult.value;
          firstCallContent = firstCallResult.content;
          break;
        }
        bufferedDeltas.push(iterResult.value.text);
      }

      // Check if we got tool_calls
      if (firstCallResult!.toolCalls && firstCallResult!.toolCalls.length > 0) {
        // Don't yield buffered deltas — they might be partial/empty for tool calls
        // Proceed to search
      } else {
        // Check for prompt-based search intent in content
        const searchQuery = searchEnabled ? parseSearchIntent(firstCallContent) : null;
        if (searchQuery) {
          // Prompt-based fallback: don't yield the [SEARCH: ...] content
          // Proceed to search below
        } else {
          // No search needed — yield all buffered deltas
          for (const text of bufferedDeltas) {
            yield { type: "delta", text };
          }
          yield {
            type: "done",
            content: firstCallContent,
            inputTokens: firstCallResult!.inputTokens,
            outputTokens: firstCallResult!.outputTokens,
          };
          return;
        }
      }
    } else {
      // Non-streaming fallback
      firstCallResult = await provider.chat({
        systemPrompt: finalSystemPrompt,
        userMessage,
        model,
        messages: apiMessages,
        tools,
      });
      firstCallContent = firstCallResult.content;

      if (!firstCallResult.toolCalls?.length) {
        const searchQuery = searchEnabled ? parseSearchIntent(firstCallContent) : null;
        if (!searchQuery) {
          yield { type: "delta", text: firstCallContent };
          yield {
            type: "done",
            content: firstCallContent,
            inputTokens: firstCallResult.inputTokens,
            outputTokens: firstCallResult.outputTokens,
          };
          return;
        }
      }
    }
  } catch (e) {
    // If tools param caused an error (model doesn't support it), retry without tools
    const errMsg = e instanceof Error ? e.message : String(e);
    if (tools && (errMsg.includes("tools") || errMsg.includes("function") || errMsg.includes("400"))) {
      // Retry without tools, using prompt-based fallback only
      yield* chatWithoutTools(params, finalSystemPrompt);
      return;
    }
    yield { type: "error", message: `AI 调用失败：${errMsg}` };
    return;
  }

  // ─── Extract Search Query ───
  let searchQuery: string | null = null;

  // From tool_calls
  const webSearchCall = firstCallResult!.toolCalls?.find(
    (tc) => tc.function.name === "web_search"
  );
  if (webSearchCall) {
    try {
      const args = JSON.parse(webSearchCall.function.arguments);
      searchQuery = args.query ?? null;
    } catch {
      searchQuery = null;
    }
  }

  // From prompt-based fallback
  if (!searchQuery) {
    searchQuery = parseSearchIntent(firstCallContent);
  }

  if (!searchQuery) {
    // No search query extracted — yield original content
    yield { type: "delta", text: firstCallContent };
    yield {
      type: "done",
      content: firstCallContent,
      inputTokens: firstCallResult!.inputTokens,
      outputTokens: firstCallResult!.outputTokens,
    };
    return;
  }

  // ─── Execute Search ───
  yield { type: "searching", query: searchQuery };

  let searchResults: Array<{ title: string; url: string; content: string }> = [];
  try {
    const tavilyResponse = await searchWeb(searchQuery);
    searchResults = tavilyResponse.results;
  } catch (e) {
    // Search failed — continue without results, let LLM answer without web context
    const errMsg = e instanceof Error ? e.message : String(e);
    yield { type: "error", message: `搜索失败：${errMsg}，将直接回答。` };
  }

  const sources = searchResults.map((r) => ({ title: r.title, url: r.url }));
  if (sources.length > 0) {
    yield { type: "sources", sources };
  }

  // ─── Second LLM Call (with search results, NO tools) ───
  const searchContext = formatSearchResultsForLLM(searchResults);
  const citationInstruction = getCitationInstruction();

  // Build messages for second call
  const secondCallMessages: Array<{ role: string; content: string | null; tool_calls?: ToolCall[]; tool_call_id?: string }> = [...apiMessages];

  if (webSearchCall) {
    // Proper tool use flow: assistant message with tool_calls, then tool result message
    secondCallMessages.push({
      role: "assistant",
      content: null,
      tool_calls: [webSearchCall],
    });
    secondCallMessages.push({
      role: "tool",
      content: `${searchContext}\n\n${citationInstruction}`,
      tool_call_id: webSearchCall.id,
    });
  } else {
    // Prompt-based fallback: inject search results as a system message
    secondCallMessages.push({
      role: "assistant",
      content: `[SEARCH: ${searchQuery}]`,
    });
    secondCallMessages.push({
      role: "user",
      content: `以下是搜索结果：\n\n${searchContext}\n\n${citationInstruction}`,
    });
  }

  // Stream the second call (no tools to prevent infinite loop)
  let secondContent = "";
  let totalInputTokens = firstCallResult!.inputTokens;
  let totalOutputTokens = firstCallResult!.outputTokens;

  try {
    if (provider.chatStream) {
      const generator = provider.chatStream({
        systemPrompt: finalSystemPrompt,
        userMessage,
        model,
        messages: secondCallMessages,
      });

      while (true) {
        const iterResult = await generator.next();
        if (iterResult.done) {
          secondContent = iterResult.value.content;
          totalInputTokens += iterResult.value.inputTokens;
          totalOutputTokens += iterResult.value.outputTokens;
          break;
        }
        yield { type: "delta", text: iterResult.value.text };
      }
    } else {
      const result = await provider.chat({
        systemPrompt: finalSystemPrompt,
        userMessage,
        model,
        messages: secondCallMessages,
      });
      secondContent = result.content;
      totalInputTokens += result.inputTokens;
      totalOutputTokens += result.outputTokens;
      yield { type: "delta", text: secondContent };
    }

    yield {
      type: "done",
      content: secondContent,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      sources,
    };
  } catch (e) {
    yield { type: "error", message: `AI 调用失败：${e instanceof Error ? e.message : String(e)}` };
  }
}

// ─── Fallback: chat without tools (when model rejects tools param) ───

async function* chatWithoutTools(
  params: ChatWithToolsParams,
  systemPrompt: string,
): AsyncGenerator<ChatToolStreamEvent> {
  const { provider, model, messages, userMessage } = params;

  const apiMessages = [...messages];
  if (apiMessages.length > 0 && apiMessages[0].role === "system") {
    apiMessages[0] = { ...apiMessages[0], content: systemPrompt };
  }

  try {
    if (provider.chatStream) {
      const generator = provider.chatStream({
        systemPrompt,
        userMessage,
        model,
        messages: apiMessages,
      });

      let content = "";
      let result: ChatResult | undefined;

      while (true) {
        const iterResult = await generator.next();
        if (iterResult.done) {
          result = iterResult.value;
          content = result.content;
          break;
        }
        yield { type: "delta", text: iterResult.value.text };
      }

      // Check for prompt-based search intent
      const searchQuery = parseSearchIntent(content);
      if (searchQuery && result) {
        // Clear previously yielded deltas — unfortunately we can't un-yield,
        // but the [SEARCH: ...] text was already sent. For fallback, just proceed
        // with search and send a second response.
        yield { type: "searching", query: searchQuery };

        let searchResults: Array<{ title: string; url: string; content: string }> = [];
        try {
          const tavilyResponse = await searchWeb(searchQuery);
          searchResults = tavilyResponse.results;
        } catch {
          // Search failed, already yielded content
        }

        const sources = searchResults.map((r) => ({ title: r.title, url: r.url }));
        if (sources.length > 0) {
          yield { type: "sources", sources };
        }

        if (searchResults.length > 0) {
          // Second call with results
          const searchContext = formatSearchResultsForLLM(searchResults);
          const citationInstruction = getCitationInstruction();

          const secondMessages = [
            ...apiMessages,
            { role: "assistant" as const, content: `[SEARCH: ${searchQuery}]` },
            { role: "user" as const, content: `以下是搜索结果：\n\n${searchContext}\n\n${citationInstruction}` },
          ];

          const gen2 = provider.chatStream!({
            systemPrompt,
            userMessage,
            model,
            messages: secondMessages,
          });

          let secondContent = "";
          let totalInput = result.inputTokens;
          let totalOutput = result.outputTokens;

          while (true) {
            const ir = await gen2.next();
            if (ir.done) {
              secondContent = ir.value.content;
              totalInput += ir.value.inputTokens;
              totalOutput += ir.value.outputTokens;
              break;
            }
            yield { type: "delta", text: ir.value.text };
          }

          yield {
            type: "done",
            content: secondContent,
            inputTokens: totalInput,
            outputTokens: totalOutput,
            sources,
          };
          return;
        }
      }

      yield {
        type: "done",
        content,
        inputTokens: result!.inputTokens,
        outputTokens: result!.outputTokens,
      };
    } else {
      const result = await provider.chat({
        systemPrompt,
        userMessage,
        model,
        messages: apiMessages,
      });
      yield { type: "delta", text: result.content };
      yield {
        type: "done",
        content: result.content,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      };
    }
  } catch (e) {
    yield { type: "error", message: `AI 调用失败：${e instanceof Error ? e.message : String(e)}` };
  }
}
