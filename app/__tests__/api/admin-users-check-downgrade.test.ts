import { GET } from "@/app/api/admin/users/[id]/check-downgrade/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: { courseRndProject: { count: jest.fn() } },
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as jest.Mock;
const mockCount = prisma.courseRndProject.count as jest.Mock;

const adminSession = { user: { id: "a-1", role: "admin" }, expires: "" };
const teacherSession = { user: { id: "t-1", role: "teacher" }, expires: "" };

const makeGet = () =>
  new Request("http://localhost/api/admin/users/u1/check-downgrade");

const paramsU1 = Promise.resolve({ id: "u1" });

beforeEach(() => jest.clearAllMocks());

describe("GET /api/admin/users/[id]/check-downgrade", () => {
  it("returns 403 for non-admin", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const res = await GET(makeGet(), { params: paramsU1 });
    expect(res.status).toBe(403);
  });

  it("returns project count for admin", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockCount.mockResolvedValue(3);
    const res = await GET(makeGet(), { params: paramsU1 });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.projectCount).toBe(3);
  });

  it("returns 0 when no projects", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockCount.mockResolvedValue(0);
    const res = await GET(makeGet(), { params: paramsU1 });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.projectCount).toBe(0);
  });
});
