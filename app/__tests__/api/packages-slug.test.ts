import { GET } from "@/app/api/packages/[slug]/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: { coursePackage: { findUnique: jest.fn() } },
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as jest.Mock;
const mockFindUnique = prisma.coursePackage.findUnique as jest.MockedFunction<
  typeof prisma.coursePackage.findUnique
>;

const makeParams = (slug: string) =>
  ({ params: Promise.resolve({ slug }) } as any);

beforeEach(() => jest.clearAllMocks());

describe("GET /api/packages/[slug]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null as any);
    const res = await GET(new Request("http://localhost"), makeParams("test"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "未授权" });
  });

  it("returns 404 when package not found", async () => {
    mockAuth.mockResolvedValue({ user: {}, expires: "" } as any);
    mockFindUnique.mockResolvedValue(null);
    const res = await GET(
      new Request("http://localhost"),
      makeParams("not-exist")
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "课程包不存在" });
  });

  it("returns package data when found", async () => {
    mockAuth.mockResolvedValue({ user: {}, expires: "" } as any);
    const pkg = { id: 1, slug: "my-pkg", title: "课程包" };
    mockFindUnique.mockResolvedValue(pkg as any);
    const res = await GET(
      new Request("http://localhost"),
      makeParams("my-pkg")
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: pkg });
  });

  it("queries prisma with the correct slug", async () => {
    mockAuth.mockResolvedValue({ user: {}, expires: "" } as any);
    mockFindUnique.mockResolvedValue({ id: 1 } as any);
    await GET(new Request("http://localhost"), makeParams("target-slug"));
    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: "target-slug" } })
    );
  });
});
