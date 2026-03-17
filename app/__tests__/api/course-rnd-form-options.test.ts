import { GET } from "@/app/api/course-rnd/form-options/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    baselineDoc: { findMany: jest.fn() },
    preset: { findMany: jest.fn() },
  },
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as jest.Mock;
const mockBaselineFindMany = prisma.baselineDoc.findMany as jest.Mock;
const mockPresetFindMany = prisma.preset.findMany as jest.Mock;

const rdSession = { user: { id: "rd-1", role: "rd_manager" }, expires: "" };
const teacherSession = { user: { id: "t-1", role: "teacher" }, expires: "" };

beforeEach(() => jest.clearAllMocks());

describe("GET /api/course-rnd/form-options", () => {
  it("returns 403 for teacher", async () => {
    mockAuth.mockResolvedValue(teacherSession);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns empty arrays when no data exists", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockBaselineFindMany.mockResolvedValue([]);
    mockPresetFindMany.mockResolvedValue([]);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.ageRanges).toEqual([]);
    expect(json.data.levels).toEqual([]);
    expect(json.data.orgForms).toEqual([]);
    expect(json.data.deliverableTypes).toEqual([
      { group: "基础稳态产出物池", items: [] },
      { group: "高作品感扩展产出物池", items: [] },
    ]);
    expect(json.data.courseDirections).toEqual([]);
    expect(json.data.imageStyles).toEqual([]);
    expect(json.data.coreNeedsTags).toEqual([]);
    expect(json.data.constraintsTags).toEqual([]);
  });

  it("categorizes baseline docs correctly", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockBaselineFindMany.mockResolvedValue([
      { type: "age", key: "A1", label: "6-7岁", sortOrder: 1 },
      { type: "level", key: "L1", label: "基础", sortOrder: 1 },
      { type: "org_form", key: "S1", label: "个人", sortOrder: 1 },
      { type: "deliverable", key: "P1", label: "手工", sortOrder: 1 },
      { type: "deliverable", key: "P6", label: "编程", sortOrder: 6 },
    ]);
    mockPresetFindMany.mockResolvedValue([]);

    const res = await GET();
    const json = await res.json();
    expect(json.data.ageRanges).toEqual([{ key: "A1", label: "6-7岁" }]);
    expect(json.data.levels).toEqual([{ key: "L1", label: "基础" }]);
    expect(json.data.orgForms).toEqual([{ key: "S1", label: "个人" }]);
    expect(json.data.deliverableTypes[0].items).toEqual([{ key: "P1", label: "手工" }]);
    expect(json.data.deliverableTypes[1].items).toEqual([{ key: "P6", label: "编程" }]);
  });

  it("splits deliverables at sortOrder 5 boundary", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockBaselineFindMany.mockResolvedValue([
      { type: "deliverable", key: "P5", label: "Five", sortOrder: 5 },
      { type: "deliverable", key: "P6", label: "Six", sortOrder: 6 },
    ]);
    mockPresetFindMany.mockResolvedValue([]);

    const res = await GET();
    const json = await res.json();
    // sortOrder <= 5 goes to basic
    expect(json.data.deliverableTypes[0].items).toEqual([{ key: "P5", label: "Five" }]);
    // sortOrder > 5 goes to extended
    expect(json.data.deliverableTypes[1].items).toEqual([{ key: "P6", label: "Six" }]);
  });

  it("categorizes presets correctly", async () => {
    mockAuth.mockResolvedValue(rdSession);
    mockBaselineFindMany.mockResolvedValue([]);
    mockPresetFindMany.mockResolvedValue([
      { category: "course_direction", name: "AI Art", value: "ai_art" },
      { category: "image_style", name: "Cartoon", value: "cartoon" },
      { category: "core_needs_tag", name: "Creativity", value: "creativity" },
      { category: "constraints_tag", name: "No Violence", value: "no_violence" },
    ]);

    const res = await GET();
    const json = await res.json();
    expect(json.data.courseDirections).toEqual([{ name: "AI Art", value: "ai_art" }]);
    expect(json.data.imageStyles).toEqual([{ name: "Cartoon", value: "cartoon" }]);
    expect(json.data.coreNeedsTags).toEqual([{ name: "Creativity", value: "creativity" }]);
    expect(json.data.constraintsTags).toEqual([{ name: "No Violence", value: "no_violence" }]);
  });

  it("allows admin role access", async () => {
    const adminSession = { user: { id: "a-1", role: "admin" }, expires: "" };
    mockAuth.mockResolvedValue(adminSession);
    mockBaselineFindMany.mockResolvedValue([]);
    mockPresetFindMany.mockResolvedValue([]);

    const res = await GET();
    expect(res.status).toBe(200);
  });
});
