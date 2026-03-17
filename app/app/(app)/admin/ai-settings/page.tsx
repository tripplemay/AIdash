import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import AiSettingsPage from "@/components/admin/AiSettingsPage";

export const dynamic = "force-dynamic";

export default async function AdminAiSettingsPage() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role ?? "teacher";
  if (!hasPermission(role, PERMISSIONS.VIEW_AI_SETTINGS)) redirect("/");

  const canEdit = hasPermission(role, PERMISSIONS.AI_SETTINGS);
  return <AiSettingsPage canEdit={canEdit} />;
}
