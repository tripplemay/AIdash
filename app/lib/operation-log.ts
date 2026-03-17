import { prisma } from "@/lib/prisma";

export async function logOperation(params: {
  userId?: string | null;
  module: "package" | "user" | "course_rnd";
  action: string;
  targetId?: string;
  targetName?: string;
  detail?: string;
}) {
  if (!params.userId) {
    console.warn("操作日志缺少 userId，跳过记录:", params);
    return;
  }
  try {
    await prisma.operationLog.create({
      data: {
        userId: params.userId,
        module: params.module,
        action: params.action,
        targetId: params.targetId,
        targetName: params.targetName,
        detail: params.detail,
      },
    });
  } catch {
    // 日志写入失败不应阻塞主流程
    console.error("操作日志写入失败:", params);
  }
}
