import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ROLES } from "@/lib/roles";
import AiSettingsPage from "@/components/admin/AiSettingsPage";

export const dynamic = "force-dynamic";

export default async function AdminAiSettingsPage() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (role !== ROLES.ADMIN) redirect("/");

  return <AiSettingsPage />;
}
