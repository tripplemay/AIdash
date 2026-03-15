import { POST } from "@/app/api/admin/upload/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    coursePackage: { upsert: jest.fn() },
    lesson: { upsert: jest.fn() },
    $transaction: jest.fn((fn: Function) => fn({ coursePackage: { upsert: jest.fn() }, lesson: { upsert: jest.fn() } })),
  },
}));
jest.mock("adm-zip");
jest.mock("node:fs");

import { auth } from "@/auth";

const mockAuth = auth as jest.Mock;
const adminSession = { user: { role: "admin" }, expires: "" };

function makeUploadReq(file?: { name: string; content: Buffer; type?: string }) {
  const formData = new FormData();
  if (file) {
    const blob = new Blob([file.content], { type: file.type ?? "application/zip" });
    formData.append("file", blob, file.name);
  }
  return new Request("http://localhost/api/admin/upload", {
    method: "POST",
    body: formData,
  });
}

beforeEach(() => jest.clearAllMocks());

describe("POST /api/admin/upload", () => {
  it("returns 403 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makeUploadReq({ name: "test.zip", content: Buffer.from("") }));
    expect(res.status).toBe(403);
  });

  it("returns 403 for non-admin", async () => {
    mockAuth.mockResolvedValue({ user: { role: "teacher" }, expires: "" });
    const res = await POST(makeUploadReq({ name: "test.zip", content: Buffer.from("") }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when no file provided", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const req = new Request("http://localhost/api/admin/upload", {
      method: "POST",
      body: new FormData(),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("file");
  });

  it("returns 400 for non-zip file", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const res = await POST(makeUploadReq({ name: "test.txt", content: Buffer.from("hello") }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("zip");
  });

  it("returns 400 for oversized file", async () => {
    mockAuth.mockResolvedValue(adminSession);
    const bigBuffer = Buffer.alloc(51 * 1024 * 1024);
    const res = await POST(makeUploadReq({ name: "big.zip", content: bigBuffer }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("50MB");
  });
});
