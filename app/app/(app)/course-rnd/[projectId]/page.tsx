import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import CourseRndDirectionPage from "@/components/course-rnd/CourseRndDirectionPage";

export const dynamic = "force-dynamic";

export default async function CourseRndProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role ?? "teacher";
  if (!hasPermission(role, PERMISSIONS.COURSE_RND)) redirect("/");

  const { projectId } = await params;

  const project = await prisma.courseRndProject.findUnique({
    where: { id: projectId },
    include: {
      directionVersions: { orderBy: { versionNo: "desc" }, take: 5 },
    },
  });

  if (!project) notFound();

  // 如果已进入工作台阶段，重定向
  if (project.status === "workbench" || project.status === "finalized") {
    redirect(`/course-rnd/${projectId}/workbench`);
  }

  return <CourseRndDirectionPage projectData={project} />;
}
