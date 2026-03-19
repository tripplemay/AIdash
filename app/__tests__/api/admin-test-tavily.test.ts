import { POST } from "@/app/api/admin/system-config/test-tavily/route";

jest.mock("@/lib/auth-utils", () => ({
  requireRole: jest.fn(),
  forbiddenResponse: jest.fn(() => new Response("Forbidden", { status: 403 })),
}));

jest.mock("@/lib/ai/tavily", () => ({
  searchWeb: jest.fn(),
}));

import { requireRole } from "@/lib/auth-utils";
import { searchWeb } from "@/lib/ai/tavily";

const mockRequireRole = requireRole as jest.Mock;
const mockSearchWeb = searchWeb as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("POST /api/admin/system-config/test-tavily", () => {
  it("returns 403 for non-admin", async () => {
    mockRequireRole.mockResolvedValue(null);
    const res = await POST();
    expect(res.status).toBe(403);
  });

  it("returns success with result count", async () => {
    mockRequireRole.mockResolvedValue({ user: { id: "a1", role: "admin" } });
    mockSearchWeb.mockResolvedValue({
      results: [
        { title: "R1", url: "https://a.com", content: "c1" },
        { title: "R2", url: "https://b.com", content: "c2" },
      ],
    });

    const res = await POST();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.resultCount).toBe(2);
    expect(json.data.success).toBe(true);
  });

  it("returns 400 when Tavily key not configured", async () => {
    mockRequireRole.mockResolvedValue({ user: { id: "a1", role: "admin" } });
    mockSearchWeb.mockRejectedValue(new Error("Tavily API Key 未配置"));

    const res = await POST();
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("未配置");
  });
});
