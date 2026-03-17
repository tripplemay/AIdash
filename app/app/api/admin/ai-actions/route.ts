export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { ROLES } from "@/lib/roles";
import { decryptApiKey } from "@/lib/crypto";
import { testModel, fetchModelPricing } from "@/lib/ai/pricing-service";

// GET /api/admin/ai-actions — 动作配置列表
export async function GET() {
  if (!(await requireRole([ROLES.ADMIN]))) return forbiddenResponse();

  const actions = await prisma.aiActionConfig.findMany({
    include: { provider: { select: { id: true, name: true } } },
    orderBy: { actionKey: "asc" },
  });

  return NextResponse.json({ data: actions });
}

// POST /api/admin/ai-actions — 新增/更新动作配置（upsert）
// 保存前自动测试模型可用性 + 获取价格
export async function POST(request: Request) {
  if (!(await requireRole([ROLES.ADMIN]))) return forbiddenResponse();

  const body = await request.json();
  const { actionKey, actionLabel, actionType, providerId, modelName, skipTest, inputPricePerM, outputPricePerM } = body;

  if (!actionKey || !actionLabel || !actionType || !providerId || !modelName) {
    return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
  }

  // 获取提供商信息
  const provider = await prisma.aiProvider.findUnique({ where: { id: providerId } });
  if (!provider) {
    return NextResponse.json({ error: "服务商不存在" }, { status: 404 });
  }

  const apiKey = decryptApiKey(provider.apiKeyEnc);

  // 模型可用性测试（图片模型跳过 chat 测试，除非 skipTest=true）
  if (!skipTest && actionType !== "image") {
    const testResult = await testModel(provider.baseUrl, apiKey, modelName, provider.proxyUrl);
    if (!testResult.success) {
      return NextResponse.json({
        error: `模型测试失败：${testResult.error}`,
        testFailed: true,
      }, { status: 422 });
    }
  }

  // 价格：手动输入优先，否则自动获取
  let pricing: { inputPricePerM: number | null; outputPricePerM: number | null; pricingSource: string } = {
    inputPricePerM: null,
    outputPricePerM: null,
    pricingSource: "auto",
  };

  if (inputPricePerM != null && outputPricePerM != null) {
    pricing = { inputPricePerM, outputPricePerM, pricingSource: "manual" };
  } else {
    const fetched = await fetchModelPricing(provider.baseUrl, apiKey, modelName, provider.proxyUrl);
    if (fetched) {
      pricing = { ...fetched, pricingSource: "auto" };
    }
  }

  const config = await prisma.aiActionConfig.upsert({
    where: { actionKey },
    create: {
      actionKey, actionLabel, actionType, providerId, modelName,
      inputPricePerM: pricing.inputPricePerM,
      outputPricePerM: pricing.outputPricePerM,
      pricingSource: pricing.pricingSource,
      pricingUpdatedAt: pricing.inputPricePerM ? new Date() : null,
    },
    update: {
      actionLabel, actionType, providerId, modelName,
      inputPricePerM: pricing.inputPricePerM,
      outputPricePerM: pricing.outputPricePerM,
      pricingSource: pricing.pricingSource,
      pricingUpdatedAt: pricing.inputPricePerM ? new Date() : null,
    },
  });

  // 重新查询以包含 provider 关联
  const result = await prisma.aiActionConfig.findUnique({
    where: { actionKey },
    include: { provider: { select: { id: true, name: true } } },
  });

  return NextResponse.json({
    data: result,
    pricingAvailable: pricing.inputPricePerM != null,
  });
}
