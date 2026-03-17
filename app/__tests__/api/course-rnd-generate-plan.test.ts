import { POST } from "@/app/api/course-rnd/projects/[id]/generate-plan/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    courseRndProject: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    courseRndPlanVersion: {
      updateMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    courseRndLessonDraft: {
      create: jest.fn(),
    },
  },
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as jest.Mock;
const mockFindUnique = prisma.courseRndProject.findUnique as jest.Mock;
const mockProjectUpdate = prisma.courseRndProject.update as jest.Mock;
const mockPlanUpdateMany = prisma.courseRndPlanVersion.updateMany as jest.Mock;
const mockPlanFindFirst = prisma.courseRndPlanVersion.findFirst as jest.Mock;
const mockPlanCreate = prisma.courseRndPlanVersion.create as jest.Mock;
const mockDraftCreate = prisma.courseRndLessonDraft.create as jest.Mock;

const rdSession = { user: { id: "rd-1", role: "rd_manager" }, expires: "" };
const teacherSession = { user: { id: "t-1", role: "teacher" }, expires: "" };

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });
const dummyRequest = new Request("http://localhost/api/course-rnd/projects/p1/generate-plan");

const framework = [
  { lessonNo: 1, title: "Lesson 1", overview: "Overview 1" },
  { lessonNo: 2, title: "Lesson 2", overview: "Overview 2" },
];

beforeEach(() => jest.clearAllMocks());

describe("POST /api/course-rnd/projects/[id]/generate-plan", () => {
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

  it("returns 400 when no direction version with framework", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindUnique.mockResolvedValue({
      id: "p1",
      directionVersions: [],
    });
    const res = await POST(dummyRequest, makeParams("p1"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("请先确认课程框架");
  });

  it("returns 400 when frameworkJson is null", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindUnique.mockResolvedValue({
      id: "p1",
      directionVersions: [{ id: "dv1", frameworkJson: null }],
    });
    const res = await POST(dummyRequest, makeParams("p1"));
    expect(res.status).toBe(400);
  });

  it("returns 500 when frameworkJson is invalid JSON", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindUnique.mockResolvedValue({
      id: "p1",
      directionVersions: [{ id: "dv1", frameworkJson: "not-json" }],
    });
    const res = await POST(dummyRequest, makeParams("p1"));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("框架数据异常");
  });

  it("creates plan version and lesson drafts successfully", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindUnique.mockResolvedValue({
      id: "p1",
      directionVersions: [{ id: "dv1", frameworkJson: JSON.stringify(framework) }],
    });
    mockPlanUpdateMany.mockResolvedValue({ count: 0 });
    mockPlanFindFirst.mockResolvedValue({ versionNo: 2 });
    mockPlanCreate.mockResolvedValue({ id: "plan-v3" });
    mockDraftCreate.mockResolvedValue({});
    mockProjectUpdate.mockResolvedValue({});

    const res = await POST(dummyRequest, makeParams("p1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.planVersionId).toBe("plan-v3");
    expect(json.data.versionNo).toBe(3);
    expect(json.data.lessons).toEqual(framework);
  });

  it("creates version 1 when no previous versions exist", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindUnique.mockResolvedValue({
      id: "p1",
      directionVersions: [{ id: "dv1", frameworkJson: JSON.stringify(framework) }],
    });
    mockPlanUpdateMany.mockResolvedValue({ count: 0 });
    mockPlanFindFirst.mockResolvedValue(null);
    mockPlanCreate.mockResolvedValue({ id: "plan-v1" });
    mockDraftCreate.mockResolvedValue({});
    mockProjectUpdate.mockResolvedValue({});

    const res = await POST(dummyRequest, makeParams("p1"));
    const json = await res.json();
    expect(json.data.versionNo).toBe(1);
  });

  it("creates a lesson draft for each lesson in framework", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindUnique.mockResolvedValue({
      id: "p1",
      directionVersions: [{ id: "dv1", frameworkJson: JSON.stringify(framework) }],
    });
    mockPlanUpdateMany.mockResolvedValue({ count: 0 });
    mockPlanFindFirst.mockResolvedValue(null);
    mockPlanCreate.mockResolvedValue({ id: "plan-v1" });
    mockDraftCreate.mockResolvedValue({});
    mockProjectUpdate.mockResolvedValue({});

    await POST(dummyRequest, makeParams("p1"));
    expect(mockDraftCreate).toHaveBeenCalledTimes(2);
    expect(mockDraftCreate).toHaveBeenCalledWith({
      data: {
        planVersionId: "plan-v1",
        lessonNo: 1,
        title: "Lesson 1",
        overview: "Overview 1",
        contentData: null,
      },
    });
  });

  it("clears old isSelected and updates project status", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindUnique.mockResolvedValue({
      id: "p1",
      directionVersions: [{ id: "dv1", frameworkJson: JSON.stringify(framework) }],
    });
    mockPlanUpdateMany.mockResolvedValue({ count: 1 });
    mockPlanFindFirst.mockResolvedValue(null);
    mockPlanCreate.mockResolvedValue({ id: "plan-v1" });
    mockDraftCreate.mockResolvedValue({});
    mockProjectUpdate.mockResolvedValue({});

    await POST(dummyRequest, makeParams("p1"));
    expect(mockPlanUpdateMany).toHaveBeenCalledWith({
      where: { projectId: "p1", isSelected: true },
      data: { isSelected: false },
    });
    expect(mockProjectUpdate).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { status: "workbench", currentPlanVersionId: "plan-v1" },
    });
  });
});
