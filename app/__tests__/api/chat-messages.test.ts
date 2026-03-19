import { POST } from "@/app/api/chat/conversations/[id]/messages/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    chatConversation: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    chatMessage: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    courseRndAiCallLog: {
      create: jest.fn(),
    },
  },
}));
jest.mock("@/lib/ai/provider", () => ({ getProviderAndModel: jest.fn() }));
jest.mock("@/lib/ai/pricing-service", () => ({
  calculateCallCostFromDb: jest.fn(),
}));
jest.mock("@/lib/ai/chat-prompts", () => ({
  getGeneralChatSystemPrompt: jest.fn(() => "system prompt"),
  getCourseDesignChatSystemPrompt: jest.fn(async () => "course design prompt"),
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getProviderAndModel } from "@/lib/ai/provider";
import { calculateCallCostFromDb } from "@/lib/ai/pricing-service";

const mockAuth = auth as jest.Mock;
const mockFindUnique = prisma.chatConversation.findUnique as jest.Mock;
const mockConvUpdate = prisma.chatConversation.update as jest.Mock;
const mockMsgCreate = prisma.chatMessage.create as jest.Mock;
const mockMsgFindMany = prisma.chatMessage.findMany as jest.Mock;
const mockLogCreate = prisma.courseRndAiCallLog.create as jest.Mock;
const mockGetProvider = getProviderAndModel as jest.Mock;
const mockCalcCost = calculateCallCostFromDb as jest.Mock;

const adminSession = { user: { id: "a-1", role: "admin" }, expires: "" };
const teacherSession = { user: { id: "t-1", role: "teacher" }, expires: "" };

const makeRequest = (body: object) =>
  new Request("http://localhost/api/chat/conversations/conv-1/messages", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

const paramsConv1 = { params: Promise.resolve({ id: "conv-1" }) };

async function readSSEResponse(res: Response): Promise<string> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }
  return text;
}

beforeEach(() => jest.clearAllMocks());

describe("POST /api/chat/conversations/[id]/messages", () => {
  it("returns 403 for unauthenticated user", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makeRequest({ content: "hello" }), paramsConv1);
    expect(res.status).toBe(403);
  });

  it("returns 400 for empty message content", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const res = await POST(makeRequest({ content: "  " }), paramsConv1);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("消息不能为空");
  });

  it("returns 400 for missing message content", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const res = await POST(makeRequest({}), paramsConv1);
    expect(res.status).toBe(400);
  });

  it("returns 404 for nonexistent conversation", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    mockFindUnique.mockResolvedValue(null);
    const res = await POST(makeRequest({ content: "hello" }), paramsConv1);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("对话不存在");
  });

  it("returns 403 for other user's conversation", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    mockFindUnique.mockResolvedValue({
      id: "conv-1",
      userId: "other-user",
      mode: "general",
    });
    const res = await POST(makeRequest({ content: "hello" }), paramsConv1);
    expect(res.status).toBe(403);
  });

  it("returns 503 when AI provider not configured", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    mockFindUnique.mockResolvedValue({
      id: "conv-1",
      userId: "t-1",
      mode: "general",
    });
    mockMsgCreate.mockResolvedValue({});
    mockMsgFindMany.mockResolvedValue([
      { role: "user", content: "hello" },
    ]);
    mockGetProvider.mockRejectedValue(new Error("AI 服务未配置"));
    const res = await POST(makeRequest({ content: "hello" }), paramsConv1);
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toBe("AI 服务未配置");
  });

  it("streams SSE response with delta and done events (non-streaming fallback)", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindUnique.mockResolvedValue({
      id: "conv-1",
      userId: "a-1",
      mode: "general",
    });
    mockMsgCreate.mockResolvedValue({});
    // Return 2+ messages so auto-title is NOT triggered
    mockMsgFindMany.mockResolvedValue([
      { role: "user", content: "older message" },
      { role: "assistant", content: "older reply" },
      { role: "user", content: "hello" },
    ]);
    const provider = {
      chat: jest.fn().mockResolvedValue({
        content: "AI reply",
        inputTokens: 10,
        outputTokens: 20,
        model: "test",
      }),
      // No chatStream — triggers fallback path
    };
    mockGetProvider.mockResolvedValue({ provider, model: "test-model" });
    mockCalcCost.mockResolvedValue(0.001);
    mockConvUpdate.mockResolvedValue({});
    mockLogCreate.mockResolvedValue({});

    const res = await POST(makeRequest({ content: "hello" }), paramsConv1);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");

    const text = await readSSEResponse(res);
    expect(text).toContain('"type":"delta"');
    expect(text).toContain('"text":"AI reply"');
    expect(text).toContain('"type":"done"');
    expect(text).toContain('"input":10');
    expect(text).toContain('"output":20');

    // Verify assistant message was saved
    expect(mockMsgCreate).toHaveBeenCalledTimes(2); // user + assistant
    // Verify cost log was created
    expect(mockLogCreate).toHaveBeenCalledTimes(1);
  });

  it("auto-generates title on first exchange (messageCount === 1)", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    mockFindUnique.mockResolvedValue({
      id: "conv-1",
      userId: "t-1",
      mode: "general",
    });
    mockMsgCreate.mockResolvedValue({});
    // Only 1 message — triggers auto-title
    mockMsgFindMany.mockResolvedValue([
      { role: "user", content: "hello" },
    ]);
    const provider = {
      chat: jest
        .fn()
        .mockResolvedValueOnce({
          content: "AI reply",
          inputTokens: 10,
          outputTokens: 20,
          model: "test",
        })
        .mockResolvedValueOnce({
          content: "Chat Title",
          inputTokens: 5,
          outputTokens: 5,
          model: "test",
        }),
    };
    mockGetProvider.mockResolvedValue({ provider, model: "test-model" });
    mockCalcCost.mockResolvedValue(0.001);
    mockConvUpdate.mockResolvedValue({});
    mockLogCreate.mockResolvedValue({});

    const res = await POST(makeRequest({ content: "hello" }), paramsConv1);
    const text = await readSSEResponse(res);

    expect(text).toContain('"type":"title"');
    expect(text).toContain('"title":"Chat Title"');
    // chat called twice: once for main reply, once for title
    expect(provider.chat).toHaveBeenCalledTimes(2);
  });

  it("uses course_design prompt for course_design mode", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    mockFindUnique.mockResolvedValue({
      id: "conv-1",
      userId: "t-1",
      mode: "course_design",
    });
    mockMsgCreate.mockResolvedValue({});
    mockMsgFindMany.mockResolvedValue([
      { role: "user", content: "older" },
      { role: "user", content: "design question" },
    ]);
    const provider = {
      chat: jest.fn().mockResolvedValue({
        content: "design reply",
        inputTokens: 10,
        outputTokens: 20,
        model: "test",
      }),
    };
    mockGetProvider.mockResolvedValue({ provider, model: "test-model" });
    mockCalcCost.mockResolvedValue(0.002);
    mockConvUpdate.mockResolvedValue({});
    mockLogCreate.mockResolvedValue({});

    const { getCourseDesignChatSystemPrompt } = require("@/lib/ai/chat-prompts");

    const res = await POST(makeRequest({ content: "design question" }), paramsConv1);
    await readSSEResponse(res);

    expect(getCourseDesignChatSystemPrompt).toHaveBeenCalled();
  });

  it("sends error event when AI call throws", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    mockFindUnique.mockResolvedValue({
      id: "conv-1",
      userId: "t-1",
      mode: "general",
    });
    mockMsgCreate.mockResolvedValue({});
    mockMsgFindMany.mockResolvedValue([
      { role: "user", content: "hello" },
    ]);
    const provider = {
      chat: jest.fn().mockRejectedValue(new Error("API timeout")),
    };
    mockGetProvider.mockResolvedValue({ provider, model: "test-model" });

    const res = await POST(makeRequest({ content: "hello" }), paramsConv1);
    expect(res.status).toBe(200); // SSE always returns 200, errors sent as events
    const text = await readSSEResponse(res);
    expect(text).toContain('"type":"error"');
    expect(text).toContain("API timeout");
  });
});
