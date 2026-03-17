import { GET } from "@/app/api/ai-images/[...path]/route";
import { NextRequest } from "next/server";

jest.mock("node:fs", () => ({
  existsSync: jest.fn(),
  statSync: jest.fn(),
  readFileSync: jest.fn(),
}));

import fs from "node:fs";

const mockExistsSync = fs.existsSync as jest.Mock;
const mockStatSync = fs.statSync as jest.Mock;
const mockReadFileSync = fs.readFileSync as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("GET /api/ai-images/[...path]", () => {
  it("returns 403 for path traversal attempt", async () => {
    const routeParams = { params: Promise.resolve({ path: ["..", "..", "etc", "passwd"] }) };
    const res = await GET(new NextRequest("http://localhost/api/ai-images/../../../etc/passwd"), routeParams);
    expect(res.status).toBe(403);
  });

  it("returns 404 when file does not exist", async () => {
    mockExistsSync.mockReturnValue(false);
    const routeParams = { params: Promise.resolve({ path: ["project1", "img.png"] }) };
    const res = await GET(new NextRequest("http://localhost/api/ai-images/project1/img.png"), routeParams);
    expect(res.status).toBe(404);
  });

  it("returns 404 when path is a directory", async () => {
    mockExistsSync.mockReturnValue(true);
    mockStatSync.mockReturnValue({ isDirectory: () => true });
    const routeParams = { params: Promise.resolve({ path: ["project1"] }) };
    const res = await GET(new NextRequest("http://localhost/api/ai-images/project1"), routeParams);
    expect(res.status).toBe(404);
  });

  it("returns PNG image with correct content type", async () => {
    mockExistsSync.mockReturnValue(true);
    mockStatSync.mockReturnValue({ isDirectory: () => false });
    const imageBuffer = Buffer.from("fake-png-data");
    mockReadFileSync.mockReturnValue(imageBuffer);

    const routeParams = { params: Promise.resolve({ path: ["project1", "cover.png"] }) };
    const res = await GET(new NextRequest("http://localhost/api/ai-images/project1/cover.png"), routeParams);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=86400");
  });

  it("returns JPEG image with correct content type", async () => {
    mockExistsSync.mockReturnValue(true);
    mockStatSync.mockReturnValue({ isDirectory: () => false });
    mockReadFileSync.mockReturnValue(Buffer.from("fake-jpg-data"));

    const routeParams = { params: Promise.resolve({ path: ["img.jpg"] }) };
    const res = await GET(new NextRequest("http://localhost/api/ai-images/img.jpg"), routeParams);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
  });

  it("returns octet-stream for unknown extensions", async () => {
    mockExistsSync.mockReturnValue(true);
    mockStatSync.mockReturnValue({ isDirectory: () => false });
    mockReadFileSync.mockReturnValue(Buffer.from("data"));

    const routeParams = { params: Promise.resolve({ path: ["file.webp"] }) };
    const res = await GET(new NextRequest("http://localhost/api/ai-images/file.webp"), routeParams);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/octet-stream");
  });
});
