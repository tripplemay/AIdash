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

  it("returns lesson status correctly", async () => {
    mockAuth.mockResolvedValue(session);
    mockPkgFind.mockResolvedValue({
      slug: "test-pkg",
      title: "测试课程",
      status: "published",
      lessons: [
        { id: "l-1", lessonNo: 1, title: "第一课", contentData: '{"hero":{}}' },
        { id: "l-2", lessonNo: 2, title: "第二课", contentData: null },
      ],
    });
    mockDraftFindMany.mockResolvedValue([
      { lessonId: "l-1", updatedAt: "2026-03-27T00:00:00Z", themeKey: "科技蓝" },
    ]);

    const res = await GET(makeRequest("slug=test-pkg"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.packageTitle).toBe("测试课程");
    expect(json.data.lessons).toHaveLength(2);

    const [l1, l2] = json.data.lessons;
    expect(l1.hasDraft).toBe(true);
    expect(l1.hasContent).toBe(true);
    expect(l1.themeKey).toBe("科技蓝");
    expect(l2.hasDraft).toBe(false);
    expect(l2.hasContent).toBe(false);
  });
});
