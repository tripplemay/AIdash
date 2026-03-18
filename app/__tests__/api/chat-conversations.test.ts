import { GET, POST } from "@/app/api/chat/conversations/route";
import { GET as GET_DETAIL, PATCH, DELETE } from "@/app/api/chat/conversations/[id]/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    chatConversation: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as jest.Mock;
const mockFindMany = prisma.chatConversation.findMany as jest.Mock;
const mockFindUnique = prisma.chatConversation.findUnique as jest.Mock;
const mockCreate = prisma.chatConversation.create as jest.Mock;
const mockUpdate = prisma.chatConversation.update as jest.Mock;
const mockDelete = prisma.chatConversation.delete as jest.Mock;

const adminSession = { user: { id: "u1", role: "admin" }, expires: "" };
const teacherSession = { user: { id: "u2", role: "teacher" }, expires: "" };

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });
const makeRequest = (body?: object) => new Request("http://localhost/api/chat/conversations", {
  method: "POST",
  body: body ? JSON.stringify(body) : undefined,
  headers: { "Content-Type": "application/json" },
});

beforeEach(() => jest.clearAllMocks());

describe("GET /api/chat/conversations", () => {
  it("returns conversations for authenticated user", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindMany.mockResolvedValue([
      { id: "c1", title: "对话1", mode: "general", updatedAt: new Date() },
    ]);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
  });

  it("returns 403 for unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(403);
  });
});

describe("POST /api/chat/conversations", () => {
  it("creates conversation with valid mode", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockCreate.mockResolvedValue({ id: "c-new", title: "新对话", mode: "general" });
    const res = await POST(makeRequest({ mode: "general" }));
    expect(res.status).toBe(201);
  });

  it("creates course_design conversation", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    mockCreate.mockResolvedValue({ id: "c-new", title: "新对话", mode: "course_design" });
    const res = await POST(makeRequest({ mode: "course_design" }));
    expect(res.status).toBe(201);
  });

  it("rejects invalid mode", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const res = await POST(makeRequest({ mode: "invalid" }));
    expect(res.status).toBe(400);
  });
});

describe("GET /api/chat/conversations/[id]", () => {
  it("returns conversation with messages", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindUnique.mockResolvedValue({
      id: "c1", userId: "u1", title: "测试", mode: "general",
      messages: [{ id: "m1", role: "user", content: "hello", createdAt: new Date() }],
    });
    const res = await GET_DETAIL(new Request("http://localhost"), makeParams("c1"));
    expect(res.status).toBe(200);
  });

  it("returns 403 for other user's conversation", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindUnique.mockResolvedValue({ id: "c1", userId: "other-user" });
    const res = await GET_DETAIL(new Request("http://localhost"), makeParams("c1"));
    expect(res.status).toBe(403);
  });

  it("returns 404 for missing conversation", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindUnique.mockResolvedValue(null);
    const res = await GET_DETAIL(new Request("http://localhost"), makeParams("nonexistent"));
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/chat/conversations/[id]", () => {
  it("renames conversation", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindUnique.mockResolvedValue({ id: "c1", userId: "u1" });
    mockUpdate.mockResolvedValue({ id: "c1", title: "新标题" });
    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ title: "新标题" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, makeParams("c1"));
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/chat/conversations/[id]", () => {
  it("deletes own conversation", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindUnique.mockResolvedValue({ id: "c1", userId: "u1" });
    mockDelete.mockResolvedValue({ id: "c1" });
    const res = await DELETE(new Request("http://localhost"), makeParams("c1"));
    expect(res.status).toBe(200);
  });

  it("returns 403 for other user's conversation", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindUnique.mockResolvedValue({ id: "c1", userId: "other-user" });
    const res = await DELETE(new Request("http://localhost"), makeParams("c1"));
    expect(res.status).toBe(403);
  });
});
