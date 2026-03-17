export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { ROLES } from "@/lib/roles";
import { decryptApiKey } from "@/lib/crypto";
import { proxyFetch } from "@/lib/proxy-fetch";

// GET /api/admin/ai-providers/[id]/models — 从服务商 API 拉取可用模型列表（含价格）
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireRole([ROLES.ADMIN]))) return forbiddenResponse();

  const { id } = await params;

  const provider = await prisma.aiProvider.findUnique({ where: { id } });
  if (!provider) {
    return NextResponse.json({ error: "服务商不存在" }, { status: 404 });
  }

  const apiKey = decryptApiKey(provider.apiKeyEnc);

  try {
    const base = provider.baseUrl.replace(/\/+$/, "");
    const res = await proxyFetch(`${base}/models`, {
      headers: { "Authorization": `Bearer ${apiKey}` },
      proxyUrl: provider.proxyUrl,
    });

    if (!res.ok) {
      return NextResponse.json({ error: `获取模型列表失败：${res.status}` }, { status: 502 });
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json({ error: "API 返回非 JSON 响应，请检查 API 地址是否正确" }, { status: 502 });
    }

    const json = await res.json();

    interface RawModel {
      id: string;
      name?: string;
      pricing?: { prompt?: string; completion?: string };
      architecture?: { output_modalities?: string[] };
      modalities?: { output_modalities?: string[] };
    }

    const models = (json.data ?? []).map((m: RawModel) => {
      const result: {
        id: string;
        name: string;
        outputModalities: string[];
        pricing?: { inputPerM: number; outputPerM: number };
      } = {
        id: m.id,
        name: m.name ?? m.id,
        outputModalities: m.architecture?.output_modalities ?? m.modalities?.output_modalities ?? ["text"],
      };

      // 解析价格（OpenRouter 返回 USD per token）
      if (m.pricing?.prompt && m.pricing?.completion) {
        const inputPerToken = parseFloat(m.pricing.prompt);
        const outputPerToken = parseFloat(m.pricing.completion);
        if (!isNaN(inputPerToken) && !isNaN(outputPerToken)) {
          result.pricing = {
            inputPerM: inputPerToken * 1_000_000,
            outputPerM: outputPerToken * 1_000_000,
          };
        }
      }

      return result;
    });

    models.sort((a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id));

    return NextResponse.json({ data: models });
  } catch (e) {
    return NextResponse.json({ error: `连接失败：${e instanceof Error ? e.message : String(e)}` }, { status: 502 });
  }
}
