import { GET } from "@/app/api/slideshow/status/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    coursePackage: { findUnique: jest.fn() },
    slideshowDraft: { findMany: jest.fn() },
  },
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as jest.Mock;
const mockPkgFind = prisma.coursePackage.findUnique as jest.Mock;
const mockDraftFindMany = prisma.slideshowDraft.findMany as jest.Mock;

const session = { user: { id: "u-1", role: "admin" }, expires: "" };

const makeRequest = (params: string) => {
  const url = new URL(`http://localhost/api/slideshow/status?${params}`);
  const req = new Request(url) as unknown as import("next/server").NextRequest;
  (req as unknown as Record<string, unknown>).nextUrl = url;
  return req;
};

beforeEach(() => jest.clearAllMocks());

describe("GET /api/slideshow/status", () => {
  it("returns 403 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(makeRequest("slug=test-pkg"));
    expect(res.status).toBe(403);
  });

  it("returns 400 when missing slug", async () => {
    mockAuth.mockResolvedValue(session);
    const res = await GET(makeRequest(""));
    expect(res.status).toBe(400);
  });

  it("returns 404 when package not found", async () => {
    mockAuth.mockResolvedValue(session);
    mockPkgFind.mockResolvedValue(null);
    const res = await GET(makeRequest("slug=nonexistent"));
    expect(res.status).toBe(404);
  });

  it("returns 400 when package not published", async () => {
    mockAuth.mockResolvedValue(session);
    mockPkgFind.mockResolvedValue({ slug: "test", status: "draft", lessons: [] });
    const res = await GET(makeRequest("slug=test"));
    expect(res.status).toBe(400);
  });

  it("returns lesson status with progress info", async () => {
    mockAuth.mockResolvedValue(session);
    mockPkgFind.mockResolvedValue({
      slug: "test-pkg",
      title: "测试课程",
      status: "published",
      lessons: [
        { id: "l-1", lessonNo: 1, title: "第一课", contentData: '{"hero":{}}' },
        { id: "l-2", lessonNo: 2, title: "第二课", contentData: null },
        { id: "l-3", lessonNo: 3, title: "第三课", contentData: '{"hero":{}}' },
      ],
    });
    mockDraftFindMany.mockResolvedValue([
      { lessonId: "l-1", updatedAt: "2026-03-27", themeKey: "科技蓝", status: "completed", progress: null, errorMessage: null },
      { lessonId: "l-3", updatedAt: "2026-03-27", themeKey: "科技蓝", status: "generating", progress: '{"step":2,"total":5,"message":"正在生成第 3 页图片..."}', errorMessage: null },
    ]);

    const res = await GET(makeRequest("slug=test-pkg"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.lessons).toHaveLength(3);

    const [l1, l2, l3] = json.data.lessons;
    // l1: completed
    expect(l1.hasDraft).toBe(true);
    expect(l1.status).toBe("completed");
    // l2: no content, no draft
    expect(l2.hasDraft).toBe(false);
    expect(l2.status).toBe("idle");
    expect(l2.hasContent).toBe(false);
    // l3: generating with progress
    expect(l3.hasDraft).toBe(false); // hasDraft only true when completed
    expect(l3.status).toBe("generating");
    expect(l3.progress).toEqual({ step: 2, total: 5, message: "正在生成第 3 页图片..." });
  });
});
