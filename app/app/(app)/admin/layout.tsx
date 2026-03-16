import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { hasRole } from "@/lib/permissions";
import { ADMIN_PANEL_ROLES } from "@/lib/permissions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role ?? "teacher";
  if (!hasRole(role, ADMIN_PANEL_ROLES)) redirect("/");
  return <>{children}</>;
}
