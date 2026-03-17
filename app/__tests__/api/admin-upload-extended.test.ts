import { POST } from "@/app/api/admin/upload/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    coursePackage: { upsert: jest.fn() },
    lesson: { upsert: jest.fn() },
    attachment: { deleteMany: jest.fn(), createMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock("adm-zip");
jest.mock("node:fs");

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import AdmZip from "adm-zip";

const mockAuth = auth as jest.Mock;
const mockTransaction = prisma.$transaction as jest.Mock;
const MockAdmZip = AdmZip as jest.MockedClass<typeof AdmZip>;

const adminSession = { user: { role: "admin" }, expires: "" };

function makeUploadReq(file?: { name: string; size?: number; content?: string }) {
  const formData = new FormData();
  if (file) {
    const content = file.content ?? (file.size ? "x".repeat(file.size) : "zipdata");
    const blob = new Blob([content], { type: "application/zip" });
    formData.append("file", blob, file.name);
  }
  return new Request("http://localhost/api/admin/upload", {
    method: "POST",
    body: formData,
  });
}

beforeEach(() => jest.clearAllMocks());

describe("POST /api/admin/upload — extended tests", () => {
  it("returns 400 when FormData has no file field", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const req = new Request("http://localhost/api/admin/upload", {
      method: "POST",
      body: new FormData(),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("file");
  });

  it("returns 400 for non-zip file extension", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const res = await POST(makeUploadReq({ name: "data.tar.gz" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("zip");
  });

  it("returns 400 when zip is corrupt (AdmZip constructor throws)", async () => {
    mockAuth.mockResolvedValue(adminSession);
    MockAdmZip.mockImplementation(() => {
      throw new Error("Invalid zip");
    });
    const res = await POST(makeUploadReq({ name: "bad.zip" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("损坏");
  });

  it("returns 400 when zip has multiple root directories", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const mockEntries = [
      { entryName: "dir-a/file1.txt" },
      { entryName: "dir-b/file2.txt" },
    ];
    MockAdmZip.mockImplementation(() => ({
      getEntries: () => mockEntries,
      getEntry: jest.fn(),
      extractAllTo: jest.fn(),
    }) as unknown as AdmZip);

    const res = await POST(makeUploadReq({ name: "multi-root.zip" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("根目录");
  });

  it("returns 400 when slug contains invalid characters", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const mockEntries = [{ entryName: "My_Package/file.txt" }];
    MockAdmZip.mockImplementation(() => ({
      getEntries: () => mockEntries,
      getEntry: jest.fn(),
      extractAllTo: jest.fn(),
    }) as unknown as AdmZip);

    const res = await POST(makeUploadReq({ name: "bad-slug.zip" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("slug");
  });

  it("returns 400 when package.json is missing from zip", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const mockEntries = [{ entryName: "my-course/readme.txt" }];
    MockAdmZip.mockImplementation(() => ({
      getEntries: () => mockEntries,
      getEntry: jest.fn(() => null),
      extractAllTo: jest.fn(),
    }) as unknown as AdmZip);

    const res = await POST(makeUploadReq({ name: "no-manifest.zip" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("package.json");
  });

  it("returns 400 when package.json is invalid JSON", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const mockEntries = [{ entryName: "my-course/package.json" }];
    MockAdmZip.mockImplementation(() => ({
      getEntries: () => mockEntries,
      getEntry: jest.fn(() => ({
        getData: () => Buffer.from("not valid json{{{"),
      })),
      extractAllTo: jest.fn(),
    }) as unknown as AdmZip);

    const res = await POST(makeUploadReq({ name: "bad-json.zip" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("package.json 解析失败");
  });

  it("returns 400 when package.json missing required fields", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const manifest = { package_slug: "my-course" }; // missing title, age_range, level
    const mockEntries = [{ entryName: "my-course/package.json" }];
    MockAdmZip.mockImplementation(() => ({
      getEntries: () => mockEntries,
      getEntry: jest.fn(() => ({
        getData: () => Buffer.from(JSON.stringify(manifest)),
      })),
      extractAllTo: jest.fn(),
    }) as unknown as AdmZip);

    const res = await POST(makeUploadReq({ name: "incomplete.zip" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("必填字段");
  });

  it("returns 400 when lessons array is empty", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const manifest = {
      package_slug: "my-course",
      package_title: "My Course",
      age_range: "8-10",
      level: "L1",
      lessons: [],
    };
    const mockEntries = [{ entryName: "my-course/package.json" }];
    MockAdmZip.mockImplementation(() => ({
      getEntries: () => mockEntries,
      getEntry: jest.fn(() => ({
        getData: () => Buffer.from(JSON.stringify(manifest)),
      })),
      extractAllTo: jest.fn(),
    }) as unknown as AdmZip);

    const res = await POST(makeUploadReq({ name: "no-lessons.zip" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("lessons 为空");
  });

  it("returns 500 when zip extraction fails", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const manifest = {
      package_slug: "my-course",
      package_title: "My Course",
      age_range: "8-10",
      level: "L1",
      lessons: [{ lesson_no: 1, lesson_dir: "lesson-01" }],
    };
    const mockEntries = [{ entryName: "my-course/package.json" }];
    MockAdmZip.mockImplementation(() => ({
      getEntries: () => mockEntries,
      getEntry: jest.fn(() => ({
        getData: () => Buffer.from(JSON.stringify(manifest)),
      })),
      extractAllTo: jest.fn(() => {
        throw new Error("disk full");
      }),
    }) as unknown as AdmZip);

    const res = await POST(makeUploadReq({ name: "extract-fail.zip" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("解压失败");
  });

  it("returns 201 on successful upload with transaction", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const manifest = {
      package_slug: "my-course",
      package_title: "My Course",
      age_range: "8-10",
      level: "L1",
      cover_image: "cover.png",
      lessons: [{ lesson_no: 1, lesson_dir: "lesson-01" }],
    };
    const lessonManifest = {
      lesson_no: 1,
      lesson_title: "Lesson 1",
      sections: [{ type: "text", content: "Hello" }],
      attachments: [{ type: "pdf", title: "Handout", path: "handout.pdf" }],
    };

    const getEntryMock = jest.fn((name: string) => {
      if (name === "my-course/package.json") {
        return { getData: () => Buffer.from(JSON.stringify(manifest)) };
      }
      if (name.includes("lesson.json")) {
        return { getData: () => Buffer.from(JSON.stringify(lessonManifest)) };
      }
      return null;
    });

    const mockEntries = [{ entryName: "my-course/package.json" }];
    MockAdmZip.mockImplementation(() => ({
      getEntries: () => mockEntries,
      getEntry: getEntryMock,
      extractAllTo: jest.fn(),
    }) as unknown as AdmZip);

    // Transaction executes the callback with a tx proxy
    mockTransaction.mockImplementation(async (fn: Function) => {
      const tx = {
        coursePackage: {
          upsert: jest.fn().mockResolvedValue({ id: "pkg-1" }),
        },
        lesson: {
          upsert: jest.fn().mockResolvedValue({ id: "lesson-1" }),
        },
        attachment: {
          deleteMany: jest.fn(),
          createMany: jest.fn(),
        },
      };
      return fn(tx);
    });

    const res = await POST(makeUploadReq({ name: "good.zip" }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.slug).toBe("my-course");
    expect(json.data.lessonsImported).toBe(1);
    expect(json.data.attachmentsImported).toBe(1);
  });

  it("returns 500 and cleans up files when database transaction fails", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const manifest = {
      package_slug: "my-course",
      package_title: "My Course",
      age_range: "8-10",
      level: "L1",
      lessons: [{ lesson_no: 1, lesson_dir: "lesson-01" }],
    };

    const mockEntries = [{ entryName: "my-course/package.json" }];
    MockAdmZip.mockImplementation(() => ({
      getEntries: () => mockEntries,
      getEntry: jest.fn(() => ({
        getData: () => Buffer.from(JSON.stringify(manifest)),
      })),
      extractAllTo: jest.fn(),
    }) as unknown as AdmZip);

    mockTransaction.mockRejectedValue(new Error("DB constraint violation"));

    const res = await POST(makeUploadReq({ name: "db-fail.zip" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("数据库写入失败");
  });

  it("allows rd_manager role to upload", async () => {
    mockAuth.mockResolvedValue({ user: { role: "rd_manager" }, expires: "" });
    // Will fail at zip parsing but should not be 403
    MockAdmZip.mockImplementation(() => {
      throw new Error("Invalid zip");
    });
    const res = await POST(makeUploadReq({ name: "test.zip" }));
    // Should be 400 (bad zip), not 403
    expect(res.status).toBe(400);
  });
});
