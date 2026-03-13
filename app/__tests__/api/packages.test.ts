import { GET } from "@/app/api/packages/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: { coursePackage: { findMany: jest.fn() } },
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockFindMany = prisma.coursePackage.findMany as jest.MockedFunction<
  typeof prisma.coursePackage.findMany
>;

const makeReq = (url = "http://localhost/api/packages") => new Request(url);

beforeEach(() => jest.clearAllMocks());

describe("GET /api/packages", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null as any);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "未授权" });
  });

  it("returns package list when authenticated", async () => {
    mockAuth.mockResolvedValue({ user: { name: "t" }, expires: "" } as any);
    const packages = [{ id: 1, title: "课程包A" }];
    mockFindMany.mockResolvedValue(packages as any);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: packages });
  });

  it("passes q filter to prisma when provided", async () => {
    mockAuth.mockResolvedValue({ user: {}, expires: "" } as any);
    mockFindMany.mockResolvedValue([]);
    await GET(makeReq("http://localhost/api/packages?q=数学"));
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ title: { contains: "数学" } }),
      })
    );
  });

  it("passes ageRange filter to prisma when provided", async () => {
    mockAuth.mockResolvedValue({ user: {}, expires: "" } as any);
    mockFindMany.mockResolvedValue([]);
    await GET(makeReq("http://localhost/api/packages?ageRange=6-8"));
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ ageRange: "6-8" }),
      })
    );
  });

  it("passes level filter to prisma when provided", async () => {
    mockAuth.mockResolvedValue({ user: {}, expires: "" } as any);
    mockFindMany.mockResolvedValue([]);
    await GET(makeReq("http://localhost/api/packages?level=beginner"));
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ level: "beginner" }),
      })
    );
  });

  it("omits optional filters when params are empty", async () => {
    mockAuth.mockResolvedValue({ user: {}, expires: "" } as any);
    mockFindMany.mockResolvedValue([]);
    await GET(makeReq());
    const call = mockFindMany.mock.calls[0][0] as any;
    expect(call.where).not.toHaveProperty("title");
    expect(call.where).not.toHaveProperty("ageRange");
    expect(call.where).not.toHaveProperty("level");
  });

  it("always filters by status=published", async () => {
    mockAuth.mockResolvedValue({ user: {}, expires: "" } as any);
    mockFindMany.mockResolvedValue([]);
    await GET(makeReq());
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "published" }),
      })
    );
  });
});
