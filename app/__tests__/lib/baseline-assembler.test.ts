jest.mock("@/lib/prisma", () => ({
  prisma: {
    baselineDoc: { findMany: jest.fn() },
  },
}));

jest.mock("fs", () => ({
  readFileSync: jest.fn(),
}));

import { assembleBaselines, BaselineSet } from "@/lib/ai/baseline-assembler";
import { prisma } from "@/lib/prisma";
import fs from "fs";

const mockFindMany = prisma.baselineDoc.findMany as jest.Mock;
const mockReadFileSync = fs.readFileSync as jest.Mock;

// The module-level cache persists across tests in the same file,
// so we need to isolate by using unique param combos per test.

beforeEach(() => {
  jest.clearAllMocks();
  mockReadFileSync.mockReturnValue("");
});

describe("assembleBaselines", () => {
  describe("DB has records for all dimensions", () => {
    it("returns correct content for each dimension", async () => {
      mockFindMany.mockResolvedValue([
        { type: "general", key: "general", content: "通用基线内容" },
        { type: "matrix", key: "matrix", content: "矩阵内容" },
        { type: "age", key: "6-8", content: "6-8岁基线" },
        { type: "level", key: "beginner", content: "初级基线" },
        { type: "org_form", key: "group", content: "小组基线" },
        { type: "deliverable", key: "video", content: "视频基线" },
      ]);

      const result = await assembleBaselines({
        ageRange: "6-8",
        level: "beginner",
        orgForm: "group",
        deliverableType: "video",
      });

      expect(result.general).toBe("通用基线内容");
      expect(result.matrix).toBe("矩阵内容");
      expect(result.age).toBe("6-8岁基线");
      expect(result.level).toBe("初级基线");
      expect(result.orgForm).toBe("小组基线");
      expect(result.deliverable).toBe("视频基线");
    });
  });

  describe("dimensions not matching any DB record", () => {
    it("returns empty strings for unmatched dimensions", async () => {
      mockFindMany.mockResolvedValue([
        { type: "general", key: "general", content: "通用" },
      ]);

      // Use unique params to avoid cache from other tests
      const result = await assembleBaselines({
        ageRange: "unique-age-1",
        level: "unique-level-1",
        orgForm: "unique-org-1",
        deliverableType: "unique-del-1",
      });

      expect(result.age).toBe("");
      expect(result.level).toBe("");
      expect(result.orgForm).toBe("");
      expect(result.deliverable).toBe("");
      expect(result.matrix).toBe("");
    });
  });

  describe("filesystem fallback for general baseline", () => {
    it("falls back to filesystem when DB returns no general record", async () => {
      mockFindMany.mockResolvedValue([]);
      mockReadFileSync.mockReturnValue("文件系统基线内容");

      const result = await assembleBaselines({
        ageRange: "fallback-age-1",
        level: "fallback-level-1",
      });

      expect(result.general).toBe("文件系统基线内容");
      expect(mockReadFileSync).toHaveBeenCalledTimes(1);
    });
  });

  describe("caching", () => {
    it("does not hit DB again for same params within TTL", async () => {
      const dbRows = [
        { type: "general", key: "general", content: "cached content" },
      ];
      mockFindMany.mockResolvedValue(dbRows);

      const params = {
        ageRange: "cache-age-1",
        level: "cache-level-1",
        orgForm: "cache-org-1",
        deliverableType: "cache-del-1",
      };

      const result1 = await assembleBaselines(params);
      const result2 = await assembleBaselines(params);

      expect(result1.general).toBe("cached content");
      expect(result2.general).toBe("cached content");
      // DB should only be called once; second call uses cache
      expect(mockFindMany).toHaveBeenCalledTimes(1);
    });

    it("produces different cache keys for different params", async () => {
      mockFindMany.mockResolvedValue([
        { type: "general", key: "general", content: "content-A" },
      ]);

      await assembleBaselines({
        ageRange: "diff-age-A",
        level: "diff-level-A",
      });

      mockFindMany.mockResolvedValue([
        { type: "general", key: "general", content: "content-B" },
      ]);

      await assembleBaselines({
        ageRange: "diff-age-B",
        level: "diff-level-B",
      });

      // Both calls should hit DB since params differ
      expect(mockFindMany).toHaveBeenCalledTimes(2);
    });
  });
});
