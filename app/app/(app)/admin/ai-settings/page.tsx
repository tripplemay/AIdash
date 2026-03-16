import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ROLES } from "@/lib/roles";
import AiSettingsPage from "@/components/admin/AiSettingsPage";

export const dynamic = "force-dynamic";

export default async function AdminAiSettingsPage() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (role !== ROLES.ADMIN) redirect("/");

  // 获取用量统计
  const usageByModel = await prisma.courseRndAiCallLog.groupBy({
    by: ["modelName"],
    _sum: { inputTokens: true, outputTokens: true, estimatedCost: true },
    _count: true,
  });

  const usageByAction = await prisma.courseRndAiCallLog.groupBy({
    by: ["actionType"],
    _sum: { inputTokens: true, outputTokens: true, estimatedCost: true },
    _count: true,
  });

  const totalUsage = await prisma.courseRndAiCallLog.aggregate({
    _sum: { estimatedCost: true },
    _count: true,
  });

  return (
    <AiSettingsPage
      usageByModel={usageByModel.map(u => ({
        model: u.modelName,
        calls: u._count,
        tokens: (u._sum.inputTokens ?? 0) + (u._sum.outputTokens ?? 0),
        cost: u._sum.estimatedCost ?? 0,
      }))}
      usageByAction={usageByAction.map(u => ({
        action: u.actionType,
        calls: u._count,
        tokens: (u._sum.inputTokens ?? 0) + (u._sum.outputTokens ?? 0),
        cost: u._sum.estimatedCost ?? 0,
      }))}
      totalCost={totalUsage._sum.estimatedCost ?? 0}
      totalCalls={totalUsage._count}
    />
  );
}
