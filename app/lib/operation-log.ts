import { prisma } from "@/lib/prisma";

export async function logOperation(params: {
  userId: string;
  module: "package" | "user";
  action: string;
  targetId?: string;
  targetName?: string;
  detail?: string;
}) {
  try {
    await prisma.operationLog.create({ data: params });
  } catch {
    // 日志写入失败不应阻塞主流程
    console.error("操作日志写入失败:", params);
  }
}
