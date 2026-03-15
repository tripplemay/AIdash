import { GET } from "@/app/api/filter-tree/route";

jest.mock("@/lib/prisma", () => ({
  prisma: { coursePackage: { groupBy: jest.fn() } },
}));

import { prisma } from "@/lib/prisma";

const mockGroupBy = prisma.coursePackage.groupBy as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("GET /api/filter-tree", () => {
  it("returns empty array when no packages", async () => {
    mockGroupBy.mockResolvedValue([]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("groups by ageRange with levels", async () => {
    mockGroupBy.mockResolvedValue([
      { ageRange: "8-12", level: "L1" },
      { ageRange: "8-12", level: "L2" },
      { ageRange: "13-15", level: "L1" },
    ]);
    const res = await GET();
    const data = await res.json();
    expect(data).toEqual([
      { ageRange: "8-12", levels: ["L1", "L2"] },
      { ageRange: "13-15", levels: ["L1"] },
    ]);
  });
});
