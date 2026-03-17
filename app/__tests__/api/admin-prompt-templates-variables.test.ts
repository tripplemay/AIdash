import { GET } from "@/app/api/admin/prompt-templates/variables/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/ai/template-variables", () => ({
  TEMPLATE_VARIABLES: [
    { key: "项目标题", group: "项目信息", description: "项目标题" },
    { key: "课程方向", group: "项目信息", description: "课程方向" },
  ],
}));

import { auth } from "@/auth";

const mockAuth = auth as jest.Mock;

const adminSession = { user: { id: "a-1", role: "admin" }, expires: "" };
const teacherSession = { user: { id: "t-1", role: "teacher" }, expires: "" };

beforeEach(() => jest.clearAllMocks());

describe("GET /api/admin/prompt-templates/variables", () => {
  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns variables for admin", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(2);
    expect(json.data[0].key).toBe("项目标题");
  });

  it("returns variables for teacher", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(2);
  });
});
