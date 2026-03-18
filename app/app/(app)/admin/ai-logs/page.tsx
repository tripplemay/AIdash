import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { ROLES } from "@/lib/roles";
import AiCallLogList from "@/components/admin/AiCallLogList";

export const dynamic = "force-dynamic";

export default async function AiLogsPage() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role ?? "teacher";
  const userId = (session?.user as { id?: string })?.id;

  if (!hasPermission(role, PERMISSIONS.VIEW_AI_LOGS)) redirect("/");

  // 获取项目列表（用于筛选下拉）
  const projectFilter = role === ROLES.ADMIN ? {} : { createdById: userId ?? "" };
  const projects = await prisma.courseRndProject.findMany({
    where: projectFilter,
    select: { id: true, title: true },
    orderBy: { updatedAt: "desc" },
  });

  // 获取动作类型列表
  const actionTypes = await prisma.courseRndAiCallLog.groupBy({
    by: ["actionType"],
    orderBy: { actionType: "asc" },
  });

  return (
    <AiCallLogList
      projects={projects}
      actionTypes={actionTypes.map(a => a.actionType)}
      isAdmin={role === ROLES.ADMIN}
    />
  );
}
