import { GET } from "@/app/api/slideshow/download-all/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    coursePackage: { findUnique: jest.fn() },
    slideshowDraft: { findMany: jest.fn() },
    preset: { findMany: jest.fn() },
  },
}));
jest.mock("@/lib/slideshow/pptx-builder", () => ({
  buildPptx: jest.fn(),
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildPptx } from "@/lib/slideshow/pptx-builder";

const mockAuth = auth as jest.Mock;
const mockPkgFind = prisma.coursePackage.findUnique as jest.Mock;
const mockDraftFindMany = prisma.slideshowDraft.findMany as jest.Mock;
const mockPresetFindMany = prisma.preset.findMany as jest.Mock;
const mockBuildPptx = buildPptx as jest.Mock;

const session = { user: { id: "u-1", role: "rd_manager" }, expires: "" };

const makeRequest = (params: string) => {
  const url = new URL(`http://localhost/api/slideshow/download-all?${params}`);
  const req = new Request(url) as unknown as import("next/server").NextRequest;
  (req as unknown as Record<string, unknown>).nextUrl = url;
  return req;
};

beforeEach(() => jest.clearAllMocks());

describe("GET /api/slideshow/download-all", () => {
  it("returns 403 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(makeRequest("slug=test"));
    expect(res.status).toBe(403);
  });

  it("returns 400 when missing slug", async () => {
    mockAuth.mockResolvedValue(session);
    const res = await GET(makeRequest(""));
    expect(res.status).toBe(400);
  });

  it("returns 404 when no drafts exist", async () => {
    mockAuth.mockResolvedValue(session);
    mockPkgFind.mockResolvedValue({
      slug: "test", title: "Test", status: "published",
      lessons: [{ id: "l-1", lessonNo: 1, title: "Lesson 1" }],
    });
    mockDraftFindMany.mockResolvedValue([]);
    const res = await GET(makeRequest("slug=test"));
    expect(res.status).toBe(404);
  });

  it("returns zip with all pptx files", async () => {
    mockAuth.mockResolvedValue(session);
    mockPkgFind.mockResolvedValue({
      slug: "test-pkg", title: "测试课程", status: "published",
      lessons: [
        { id: "l-1", lessonNo: 1, title: "第一课" },
        { id: "l-2", lessonNo: 2, title: "第二课" },
      ],
    });
    mockDraftFindMany.mockResolvedValue([
      { lessonId: "l-1", themeKey: "科技蓝", contentJson: '{"slides":[]}' },
      { lessonId: "l-2", themeKey: "科技蓝", contentJson: '{"slides":[]}' },
    ]);
    mockPresetFindMany.mockResolvedValue([
      { name: "科技蓝", value: '{"background":"#0F1B2D","titleColor":"#7CB3FF","bodyColor":"#E0E8F0","accentColor":"#5B8DEF","titleFont":"Microsoft YaHei","bodyFont":"Microsoft YaHei","titleFontSize":36,"bodyFontSize":18,"layoutStyle":"tech","description":"蓝紫"}' },
    ]);
    mockBuildPptx.mockResolvedValue(Buffer.from("fake-pptx"));

    const res = await GET(makeRequest("slug=test-pkg"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/zip");
    expect(res.headers.get("Content-Disposition")).toContain(".zip");
    expect(mockBuildPptx).toHaveBeenCalledTimes(2);
  });
});
