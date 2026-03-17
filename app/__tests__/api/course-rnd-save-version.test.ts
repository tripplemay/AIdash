import { POST } from "@/app/api/course-rnd/projects/[id]/save-version/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    courseRndProject: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    courseRndLessonDraft: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    courseRndPlanVersion: {
      updateMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as jest.Mock;
const mockProjectFindUnique = prisma.courseRndProject.findUnique as jest.Mock;
const mockProjectUpdate = prisma.courseRndProject.update as jest.Mock;
const mockDraftFindMany = prisma.courseRndLessonDraft.findMany as jest.Mock;
const mockDraftCreate = prisma.courseRndLessonDraft.create as jest.Mock;
const mockPlanUpdateMany = prisma.courseRndPlanVersion.updateMany as jest.Mock;
const mockPlanFindFirst = prisma.courseRndPlanVersion.findFirst as jest.Mock;
const mockPlanCreate = prisma.courseRndPlanVersion.create as jest.Mock;

const rdSession = { user: { id: "rd-1", role: "rd_manager" }, expires: "" };
const teacherSession = { user: { id: "t-1", role: "teacher" }, expires: "" };

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });
const dummyRequest = new Request("http://localhost/api/course-rnd/projects/p1/save-version");

const sampleDrafts = [
  {
    id: "d1",
    planVersionId: "pv-old",
    lessonNo: 1,
    title: "Lesson 1",
    contentData: JSON.stringify({ blocks: [] }),
    lastFeedback: "good",
  },
  {
    id: "d2",
    planVersionId: "pv-old",
    lessonNo: 2,
    title: "Lesson 2",
    contentData: null,
    lastFeedback: null,
  },
];

beforeEach(() => jest.clearAllMocks());

describe("POST /api/course-rnd/projects/[id]/save-version", () => {
  it("returns 403 for teacher", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const res = await POST(dummyRequest, makeParams("p1"));
    expect(res.status).toBe(403);
  });

  it("returns 400 when project has no currentPlanVersionId", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockProjectFindUnique.mockResolvedValue({ currentPlanVersionId: null });
    const res = await POST(dummyRequest, makeParams("p1"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("无当前方案版本");
  });

  it("returns 400 when project not found", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockProjectFindUnique.mockResolvedValue(null);
    const res = await POST(dummyRequest, makeParams("nonexistent"));
    expect(res.status).toBe(400);
  });

  it("saves version successfully", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockProjectFindUnique.mockResolvedValue({ currentPlanVersionId: "pv-old" });
    mockDraftFindMany.mockResolvedValue(sampleDrafts);
    mockPlanUpdateMany.mockResolvedValue({ count: 1 });
    mockPlanFindFirst.mockResolvedValue({ versionNo: 3 });
    mockPlanCreate.mockResolvedValue({ id: "pv-new" });
    mockDraftCreate.mockResolvedValue({});
    mockProjectUpdate.mockResolvedValue({});

    const res = await POST(dummyRequest, makeParams("p1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.planVersionId).toBe("pv-new");
    expect(json.data.versionNo).toBe(4);
  });

  it("creates version 1 when no previous versions exist", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockProjectFindUnique.mockResolvedValue({ currentPlanVersionId: "pv-old" });
    mockDraftFindMany.mockResolvedValue(sampleDrafts);
    mockPlanUpdateMany.mockResolvedValue({ count: 0 });
    mockPlanFindFirst.mockResolvedValue(null);
    mockPlanCreate.mockResolvedValue({ id: "pv-new" });
    mockDraftCreate.mockResolvedValue({});
    mockProjectUpdate.mockResolvedValue({});

    const res = await POST(dummyRequest, makeParams("p1"));
    const json = await res.json();
    expect(json.data.versionNo).toBe(1);
  });

  it("copies all drafts to new version", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockProjectFindUnique.mockResolvedValue({ currentPlanVersionId: "pv-old" });
    mockDraftFindMany.mockResolvedValue(sampleDrafts);
    mockPlanUpdateMany.mockResolvedValue({ count: 0 });
    mockPlanFindFirst.mockResolvedValue(null);
    mockPlanCreate.mockResolvedValue({ id: "pv-new" });
    mockDraftCreate.mockResolvedValue({});
    mockProjectUpdate.mockResolvedValue({});

    await POST(dummyRequest, makeParams("p1"));
    expect(mockDraftCreate).toHaveBeenCalledTimes(2);
    expect(mockDraftCreate).toHaveBeenCalledWith({
      data: {
        planVersionId: "pv-new",
        lessonNo: 1,
        title: "Lesson 1",
        contentData: JSON.stringify({ blocks: [] }),
        lastFeedback: "good",
      },
    });
    expect(mockDraftCreate).toHaveBeenCalledWith({
      data: {
        planVersionId: "pv-new",
        lessonNo: 2,
        title: "Lesson 2",
        contentData: null,
        lastFeedback: null,
      },
    });
  });

  it("clears old isSelected and updates project currentPlanVersionId", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockProjectFindUnique.mockResolvedValue({ currentPlanVersionId: "pv-old" });
    mockDraftFindMany.mockResolvedValue(sampleDrafts);
    mockPlanUpdateMany.mockResolvedValue({ count: 1 });
    mockPlanFindFirst.mockResolvedValue({ versionNo: 1 });
    mockPlanCreate.mockResolvedValue({ id: "pv-new" });
    mockDraftCreate.mockResolvedValue({});
    mockProjectUpdate.mockResolvedValue({});

    await POST(dummyRequest, makeParams("p1"));
    expect(mockPlanUpdateMany).toHaveBeenCalledWith({
      where: { projectId: "p1", isSelected: true },
      data: { isSelected: false },
    });
    expect(mockProjectUpdate).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { currentPlanVersionId: "pv-new" },
    });
  });
});
