jest.mock("@/lib/prisma", () => ({
  prisma: {
    baselineDoc: { findMany: jest.fn() },
  },
}));

import { formatAgeRange, loadAgeRangeLabels } from "@/lib/age-range-labels";
import { prisma } from "@/lib/prisma";

const mockFindMany = prisma.baselineDoc.findMany as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── formatAgeRange ───

describe("formatAgeRange", () => {
  it("returns full label for known keys using fallback map", () => {
    expect(formatAgeRange("A1")).toBe("A1｜6-7岁");
    expect(formatAgeRange("A2")).toBe("A2｜8-9岁");
    expect(formatAgeRange("A3")).toBe("A3｜10-12岁");
    expect(formatAgeRange("A4")).toBe("A4｜13-15岁");
  });

  it("returns fallback format for unknown value", () => {
    expect(formatAgeRange("A5")).toBe("A5岁");
    expect(formatAgeRange("unknown")).toBe("unknown岁");
  });

  it("uses custom labels map when provided", () => {
    const customLabels = {
      A1: "A1｜低龄段",
      B1: "B1｜高中段",
    };
    expect(formatAgeRange("A1", customLabels)).toBe("A1｜低龄段");
    expect(formatAgeRange("B1", customLabels)).toBe("B1｜高中段");
  });

  it("falls back to suffix format when key not in custom map", () => {
    const customLabels = { A1: "A1｜低龄段" };
    expect(formatAgeRange("A9", customLabels)).toBe("A9岁");
  });
});

// ─── loadAgeRangeLabels ───

describe("loadAgeRangeLabels", () => {
  it("returns labels from DB merged with fallback", async () => {
    mockFindMany.mockResolvedValue([
      { key: "A1", label: "A1｜6-7岁 启蒙段" },
      { key: "A2", label: "A2｜8-9岁 基础段" },
    ]);

    const labels = await loadAgeRangeLabels();
    // DB labels should override fallback; trailing segment stripped
    expect(labels.A1).toBe("A1｜6-7岁");
    expect(labels.A2).toBe("A2｜8-9岁");
    // Fallback keys still present
    expect(labels.A3).toBe("A3｜10-12岁");
    expect(labels.A4).toBe("A4｜13-15岁");
  });

  it("returns fallback labels when DB returns empty array", async () => {
    mockFindMany.mockResolvedValue([]);

    const labels = await loadAgeRangeLabels();
    expect(labels).toEqual({
      A1: "A1｜6-7岁",
      A2: "A2｜8-9岁",
      A3: "A3｜10-12岁",
      A4: "A4｜13-15岁",
    });
  });

  it("returns fallback labels when DB throws", async () => {
    mockFindMany.mockRejectedValue(new Error("DB error"));

    const labels = await loadAgeRangeLabels();
    expect(labels).toEqual({
      A1: "A1｜6-7岁",
      A2: "A2｜8-9岁",
      A3: "A3｜10-12岁",
      A4: "A4｜13-15岁",
    });
  });

  it("queries baselineDoc with type=age filter", async () => {
    mockFindMany.mockResolvedValue([]);

    await loadAgeRangeLabels();
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { type: "age" },
      select: { key: true, label: true },
    });
  });

  it("preserves labels without trailing segment marker", async () => {
    mockFindMany.mockResolvedValue([
      { key: "A3", label: "A3｜10-12岁" }, // no trailing segment
    ]);

    const labels = await loadAgeRangeLabels();
    expect(labels.A3).toBe("A3｜10-12岁");
  });
});
