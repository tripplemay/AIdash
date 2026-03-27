import { POST } from "@/app/api/slideshow/generate/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    lesson: { findUnique: jest.fn() },
    preset: { findUnique: jest.fn() },
    slideshowDraft: { upsert: jest.fn() },
  },
}));
// Mock the entire generate module to avoid async background execution in tests
jest.mock("@/lib/slideshow/generate", () => ({
  triggerGeneration: jest.fn(),
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { triggerGeneration } from "@/lib/slideshow/generate";

const mockAuth = auth as jest.Mock;
const mockLessonFind = prisma.lesson.findUnique as jest.Mock;
const mockTrigger = triggerGeneration as jest.Mock;

const session = { user: { id: "u-1", role: "rd_manager" }, expires: "" };

const makeRequest = (body: object) =>
  new Request("http://localhost/api/slideshow/generate", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  }) as unknown as import("next/server").NextRequest;

beforeEach(() => jest.clearAllMocks());

describe("POST /api/slideshow/generate", () => {
  it("returns 403 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makeRequest({ lessonId: "l-1", themeKey: "科技蓝" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when missing params", async () => {
    mockAuth.mockResolvedValue(session);
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("缺少必填参数");
  });

  it("triggers generation and returns immediately", async () => {
    mockAuth.mockResolvedValue(session);
    mockTrigger.mockResolvedValue({ draftId: "d-1" });

    const res = await POST(makeRequest({ lessonId: "l-1", themeKey: "科技蓝" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.draftId).toBe("d-1");
    expect(json.data.status).toBe("generating");
    expect(mockTrigger).toHaveBeenCalledWith({
      lessonId: "l-1",
      userId: "u-1",
      themeKey: "科技蓝",
    });
  });

  it("returns 500 when triggerGeneration throws", async () => {
    mockAuth.mockResolvedValue(session);
    mockTrigger.mockRejectedValue(new Error("课次不存在"));

    const res = await POST(makeRequest({ lessonId: "l-1", themeKey: "科技蓝" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("课次不存在");
  });
});
