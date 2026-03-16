export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { ROLES } from "@/lib/roles";
import { decryptApiKey } from "@/lib/crypto";

// POST /api/admin/ai-providers/[id]/test — 连通性测试
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireRole([ROLES.ADMIN]))) return forbiddenResponse();

  const { id } = await params;

  const provider = await prisma.aiProvider.findUnique({ where: { id } });
  if (!provider) {
    return NextResponse.json({ error: "服务商不存在" }, { status: 404 });
  }

  const apiKey = decryptApiKey(provider.apiKeyEnc);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);

    const base = provider.baseUrl.replace(/\/+$/, "");
    const res = await fetch(`${base}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json({
        success: false,
        error: `API 返回 ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}`,
      });
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json({
        success: false,
        error: `API 返回非 JSON 响应（${contentType || "未知类型"}），请检查 API 地址是否正确`,
      });
    }

    const json = await res.json();
    const modelCount = Array.isArray(json.data) ? json.data.length : 0;

    return NextResponse.json({ success: true, modelCount });
  } catch (e) {
    const message = e instanceof Error
      ? (e.name === "AbortError" ? "连接超时（10 秒）" : e.message)
      : String(e);
    return NextResponse.json({ success: false, error: message });
  }
}
