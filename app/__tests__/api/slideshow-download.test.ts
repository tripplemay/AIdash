import { GET } from "@/app/api/slideshow/download/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    slideshowDraft: { findUnique: jest.fn() },
    preset: { findUnique: jest.fn() },
  },
}));
jest.mock("@/lib/slideshow/pptx-builder", () => ({
  buildPptx: jest.fn(),
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildPptx } from "@/lib/slideshow/pptx-builder";

const mockAuth = auth as jest.Mock;
const mockDraftFind = prisma.slideshowDraft.findUnique as jest.Mock;
const mockPresetFind = prisma.preset.findUnique as jest.Mock;
const mockBuildPptx = buildPptx as jest.Mock;

const session = { user: { id: "u-1", role: "teacher" }, expires: "" };

const makeRequest = (params: string) => {
  const url = new URL(`http://localhost/api/slideshow/download?${params}`);
  const req = new Request(url) as unknown as import("next/server").NextRequest;
  (req as unknown as Record<string, unknown>).nextUrl = url;
  return req;
};

beforeEach(() => jest.clearAllMocks());

describe("GET /api/slideshow/download", () => {
  it("returns 403 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(makeRequest("lessonId=l-1"));
    expect(res.status).toBe(403);
  });

  it("returns 400 when missing lessonId", async () => {
    mockAuth.mockResolvedValue(session);
    const res = await GET(makeRequest(""));
    expect(res.status).toBe(400);
  });

  it("returns 404 when no draft exists", async () => {
    mockAuth.mockResolvedValue(session);
    mockDraftFind.mockResolvedValue(null);
    const res = await GET(makeRequest("lessonId=l-1"));
    expect(res.status).toBe(404);
  });

  it("downloads pptx successfully", async () => {
    mockAuth.mockResolvedValue(session);
    mockDraftFind.mockResolvedValue({
      id: "d-1",
      themeKey: "科技蓝",
      contentJson: JSON.stringify({ slides: [{ type: "cover", title: "Test" }] }),
      lesson: {
        lessonNo: 1,
        title: "色彩的秘密",
        package: { title: "创意课程" },
      },
    });
    mockPresetFind.mockResolvedValue({
      name: "科技蓝",
      value: JSON.stringify({
        description: "蓝紫",
        background: "#0F1B2D",
        titleColor: "#7CB3FF",
        bodyColor: "#E0E8F0",
        accentColor: "#5B8DEF",
        titleFont: "Microsoft YaHei",
        bodyFont: "Microsoft YaHei",
        titleFontSize: 36,
        bodyFontSize: 18,
        layoutStyle: "tech",
      }),
    });
    mockBuildPptx.mockResolvedValue(Buffer.from("fake-pptx-data"));

    const res = await GET(makeRequest("lessonId=l-1"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("presentationml");
    expect(res.headers.get("Content-Disposition")).toContain(".pptx");
    expect(mockBuildPptx).toHaveBeenCalledWith(
      { slides: [{ type: "cover", title: "Test" }] },
      expect.objectContaining({ background: "#0F1B2D" }),
      expect.objectContaining({ courseTitle: "创意课程", lessonNo: 1 }),
    );
  });
});
