import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/");

  const userName = session.user?.name ?? "老师";
  const userRole = (session.user as { role?: string })?.role ?? "teacher";

  return (
    <AppShell userName={userName} userRole={userRole}>
      {children}
    </AppShell>
  );
}
