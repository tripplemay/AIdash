export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import AdminUserList from "@/components/admin/AdminUserList";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return <AdminUserList users={users} />;
}
