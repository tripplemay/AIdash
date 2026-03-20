import { GET } from "@/app/api/export/baselines/route";

jest.mock("@/lib/export-auth", () => ({
  verifyExportToken: jest.fn(),
  unauthorizedResponse: jest.fn(() => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } })),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    baselineDoc: { findMany: jest.fn() },
  },
}));

import { verifyExportToken } from "@/lib/export-auth";
import { prisma } from "@/lib/prisma";

const mockVerify = verifyExportToken as jest.Mock;
const mockFindMany = prisma.baselineDoc.findMany as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("GET /api/export/baselines", () => {
  it("returns 401 without token", async () => {
    mockVerify.mockResolvedValue(false);
    const res = await GET(new Request("http://localhost/api/export/baselines"));
    expect(res.status).toBe(401);
  });

  it("returns baselines with version numbers", async () => {
    mockVerify.mockResolvedValue(true);
    mockFindMany.mockResolvedValue([
      { id: "b1", type: "general", key: "general", label: "通用基线", content: "...", sortOrder: 0, updatedAt: new Date(), versions: [{ versionNo: 3 }] },
      { id: "b2", type: "org_form", key: "S1", label: "S1｜单课闭环型", content: "...", sortOrder: 1, updatedAt: new Date(), versions: [{ versionNo: 1 }] },
    ]);

    const res = await GET(new Request("http://localhost/api/export/baselines"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(2);
    expect(json.data[0].currentVersionNo).toBe(3);
    expect(json.data[1].label).toBe("S1｜单课闭环型");
  });
});
