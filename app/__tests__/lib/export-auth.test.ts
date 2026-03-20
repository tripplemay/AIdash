import { verifyExportToken } from "@/lib/export-auth";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    systemConfig: { findUnique: jest.fn() },
  },
}));

jest.mock("@/lib/crypto", () => ({
  decryptApiKey: jest.fn((v: string) => v.replace("enc_", "")),
}));

import { prisma } from "@/lib/prisma";
import { decryptApiKey } from "@/lib/crypto";

const mockFindUnique = prisma.systemConfig.findUnique as jest.Mock;
const mockDecrypt = decryptApiKey as jest.Mock;

beforeEach(() => jest.clearAllMocks());

function makeRequest(token?: string): Request {
  const headers: Record<string, string> = {};
  if (token) headers["authorization"] = `Bearer ${token}`;
  return new Request("http://localhost/api/export/test", { headers });
}

describe("verifyExportToken", () => {
  it("returns false when no Authorization header", async () => {
    expect(await verifyExportToken(new Request("http://localhost"))).toBe(false);
  });

  it("returns false when header is not Bearer format", async () => {
    const req = new Request("http://localhost", {
      headers: { authorization: "Basic abc123" },
    });
    expect(await verifyExportToken(req)).toBe(false);
  });

  it("returns false when token is empty", async () => {
    const req = new Request("http://localhost", {
      headers: { authorization: "Bearer " },
    });
    expect(await verifyExportToken(req)).toBe(false);
  });

  it("returns false when no token configured in DB", async () => {
    mockFindUnique.mockResolvedValue(null);
    expect(await verifyExportToken(makeRequest("my-token"))).toBe(false);
  });

  it("returns false when token does not match", async () => {
    mockFindUnique.mockResolvedValue({ key: "export_api_token", value: "enc_correct-token" });
    expect(await verifyExportToken(makeRequest("wrong-token"))).toBe(false);
  });

  it("returns true when token matches", async () => {
    mockFindUnique.mockResolvedValue({ key: "export_api_token", value: "enc_my-secret-token" });
    expect(await verifyExportToken(makeRequest("my-secret-token"))).toBe(true);
  });

  it("returns false when decrypt throws", async () => {
    mockFindUnique.mockResolvedValue({ key: "export_api_token", value: "corrupted" });
    mockDecrypt.mockImplementationOnce(() => { throw new Error("bad"); });
    expect(await verifyExportToken(makeRequest("any-token"))).toBe(false);
  });
});
