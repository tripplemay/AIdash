import { GET } from "@/app/api/filter-tree/route";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    coursePackage: { groupBy: jest.fn() },
    baselineDoc: { findMany: jest.fn() },
  },
}));

import { prisma } from "@/lib/prisma";

const mockGroupBy = prisma.coursePackage.groupBy as jest.Mock;
const mockFindMany = prisma.baselineDoc.findMany as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("GET /api/filter-tree", () => {
  it("returns empty array when no packages", async () => {
    mockGroupBy.mockResolvedValue([]);
    mockFindMany.mockResolvedValue([]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("groups by ageRange with levels and labels", async () => {
    mockGroupBy.mockResolvedValue([
      { ageRange: "A2", level: "L1" },
      { ageRange: "A2", level: "L2" },
      { ageRange: "A3", level: "L1" },
    ]);
    mockFindMany.mockResolvedValue([
      { type: "age", key: "A2", label: "A2｜8-9岁 基础段" },
      { type: "age", key: "A3", label: "A3｜10-12岁 主力段" },
      { type: "level", key: "L1", label: "L1｜AI 启蒙使用" },
      { type: "level", key: "L2", label: "L2｜AI 基础应用" },
    ]);
    const res = await GET();
    const data = await res.json();
    expect(data).toEqual([
      {
        ageRange: "A2",
        ageRangeLabel: "A2｜8-9岁 基础段",
        levels: [
          { key: "L1", label: "L1｜AI 启蒙使用" },
          { key: "L2", label: "L2｜AI 基础应用" },
        ],
      },
      {
        ageRange: "A3",
        ageRangeLabel: "A3｜10-12岁 主力段",
        levels: [
          { key: "L1", label: "L1｜AI 启蒙使用" },
        ],
      },
    ]);
  });
});
