import { PATCH, DELETE } from "@/app/api/admin/packages/[slug]/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    coursePackage: { update: jest.fn(), delete: jest.fn() },
  },
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockUpdate = prisma.coursePackage.update as jest.MockedFunction<
  typeof prisma.coursePackage.update
>;
const mockDelete = prisma.coursePackage.delete as jest.MockedFunction<
  typeof prisma.coursePackage.delete
>;

const adminSession = { user: { role: "admin" }, expires: "" };
const teacherSession = { user: { role: "teacher" }, expires: "" };

const makeParams = (slug: string) =>
  ({ params: Promise.resolve({ slug }) } as any);

const makePatchReq = (body: object) =>
  new Request("http://localhost", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

beforeEach(() => jest.clearAllMocks());

describe("PATCH /api/admin/packages/[slug]", () => {
  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null as any);
    const res = await PATCH(makePatchReq({ title: "新标题" }), makeParams("pkg"));
    expect(res.status).toBe(403);
  });

  it("returns 403 when not admin", async () => {
    mockAuth.mockResolvedValue(teacherSession as any);
    const res = await PATCH(makePatchReq({ title: "新标题" }), makeParams("pkg"));
    expect(res.status).toBe(403);
  });

  it("updates and returns package when admin", async () => {
    mockAuth.mockResolvedValue(adminSession as any);
    const updated = { id: 1, slug: "pkg", title: "新标题" };
    mockUpdate.mockResolvedValue(updated as any);
    const res = await PATCH(makePatchReq({ title: "新标题" }), makeParams("pkg"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: updated });
  });

  it("passes only provided fields to prisma update", async () => {
    mockAuth.mockResolvedValue(adminSession as any);
    mockUpdate.mockResolvedValue({ id: 1 } as any);
    await PATCH(makePatchReq({ status: "published" }), makeParams("pkg"));
    const call = mockUpdate.mock.calls[0][0] as any;
    expect(call.data).toHaveProperty("status", "published");
    expect(call.data).not.toHaveProperty("title");
  });

  it("updates with correct slug where clause", async () => {
    mockAuth.mockResolvedValue(adminSession as any);
    mockUpdate.mockResolvedValue({ id: 1 } as any);
    await PATCH(makePatchReq({ title: "x" }), makeParams("target-slug"));
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: "target-slug" } })
    );
  });

  it("allows summary to be set to empty string", async () => {
    mockAuth.mockResolvedValue(adminSession as any);
    mockUpdate.mockResolvedValue({ id: 1 } as any);
    await PATCH(makePatchReq({ summary: "" }), makeParams("pkg"));
    const call = mockUpdate.mock.calls[0][0] as any;
    expect(call.data).toHaveProperty("summary", "");
  });

  it("allows coverImage to be set to empty string", async () => {
    mockAuth.mockResolvedValue(adminSession as any);
    mockUpdate.mockResolvedValue({ id: 1 } as any);
    await PATCH(makePatchReq({ coverImage: "" }), makeParams("pkg"));
    const call = mockUpdate.mock.calls[0][0] as any;
    expect(call.data).toHaveProperty("coverImage", "");
  });
});

describe("DELETE /api/admin/packages/[slug]", () => {
  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null as any);
    const res = await DELETE(new Request("http://localhost"), makeParams("pkg"));
    expect(res.status).toBe(403);
  });

  it("returns 403 when not admin", async () => {
    mockAuth.mockResolvedValue(teacherSession as any);
    const res = await DELETE(new Request("http://localhost"), makeParams("pkg"));
    expect(res.status).toBe(403);
  });

  it("deletes package and returns success when admin", async () => {
    mockAuth.mockResolvedValue(adminSession as any);
    mockDelete.mockResolvedValue({ id: 1 } as any);
    const res = await DELETE(new Request("http://localhost"), makeParams("pkg"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it("deletes with correct slug", async () => {
    mockAuth.mockResolvedValue(adminSession as any);
    mockDelete.mockResolvedValue({ id: 1 } as any);
    await DELETE(new Request("http://localhost"), makeParams("to-delete"));
    expect(mockDelete).toHaveBeenCalledWith({ where: { slug: "to-delete" } });
  });
});
