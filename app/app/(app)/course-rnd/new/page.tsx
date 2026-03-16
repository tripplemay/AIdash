import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import CourseRndDirectionPage from "@/components/course-rnd/CourseRndDirectionPage";

export const dynamic = "force-dynamic";

export default async function CourseRndNewPage() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role ?? "teacher";
  if (!hasPermission(role, PERMISSIONS.COURSE_RND)) redirect("/");

  return <CourseRndDirectionPage />;
}
