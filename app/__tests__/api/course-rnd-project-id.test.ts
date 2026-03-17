import { GET, PATCH, DELETE } from "@/app/api/course-rnd/projects/[id]/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    courseRndProject: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    coursePackage: {
      count: jest.fn(),
    },
  },
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as jest.Mock;
const mockFindUnique = prisma.courseRndProject.findUnique as jest.Mock;
const mockUpdate = prisma.courseRndProject.update as jest.Mock;
const mockDelete = prisma.courseRndProject.delete as jest.Mock;
const mockPackageCount = (prisma.coursePackage as unknown as { count: jest.Mock }).count as jest.Mock;

const rdSession = { user: { id: "rd-1", role: "rd_manager" }, expires: "" };
const teacherSession = { user: { id: "t-1", role: "teacher" }, expires: "" };

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

const makePatchRequest = (body: object) =>
  new Request("http://localhost/api/course-rnd/projects/p1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

const dummyRequest = new Request("http://localhost/api/course-rnd/projects/p1");

beforeEach(() => jest.clearAllMocks());

// ---- GET ----
describe("GET /api/course-rnd/projects/[id]", () => {
  it("returns 403 for teacher", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const res = await GET(dummyRequest, makeParams("p1"));
    expect(res.status).toBe(403);
  });

  it("returns 404 when project not found", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindUnique.mockResolvedValue(null);
    const res = await GET(dummyRequest, makeParams("nonexistent"));
    expect(res.status).toBe(404);
  });

  it("returns project details for rd_manager", async () => {
    mockAuth.mockResolvedValue(rdSession);
    const project = {
      id: "p1",
      title: "Test",
      directionVersions: [],
      planVersions: [],
    };
    mockFindUnique.mockResolvedValue(project);
    const res = await GET(dummyRequest, makeParams("p1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.id).toBe("p1");
  });

  it("passes correct include options to prisma", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindUnique.mockResolvedValue({ id: "p1" });
    await GET(dummyRequest, makeParams("p1"));
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: "p1" },
      include: {
        directionVersions: { orderBy: { versionNo: "desc" }, take: 5 },
        planVersions: {
          orderBy: { versionNo: "desc" },
          take: 5,
          include: { lessonDrafts: { orderBy: { lessonNo: "asc" } } },
        },
      },
    });
  });
});

// ---- PATCH ----
describe("PATCH /api/course-rnd/projects/[id]", () => {
  it("returns 403 for teacher", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const res = await PATCH(makePatchRequest({ title: "new" }), makeParams("p1"));
    expect(res.status).toBe(403);
  });

  it("returns 400 when no allowed fields provided", async () => {
    mockAuth.mockResolvedValue(rdSession);
    const res = await PATCH(makePatchRequest({ badField: "x" }), makeParams("p1"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("无更新字段");
  });

  it("updates project with allowed fields only", async () => {
    mockAuth.mockResolvedValue(rdSession);
    const updated = { id: "p1", title: "Updated", status: "direction" };
    mockUpdate.mockResolvedValue(updated);
    const res = await PATCH(
      makePatchRequest({ title: "Updated", badField: "ignored" }),
      makeParams("p1")
    );
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { title: "Updated" },
    });
  });

  it("allows updating multiple fields", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockUpdate.mockResolvedValue({ id: "p1" });
    await PATCH(
      makePatchRequest({ title: "T", ageRange: "A1", level: "L1" }),
      makeParams("p1")
    );
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { title: "T", ageRange: "A1", level: "L1" },
    });
  });
});

// ---- DELETE ----
describe("DELETE /api/course-rnd/projects/[id]", () => {
  it("returns 403 for teacher", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const res = await DELETE(dummyRequest, makeParams("p1"));
    expect(res.status).toBe(403);
  });

  it("returns 404 when project not found", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindUnique.mockResolvedValue(null);
    const res = await DELETE(dummyRequest, makeParams("nonexistent"));
    expect(res.status).toBe(404);
  });

  it("returns 409 when published package still exists", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindUnique.mockResolvedValue({
      id: "p1",
      publishRecords: [{ packageSlug: "course-abc" }],
    });
    mockPackageCount.mockResolvedValue(1);
    const res = await DELETE(dummyRequest, makeParams("p1"));
    expect(res.status).toBe(409);
  });

  it("deletes project when published package has been removed", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindUnique.mockResolvedValue({
      id: "p1",
      publishRecords: [{ packageSlug: "course-abc" }],
    });
    mockPackageCount.mockResolvedValue(0);
    mockDelete.mockResolvedValue({ id: "p1" });
    const res = await DELETE(dummyRequest, makeParams("p1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.id).toBe("p1");
  });

  it("deletes project when no publish records exist", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindUnique.mockResolvedValue({
      id: "p1",
      publishRecords: [],
    });
    mockDelete.mockResolvedValue({ id: "p1" });
    const res = await DELETE(dummyRequest, makeParams("p1"));
    expect(res.status).toBe(200);
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "p1" } });
  });
});
