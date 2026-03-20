import { GET } from "@/app/api/export/projects/route";

jest.mock("@/lib/export-auth", () => ({
  verifyExportToken: jest.fn(),
  unauthorizedResponse: jest.fn(() => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } })),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    courseRndProject: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

import { verifyExportToken } from "@/lib/export-auth";
import { prisma } from "@/lib/prisma";

const mockVerify = verifyExportToken as jest.Mock;
const mockFindMany = prisma.courseRndProject.findMany as jest.Mock;
const mockCount = prisma.courseRndProject.count as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("GET /api/export/projects", () => {
  it("returns 401 without token", async () => {
    mockVerify.mockResolvedValue(false);
    const res = await GET(new Request("http://localhost/api/export/projects"));
    expect(res.status).toBe(401);
  });

  it("returns project list", async () => {
    mockVerify.mockResolvedValue(true);
    mockFindMany.mockResolvedValue([
      {
        id: "p1", title: "Test", status: "published",
        ageRange: "8-9", level: "L2", orgForm: "S1",
        deliverableType: "P3", deliverableName: "Story",
        lessonCount: 10, courseDirection: "dir",
        coreNeeds: "needs", imageStyle: "watercolor",
        createdAt: new Date(), updatedAt: new Date(),
        _count: { publishRecords: 1 },
        publishRecords: [{ createdAt: new Date() }],
      },
    ]);
    mockCount.mockResolvedValue(1);

    const res = await GET(new Request("http://localhost/api/export/projects"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].publishCount).toBe(1);
    expect(json.total).toBe(1);
  });

  it("supports pagination", async () => {
    mockVerify.mockResolvedValue(true);
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    const res = await GET(new Request("http://localhost/api/export/projects?page=2&pageSize=5"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.page).toBe(2);
    expect(json.pageSize).toBe(5);
  });
});
