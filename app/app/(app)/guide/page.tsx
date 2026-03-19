import { auth } from "@/auth";
import { redirect } from "next/navigation";
import GuidePage from "@/components/guide/GuidePage";

export default async function GuideRoute() {
  const session = await auth();
  if (!session) redirect("/");

  const userRole = (session.user as { role?: string })?.role ?? "teacher";

  return <GuidePage userRole={userRole} />;
}
