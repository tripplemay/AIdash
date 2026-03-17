export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { ROLES } from "@/lib/roles";
import {
  refreshExchangeRate,
  refreshAllActionPricing,
  getUsdToCny,
} from "@/lib/ai/pricing-service";

// GET /api/admin/refresh-pricing — 获取当前价格状态（所有角色可读）
export async function GET() {
  if (!(await requireRole([ROLES.TEACHER, ROLES.RD_MANAGER, ROLES.ADMIN]))) return forbiddenResponse();

  const rate = await getUsdToCny();
  const config = await prisma.systemConfig.findUnique({ where: { key: "usd_to_cny" } });

  return NextResponse.json({
    data: {
      usdToCny: rate,
      lastUpdated: config?.updatedAt ?? null,
    },
  });
}

// POST /api/admin/refresh-pricing — 手动或 cron 触发价格刷新
export async function POST(request: Request) {
  // 支持两种鉴权：session（管理员手动触发）或 cron secret
  const url = new URL(request.url);
  const cronSecret = url.searchParams.get("secret");

  if (cronSecret) {
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Invalid secret" }, { status: 403 });
    }
  } else {
    if (!(await requireRole([ROLES.ADMIN]))) return forbiddenResponse();
  }

  const results: { exchangeRate?: { rate: number; source: string }; exchangeRateError?: string; models: unknown[] } = {
    models: [],
  };

  // 刷新汇率
  try {
    results.exchangeRate = await refreshExchangeRate();
  } catch (e) {
    results.exchangeRateError = e instanceof Error ? e.message : String(e);
  }

  // 刷新模型价格
  results.models = await refreshAllActionPricing();

  return NextResponse.json({ data: results });
}
