import { GET, POST } from "@/app/api/course-rnd/projects/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    courseRndProject: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as jest.Mock;
const mockFindMany = prisma.courseRndProject.findMany as jest.Mock;
const mockCreate = prisma.courseRndProject.create as jest.Mock;

const rdSession = { user: { id: "rd-1", role: "rd_manager" }, expires: "" };
const teacherSession = { user: { id: "t-1", role: "teacher" }, expires: "" };

const makePost = (body: object) =>
  new Request("http://localhost/api/course-rnd/projects", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

beforeEach(() => jest.clearAllMocks());

describe("GET /api/course-rnd/projects (recent)", () => {
  it("returns 403 for teacher", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns projects for rd_manager", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindMany.mockResolvedValue([{ id: "p1", title: "测试项目", status: "direction" }]);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
  });
});

describe("POST /api/course-rnd/projects", () => {
  it("returns 403 for teacher", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const res = await POST(makePost({ title: "新课程" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 for missing title", async () => {
    mockAuth.mockResolvedValue(rdSession);
    const res = await POST(makePost({}));
    expect(res.status).toBe(400);
  });

  it("creates project successfully", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockCreate.mockResolvedValue({ id: "p-new", title: "AI 创作课", status: "direction" });
    const res = await POST(makePost({ title: "AI 创作课", targetAudience: "8-12 岁学生", courseDirection: "AI 故事创作" }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.title).toBe("AI 创作课");
  });
});
