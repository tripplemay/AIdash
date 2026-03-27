import { GET } from "@/app/api/admin/ai-actions/registry/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    preset: { findMany: jest.fn() },
    aiActionConfig: { findMany: jest.fn() },
  },
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as jest.Mock;
const mockPresetFind = prisma.preset.findMany as jest.Mock;
const mockConfigFind = prisma.aiActionConfig.findMany as jest.Mock;

const adminSession = { user: { id: "a-1", role: "admin" }, expires: "" };
const teacherSession = { user: { id: "t-1", role: "teacher" }, expires: "" };

beforeEach(() => jest.clearAllMocks());

describe("GET /api/admin/ai-actions/registry", () => {
  it("returns 403 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("allows teacher read access", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    mockPresetFind.mockResolvedValue([]);
    mockConfigFind.mockResolvedValue([]);
    const res = await GET();
    expect(res.status).toBe(200);
  });

  it("returns registered actions with configured status", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockPresetFind.mockResolvedValue([
      { name: "generate_framework", value: JSON.stringify({ label: "生成课程框架", type: "text" }) },
      { name: "lesson_cover", value: JSON.stringify({ label: "课次封面图", type: "image" }) },
      { name: "chat", value: JSON.stringify({ label: "AI 对话", type: "text" }) },
    ]);
    mockConfigFind.mockResolvedValue([
      { actionKey: "generate_framework" },
    ]);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(3);

    const fw = json.data.find((a: { key: string }) => a.key === "generate_framework");
    expect(fw.label).toBe("生成课程框架");
    expect(fw.type).toBe("text");
    expect(fw.configured).toBe(true);

    const cover = json.data.find((a: { key: string }) => a.key === "lesson_cover");
    expect(cover.type).toBe("image");
    expect(cover.configured).toBe(false);

    const chat = json.data.find((a: { key: string }) => a.key === "chat");
    expect(chat.configured).toBe(false);
  });

  it("returns empty array when no registry presets exist", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockPresetFind.mockResolvedValue([]);
    mockConfigFind.mockResolvedValue([]);
    const res = await GET();
    const json = await res.json();
    expect(json.data).toEqual([]);
  });

  it("handles malformed preset value gracefully", async () => {
    mockAuth.mockResolvedValue(adminSession);
    mockPresetFind.mockResolvedValue([
      { name: "bad_action", value: "not-json" },
    ]);
    mockConfigFind.mockResolvedValue([]);
    const res = await GET();
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].key).toBe("bad_action");
    expect(json.data[0].label).toBe("bad_action");
    expect(json.data[0].type).toBe("text");
  });
});
