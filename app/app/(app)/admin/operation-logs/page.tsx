import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import OperationLogList from "@/components/admin/OperationLogList";

export const dynamic = "force-dynamic";

export default async function OperationLogsPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  const role = (session?.user as { role?: string })?.role ?? "";

  const where = hasPermission(role, PERMISSIONS.VIEW_ALL_LOGS)
    ? {}
    : { userId: userId ?? "" };

  const logs = await prisma.operationLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { name: true, role: true } } },
  });

  return <OperationLogList logs={logs} />;
}
