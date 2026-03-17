export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-utils";
import { ROLES } from "@/lib/roles";
import { decryptApiKey } from "@/lib/crypto";
import { testModel, fetchModelPricing, getUsdToCny } from "@/lib/ai/pricing-service";

// GET /api/admin/ai-actions — 动作配置列表（所有角色可读）
export async function GET() {
  if (!(await requireRole([ROLES.TEACHER, ROLES.RD_MANAGER, ROLES.ADMIN]))) return forbiddenResponse();

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
  const { actionKey, actionLabel, actionType, providerId, modelName, skipTest, inputPricePerM, outputPricePerM, pricePerCall, priceCurrency } = body;

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

  // 币种转换：用户输入 CNY 时转为 USD 存储
  const usdToCny = priceCurrency === "CNY" ? await getUsdToCny() : 1;

  // 价格处理
  let pricingData: {
    inputPricePerM: number | null;
    outputPricePerM: number | null;
    pricePerCall: number | null;
    pricingSource: string;
  } = {
    inputPricePerM: null,
    outputPricePerM: null,
    pricePerCall: null,
    pricingSource: "auto",
  };

  if (actionType === "image" && pricePerCall != null) {
    // 图片模型：按次计费（手动）
    pricingData = {
      inputPricePerM: null,
      outputPricePerM: null,
      pricePerCall: pricePerCall / usdToCny,
      pricingSource: "manual",
    };
  } else if (inputPricePerM != null && outputPricePerM != null) {
    // 文本模型：按 token 计费（手动）
    pricingData = {
      inputPricePerM: inputPricePerM / usdToCny,
      outputPricePerM: outputPricePerM / usdToCny,
      pricePerCall: null,
      pricingSource: "manual",
    };
  } else {
    // 自动获取（仅文本模型有效）
    const fetched = await fetchModelPricing(provider.baseUrl, apiKey, modelName, provider.proxyUrl);
    if (fetched) {
      pricingData = { ...fetched, pricePerCall: null, pricingSource: "auto" };
    }
  }

  const hasPricing = pricingData.pricePerCall != null || (pricingData.inputPricePerM != null && pricingData.outputPricePerM != null);

  await prisma.aiActionConfig.upsert({
    where: { actionKey },
    create: {
      actionKey, actionLabel, actionType, providerId, modelName,
      inputPricePerM: pricingData.inputPricePerM,
      outputPricePerM: pricingData.outputPricePerM,
      pricePerCall: pricingData.pricePerCall,
      pricingSource: pricingData.pricingSource,
      pricingUpdatedAt: hasPricing ? new Date() : null,
    },
    update: {
      actionLabel, actionType, providerId, modelName,
      inputPricePerM: pricingData.inputPricePerM,
      outputPricePerM: pricingData.outputPricePerM,
      pricePerCall: pricingData.pricePerCall,
      pricingSource: pricingData.pricingSource,
      pricingUpdatedAt: hasPricing ? new Date() : null,
    },
  });

  // 重新查询以包含 provider 关联
  const result = await prisma.aiActionConfig.findUnique({
    where: { actionKey },
    include: { provider: { select: { id: true, name: true } } },
  });

  return NextResponse.json({
    data: result,
    pricingAvailable: hasPricing,
  });
}
