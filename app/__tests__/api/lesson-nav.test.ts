import { GET } from "@/app/api/lesson-nav/route";
import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    lesson: { findUnique: jest.fn() },
    coursePackage: { findFirst: jest.fn() },
  },
}));

import { prisma } from "@/lib/prisma";

const mockFindLesson = prisma.lesson.findUnique as jest.Mock;
const mockFindPkg = prisma.coursePackage.findFirst as jest.Mock;

const makeReq = (lessonId?: string) => {
  const url = lessonId
    ? `http://localhost/api/lesson-nav?lessonId=${lessonId}`
    : "http://localhost/api/lesson-nav";
  return new NextRequest(url);
};

beforeEach(() => jest.clearAllMocks());

describe("GET /api/lesson-nav", () => {
  it("returns empty array when no lessonId", async () => {
    const res = await GET(makeReq());
    expect(await res.json()).toEqual([]);
  });

  it("returns empty array when lesson not found", async () => {
    mockFindLesson.mockResolvedValue(null);
    const res = await GET(makeReq("nonexistent"));
    expect(await res.json()).toEqual([]);
  });

  it("returns null when package not found", async () => {
    mockFindLesson.mockResolvedValue({ packageId: "pkg-1" });
    mockFindPkg.mockResolvedValue(null);
    const res = await GET(makeReq("lesson-1"));
    expect(await res.json()).toBeNull();
  });

  it("returns package with lessons", async () => {
    mockFindLesson.mockResolvedValue({ packageId: "pkg-1" });
    mockFindPkg.mockResolvedValue({
      title: "测试包",
      slug: "test-pkg",
      lessons: [{ id: "l1", lessonNo: 1, title: "第一课" }],
    });
    const res = await GET(makeReq("lesson-1"));
    const data = await res.json();
    expect(data.title).toBe("测试包");
    expect(data.lessons).toHaveLength(1);
  });
});
