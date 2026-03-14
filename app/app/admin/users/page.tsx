export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import AdminUserList from "@/components/admin/AdminUserList";

export default async function AdminUsersPage() {
  const session = await auth();
  const user = session?.user as { role?: string } | undefined;
  if (!session || user?.role !== "admin") redirect("/");

  const users = await prisma.user.findMany({
    select: { id: true, username: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div style={{ padding: 20 }}>
      <div style={{
        borderRadius: 28,
        background: "linear-gradient(135deg, rgba(244,247,255,0.96), rgba(238,242,255,0.96))",
        overflow: "hidden",
        position: "relative",
      }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(circle at 78% 12%, rgba(161,196,255,0.15), transparent 18%), radial-gradient(circle at 12% 84%, rgba(186,201,255,0.16), transparent 26%)" }} />
        <div style={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "var(--sidebar-w) 1fr", minHeight: 820 }}>
          <Sidebar variant="admin" adminSection="users" />
          <main style={{ padding: "28px 28px 32px" }}>
            <AdminUserList users={users} />
          </main>
        </div>
      </div>
    </div>
  );
}
