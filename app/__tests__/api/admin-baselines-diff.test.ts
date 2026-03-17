import { GET } from "@/app/api/admin/baselines/[id]/diff/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    baselineDocVersion: { findUnique: jest.fn() },
  },
}));
jest.mock("@/lib/diff-utils", () => ({
  computeLineDiff: jest.fn(() => [{ oldStart: 1, newStart: 1, lines: [] }]),
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as jest.Mock;
const mockFindUnique = prisma.baselineDocVersion.findUnique as jest.Mock;

const adminSession = { user: { id: "a-1", role: "admin" }, expires: "" };
const teacherSession = { user: { id: "t-1", role: "teacher" }, expires: "" };

const routeParams = { params: Promise.resolve({ id: "b1" }) };

const makeRequest = (query: string) =>
  new Request(`http://localhost/api/admin/baselines/b1/diff${query}`);

beforeEach(() => jest.clearAllMocks());

describe("GET /api/admin/baselines/[id]/diff", () => {
  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(makeRequest("?v1=1&v2=2"), routeParams);
    expect(res.status).toBe(403);
  });

  it("returns 400 when v1 or v2 missing", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const res = await GET(makeRequest("?v1=1"), routeParams);
    expect(res.status).toBe(400);
  });

  it("returns 400 when both params missing", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const res = await GET(makeRequest(""), routeParams);
    expect(res.status).toBe(400);
  });

  it("returns 404 when version not found", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockFindUnique.mockResolvedValue(null);
    const res = await GET(makeRequest("?v1=1&v2=2"), routeParams);
    expect(res.status).toBe(404);
  });

  it("returns diff for valid versions", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const v1 = { versionNo: 1, content: "old", editSummary: "init", createdAt: new Date() };
    const v2 = { versionNo: 2, content: "new", editSummary: "update", createdAt: new Date() };
    mockFindUnique.mockResolvedValueOnce(v1).mockResolvedValueOnce(v2);

    const res = await GET(makeRequest("?v1=1&v2=2"), routeParams);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.v1.versionNo).toBe(1);
    expect(json.data.v2.versionNo).toBe(2);
    expect(json.data.hunks).toBeDefined();
  });

  it("allows teacher access", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const v1 = { versionNo: 1, content: "a", editSummary: null, createdAt: new Date() };
    const v2 = { versionNo: 2, content: "b", editSummary: null, createdAt: new Date() };
    mockFindUnique.mockResolvedValueOnce(v1).mockResolvedValueOnce(v2);

    const res = await GET(makeRequest("?v1=1&v2=2"), routeParams);
    expect(res.status).toBe(200);
  });
});
