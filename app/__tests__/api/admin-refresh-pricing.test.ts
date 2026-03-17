import { GET, POST } from "@/app/api/admin/refresh-pricing/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    systemConfig: { findUnique: jest.fn() },
  },
}));
jest.mock("@/lib/ai/pricing-service", () => ({
  refreshExchangeRate: jest.fn(),
  refreshAllActionPricing: jest.fn(),
  getUsdToCny: jest.fn(),
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  refreshExchangeRate,
  refreshAllActionPricing,
  getUsdToCny,
} from "@/lib/ai/pricing-service";

const mockAuth = auth as jest.Mock;
const mockFindConfig = prisma.systemConfig.findUnique as jest.Mock;
const mockRefreshRate = refreshExchangeRate as jest.Mock;
const mockRefreshPricing = refreshAllActionPricing as jest.Mock;
const mockGetRate = getUsdToCny as jest.Mock;

const adminSession = { user: { id: "a-1", role: "admin" }, expires: "" };
const teacherSession = { user: { id: "t-1", role: "teacher" }, expires: "" };

const makePost = (query = "") =>
  new Request(`http://localhost/api/admin/refresh-pricing${query}`, { method: "POST" });

beforeEach(() => jest.clearAllMocks());

describe("GET /api/admin/refresh-pricing", () => {
  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns pricing status for teacher (all roles allowed)", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    mockGetRate.mockResolvedValue(7.2);
    mockFindConfig.mockResolvedValue({ key: "usd_to_cny", value: "7.2", updatedAt: new Date() });
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.usdToCny).toBe(7.2);
    expect(json.data.lastUpdated).toBeDefined();
  });

  it("returns null lastUpdated when no config exists", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockGetRate.mockResolvedValue(7.2);
    mockFindConfig.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.lastUpdated).toBeNull();
  });
});

describe("POST /api/admin/refresh-pricing", () => {
  it("returns 403 when unauthenticated (no session, no secret)", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makePost());
    expect(res.status).toBe(403);
  });

  it("returns 403 for non-admin without cron secret", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const res = await POST(makePost());
    expect(res.status).toBe(403);
  });

  it("returns 403 for invalid cron secret", async () => {
    const originalEnv = process.env.CRON_SECRET;
    process.env.CRON_SECRET = "correct-secret";
    const res = await POST(makePost("?secret=wrong-secret"));
    expect(res.status).toBe(403);
    process.env.CRON_SECRET = originalEnv;
  });

  it("refreshes pricing for admin successfully", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockRefreshRate.mockResolvedValue({ rate: 7.2, source: "api" });
    mockRefreshPricing.mockResolvedValue([{ actionKey: "generate_framework", success: true }]);
    const res = await POST(makePost());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.exchangeRate.rate).toBe(7.2);
    expect(json.data.models).toHaveLength(1);
  });

  it("allows cron secret auth (bypasses session)", async () => {
    const originalEnv = process.env.CRON_SECRET;
    process.env.CRON_SECRET = "my-cron-secret";
    mockRefreshRate.mockResolvedValue({ rate: 7.2, source: "api" });
    mockRefreshPricing.mockResolvedValue([]);
    const res = await POST(makePost("?secret=my-cron-secret"));
    expect(res.status).toBe(200);
    process.env.CRON_SECRET = originalEnv;
  });

  it("handles exchange rate refresh error gracefully", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockRefreshRate.mockRejectedValue(new Error("Network error"));
    mockRefreshPricing.mockResolvedValue([]);
    const res = await POST(makePost());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.exchangeRateError).toBe("Network error");
    expect(json.data.models).toHaveLength(0);
  });
});
