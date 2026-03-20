import { GET } from "@/app/api/export/prompt-templates/route";

jest.mock("@/lib/export-auth", () => ({
  verifyExportToken: jest.fn(),
  unauthorizedResponse: jest.fn(() => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } })),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    promptTemplate: { findMany: jest.fn() },
  },
}));

import { verifyExportToken } from "@/lib/export-auth";
import { prisma } from "@/lib/prisma";

const mockVerify = verifyExportToken as jest.Mock;
const mockFindMany = prisma.promptTemplate.findMany as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("GET /api/export/prompt-templates", () => {
  it("returns 401 without token", async () => {
    mockVerify.mockResolvedValue(false);
    const res = await GET(new Request("http://localhost/api/export/prompt-templates"));
    expect(res.status).toBe(401);
  });

  it("returns templates with variables and version", async () => {
    mockVerify.mockResolvedValue(true);
    mockFindMany.mockResolvedValue([
      {
        id: "pt1", actionKey: "generate_framework", actionLabel: "生成课程框架",
        content: "你是专家\n\n{{通用基线}}\n{{年龄段基线}}\n\n方向：{{课程方向}}",
        updatedAt: new Date(), versions: [{ versionNo: 5 }],
      },
    ]);

    const res = await GET(new Request("http://localhost/api/export/prompt-templates"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].currentVersionNo).toBe(5);
    expect(json.data[0].variables).toHaveLength(3);
    expect(json.data[0].variables.map((v: { name: string }) => v.name)).toEqual(
      expect.arrayContaining(["通用基线", "年龄段基线", "课程方向"])
    );
  });
});
