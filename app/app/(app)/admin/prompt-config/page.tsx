import { auth } from "@/auth";
import PromptConfigPage from "@/components/admin/PromptConfigPage";

export default async function Page() {
  const session = await auth();
  const canEdit = (session?.user as { role?: string })?.role === "admin";
  return <PromptConfigPage canEdit={canEdit} />;
}
