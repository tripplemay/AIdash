import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import CourseRndWorkbenchPage from "@/components/course-rnd/CourseRndWorkbenchPage";

export const dynamic = "force-dynamic";

export default async function WorkbenchPage({
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
      planVersions: {
        where: { isSelected: true },
        take: 1,
        include: {
          lessonDrafts: { orderBy: { lessonNo: "asc" } },
        },
      },
    },
  });

  if (!project) notFound();

  // 如果还在方向确认阶段，重定向
  if (project.status === "direction") {
    redirect(`/course-rnd/${projectId}`);
  }

  const currentPlan = project.planVersions[0];

  // 获取 AI 费用统计
  const aiCosts = await prisma.courseRndAiCallLog.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <CourseRndWorkbenchPage
      project={project}
      currentPlan={currentPlan ?? null}
      lessonDrafts={currentPlan?.lessonDrafts ?? []}
      aiCosts={aiCosts}
    />
  );
}
