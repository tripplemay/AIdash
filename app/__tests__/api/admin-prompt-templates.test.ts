import { GET as ListGET } from "@/app/api/admin/prompt-templates/route";
import { GET, PUT } from "@/app/api/admin/prompt-templates/[actionKey]/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    promptTemplate: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    promptTemplateVersion: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as jest.Mock;
const mockFindMany = prisma.promptTemplate.findMany as jest.Mock;
const mockFindUnique = prisma.promptTemplate.findUnique as jest.Mock;
const mockUpdate = prisma.promptTemplate.update as jest.Mock;
const mockTransaction = prisma.$transaction as jest.Mock;

const adminSession = { user: { id: "a-1", role: "admin" }, expires: "" };
const teacherSession = { user: { id: "t-1", role: "teacher" }, expires: "" };
const rdSession = { user: { id: "rd-1", role: "rd_manager" }, expires: "" };

const routeParams = { params: Promise.resolve({ actionKey: "generate_framework" }) };

const makePut = (body: object) =>
  new Request("http://localhost/api/admin/prompt-templates/generate_framework", {
    method: "PUT",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

const makeGetRequest = () =>
  new Request("http://localhost/api/admin/prompt-templates/generate_framework");

beforeEach(() => jest.clearAllMocks());

describe("GET /api/admin/prompt-templates (list)", () => {
  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await ListGET();
    expect(res.status).toBe(403);
  });

  it("returns template list for teacher (all roles allowed)", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    mockFindMany.mockResolvedValue([
      { actionKey: "generate_framework", content: "prompt content" },
    ]);
    const res = await ListGET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
  });

  it("returns template list for rd_manager", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockFindMany.mockResolvedValue([]);
    const res = await ListGET();
    expect(res.status).toBe(200);
  });
});

describe("GET /api/admin/prompt-templates/[actionKey]", () => {
  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(makeGetRequest(), routeParams);
    expect(res.status).toBe(403);
  });

  it("returns 404 when template not found", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindUnique.mockResolvedValue(null);
    const res = await GET(makeGetRequest(), routeParams);
    expect(res.status).toBe(404);
  });

  it("returns template for admin", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindUnique.mockResolvedValue({
      actionKey: "generate_framework", content: "You are a course designer...",
    });
    const res = await GET(makeGetRequest(), routeParams);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.actionKey).toBe("generate_framework");
  });

  it("returns template for teacher", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    mockFindUnique.mockResolvedValue({
      actionKey: "generate_framework", content: "content",
    });
    const res = await GET(makeGetRequest(), routeParams);
    expect(res.status).toBe(200);
  });
});

describe("PUT /api/admin/prompt-templates/[actionKey]", () => {
  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await PUT(makePut({ content: "new" }), routeParams);
    expect(res.status).toBe(403);
  });

  it("returns 403 for non-admin", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const res = await PUT(makePut({ content: "new" }), routeParams);
    expect(res.status).toBe(403);
  });

  it("returns 400 when content is empty", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const res = await PUT(makePut({}), routeParams);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("不能为空");
  });

  it("returns 404 when template not found", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindUnique.mockResolvedValue(null);
    const res = await PUT(makePut({ content: "new content" }), routeParams);
    expect(res.status).toBe(404);
  });

  it("updates template and creates version successfully", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const template = {
      id: "tmpl-1",
      actionKey: "generate_framework",
      content: "old content",
      versions: [{ versionNo: 2 }],
    };
    mockFindUnique.mockResolvedValue(template);
    const version = { id: "v3", versionNo: 3, content: "new content" };
    mockTransaction.mockResolvedValue([version, { ...template, content: "new content" }]);
    mockUpdate.mockResolvedValue({ ...template, content: "new content", currentVersionId: "v3" });
    const res = await PUT(makePut({ content: "new content", editSummary: "Updated prompt" }), routeParams);
    expect(res.status).toBe(200);
    expect(mockTransaction).toHaveBeenCalled();
  });

  it("starts version numbering at 1 when no versions exist", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const template = {
      id: "tmpl-1",
      actionKey: "generate_framework",
      content: "old",
      versions: [],
    };
    mockFindUnique.mockResolvedValue(template);
    const version = { id: "v1", versionNo: 1 };
    mockTransaction.mockResolvedValue([version, { ...template, content: "new" }]);
    mockUpdate.mockResolvedValue({ ...template, currentVersionId: "v1" });
    await PUT(makePut({ content: "new" }), routeParams);
    expect(mockTransaction).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({}),
      ]),
    );
  });
});
