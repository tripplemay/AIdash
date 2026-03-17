import { GET } from "@/app/api/admin/prompt-templates/[actionKey]/versions/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    promptTemplate: { findUnique: jest.fn() },
    promptTemplateVersion: { findMany: jest.fn() },
  },
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as jest.Mock;
const mockFindTemplate = prisma.promptTemplate.findUnique as jest.Mock;
const mockFindMany = prisma.promptTemplateVersion.findMany as jest.Mock;

const adminSession = { user: { id: "a-1", role: "admin" }, expires: "" };
const teacherSession = { user: { id: "t-1", role: "teacher" }, expires: "" };

const routeParams = { params: Promise.resolve({ actionKey: "generate_framework" }) };

beforeEach(() => jest.clearAllMocks());

describe("GET /api/admin/prompt-templates/[actionKey]/versions", () => {
  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost"), routeParams);
    expect(res.status).toBe(403);
  });

  it("returns 404 when template not found", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindTemplate.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost"), routeParams);
    expect(res.status).toBe(404);
  });

  it("returns versions for admin", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindTemplate.mockResolvedValue({ id: "t1" });
    mockFindMany.mockResolvedValue([
      { id: "v2", versionNo: 2 },
      { id: "v1", versionNo: 1 },
    ]);
    const res = await GET(new Request("http://localhost"), routeParams);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(2);
  });

  it("returns versions for teacher", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    mockFindTemplate.mockResolvedValue({ id: "t1" });
    mockFindMany.mockResolvedValue([]);
    const res = await GET(new Request("http://localhost"), routeParams);
    expect(res.status).toBe(200);
  });

  it("queries versions by templateId", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindTemplate.mockResolvedValue({ id: "t1" });
    mockFindMany.mockResolvedValue([]);
    await GET(new Request("http://localhost"), routeParams);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { templateId: "t1" },
      orderBy: { versionNo: "desc" },
    });
  });
});
