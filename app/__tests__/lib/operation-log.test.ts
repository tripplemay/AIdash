jest.mock("@/lib/prisma", () => ({
  prisma: {
    operationLog: { create: jest.fn() },
  },
}));

import { logOperation } from "@/lib/operation-log";
import { prisma } from "@/lib/prisma";

const mockCreate = prisma.operationLog.create as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("logOperation", () => {
  it("creates a log record with all fields", async () => {
    mockCreate.mockResolvedValue({});

    await logOperation({
      userId: "user-1",
      module: "package",
      action: "create",
      targetId: "pkg-1",
      targetName: "Test Package",
      detail: "Created a new package",
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        module: "package",
        action: "create",
        targetId: "pkg-1",
        targetName: "Test Package",
        detail: "Created a new package",
      },
    });
  });

  it("creates a log record with only required fields", async () => {
    mockCreate.mockResolvedValue({});

    await logOperation({
      userId: "user-2",
      module: "user",
      action: "delete",
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-2",
        module: "user",
        action: "delete",
        targetId: undefined,
        targetName: undefined,
        detail: undefined,
      },
    });
  });

  it("skips logging when userId is null", async () => {
    await logOperation({
      userId: null,
      module: "package",
      action: "update",
    });

    expect(mockCreate).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(
      "操作日志缺少 userId，跳过记录:",
      expect.objectContaining({ userId: null }),
    );
  });

  it("skips logging when userId is undefined", async () => {
    await logOperation({
      userId: undefined,
      module: "course_rnd",
      action: "publish",
    });

    expect(mockCreate).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
  });

  it("does not throw when DB create fails", async () => {
    mockCreate.mockRejectedValue(new Error("DB connection lost"));

    await expect(
      logOperation({
        userId: "user-3",
        module: "package",
        action: "update",
      }),
    ).resolves.toBeUndefined();

    expect(console.error).toHaveBeenCalledWith(
      "操作日志写入失败:",
      expect.objectContaining({ userId: "user-3" }),
    );
  });
});
