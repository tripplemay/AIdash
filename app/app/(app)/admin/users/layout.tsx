import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ROLES } from "@/lib/roles";

export default async function UsersLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (role !== ROLES.ADMIN) redirect("/");
  return <>{children}</>;
}
