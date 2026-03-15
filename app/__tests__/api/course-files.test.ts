import { GET } from "@/app/api/course-files/[...path]/route";
import { NextRequest } from "next/server";
import fs from "node:fs";
import path from "node:path";

jest.mock("node:fs");

const mockExistsSync = fs.existsSync as jest.Mock;
const mockStatSync = fs.statSync as jest.Mock;
const mockReadFileSync = fs.readFileSync as jest.Mock;

const makeReq = () => new NextRequest("http://localhost/api/course-files/test/file.png");
const makeParams = (segments: string[]) => ({ params: Promise.resolve({ path: segments }) });

beforeEach(() => jest.clearAllMocks());

describe("GET /api/course-files/[...path]", () => {
  it("returns 403 for path traversal", async () => {
    const res = await GET(makeReq(), makeParams(["../../etc/passwd"]));
    expect(res.status).toBe(403);
  });

  it("returns 404 when file does not exist", async () => {
    mockExistsSync.mockReturnValue(false);
    const res = await GET(makeReq(), makeParams(["test", "file.png"]));
    expect(res.status).toBe(404);
  });

  it("returns 404 for directories", async () => {
    mockExistsSync.mockReturnValue(true);
    mockStatSync.mockReturnValue({ isDirectory: () => true });
    const res = await GET(makeReq(), makeParams(["test"]));
    expect(res.status).toBe(404);
  });

  it("returns file with correct content type", async () => {
    mockExistsSync.mockReturnValue(true);
    mockStatSync.mockReturnValue({ isDirectory: () => false });
    mockReadFileSync.mockReturnValue(Buffer.from("fake image data"));
    const res = await GET(makeReq(), makeParams(["test", "image.png"]));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("Cache-Control")).toContain("max-age=3600");
  });

  it("returns octet-stream for unknown extensions", async () => {
    mockExistsSync.mockReturnValue(true);
    mockStatSync.mockReturnValue({ isDirectory: () => false });
    mockReadFileSync.mockReturnValue(Buffer.from("data"));
    const res = await GET(makeReq(), makeParams(["file.xyz"]));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/octet-stream");
  });
});
