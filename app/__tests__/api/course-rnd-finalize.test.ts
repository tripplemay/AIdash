import { POST, PATCH } from "@/app/api/course-rnd/projects/[id]/finalize/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    courseRndProject: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));
jest.mock("@/lib/operation-log", () => ({
  logOperation: jest.fn(),
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logOperation } from "@/lib/operation-log";

const mockAuth = auth as jest.Mock;
const mockFindUnique = prisma.courseRndProject.findUnique as jest.Mock;
const mockUpdate = prisma.courseRndProject.update as jest.Mock;
const mockLogOperation = logOperation as jest.Mock;

const rdSession = { user: { id: "rd-1", role: "rd_manager" }, expires: "" };
const teacherSession = { user: { id: "t-1", role: "teacher" }, expires: "" };

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });
const dummyRequest = new Request("http://localhost/api/course-rnd/projects/p1/finalize");

beforeEach(() => jest.clearAllMocks());

// ---- POST (finalize) ----
describe("POST /api/course-rnd/projects/[id]/finalize", () => {
  it("returns 403 for teacher", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const res = await POST(dummyRequest, makeParams("p1"));
    expect(res.status).toBe(403);
  });

  it("returns 404 when project not found", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindUnique.mockResolvedValue(null);
    const res = await POST(dummyRequest, makeParams("nonexistent"));
    expect(res.status).toBe(404);
  });

  it("returns 400 when no currentPlanVersionId", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindUnique.mockResolvedValue({
      status: "workbench",
      title: "Test",
      currentPlanVersionId: null,
    });
    const res = await POST(dummyRequest, makeParams("p1"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("无方案版本，无法定稿");
  });

  it("finalizes project successfully", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindUnique.mockResolvedValue({
      status: "workbench",
      title: "AI Course",
      currentPlanVersionId: "plan-v1",
    });
    mockUpdate.mockResolvedValue({});
    mockLogOperation.mockResolvedValue(undefined);

    const res = await POST(dummyRequest, makeParams("p1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe("finalized");
  });

  it("updates project status to finalized", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindUnique.mockResolvedValue({
      status: "workbench",
      title: "AI Course",
      currentPlanVersionId: "plan-v1",
    });
    mockUpdate.mockResolvedValue({});
    mockLogOperation.mockResolvedValue(undefined);

    await POST(dummyRequest, makeParams("p1"));
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { status: "finalized" },
    });
  });

  it("logs finalize operation", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindUnique.mockResolvedValue({
      status: "workbench",
      title: "AI Course",
      currentPlanVersionId: "plan-v1",
    });
    mockUpdate.mockResolvedValue({});
    mockLogOperation.mockResolvedValue(undefined);

    await POST(dummyRequest, makeParams("p1"));
    expect(mockLogOperation).toHaveBeenCalledWith({
      userId: "rd-1",
      module: "course_rnd",
      action: "finalize",
      targetId: "p1",
      targetName: "AI Course",
    });
  });
});

// ---- PATCH (unfinalize) ----
describe("PATCH /api/course-rnd/projects/[id]/finalize", () => {
  it("returns 403 for teacher", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const res = await PATCH(dummyRequest, makeParams("p1"));
    expect(res.status).toBe(403);
  });

  it("returns 404 when project not found", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindUnique.mockResolvedValue(null);
    const res = await PATCH(dummyRequest, makeParams("nonexistent"));
    expect(res.status).toBe(404);
  });

  it("returns 400 when project not finalized", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindUnique.mockResolvedValue({ status: "workbench", title: "Test" });
    const res = await PATCH(dummyRequest, makeParams("p1"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("项目未处于定稿状态，无法撤回");
  });

  it("unfinalizes project successfully", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindUnique.mockResolvedValue({ status: "finalized", title: "AI Course" });
    mockUpdate.mockResolvedValue({});
    mockLogOperation.mockResolvedValue(undefined);

    const res = await PATCH(dummyRequest, makeParams("p1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe("workbench");
  });

  it("logs unfinalize operation", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindUnique.mockResolvedValue({ status: "finalized", title: "AI Course" });
    mockUpdate.mockResolvedValue({});
    mockLogOperation.mockResolvedValue(undefined);

    await PATCH(dummyRequest, makeParams("p1"));
    expect(mockLogOperation).toHaveBeenCalledWith({
      userId: "rd-1",
      module: "course_rnd",
      action: "unfinalize",
      targetId: "p1",
      targetName: "AI Course",
    });
  });
});
