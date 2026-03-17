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

  // 获取框架摘要（用于发布面板自动预填）
  let directionSummary: string | null = null;
  if (project.currentDirectionVersionId) {
    const dirVersion = await prisma.courseRndDirectionVersion.findUnique({
      where: { id: project.currentDirectionVersionId },
      select: { summary: true },
    });
    directionSummary = dirVersion?.summary ?? null;
  }

  // 获取最新发布记录
  const publishRecord = await prisma.courseRndPublishRecord.findFirst({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    select: { id: true, packageSlug: true, packageTitle: true, createdAt: true },
  });

  return (
    <CourseRndWorkbenchPage
      project={project}
      currentPlan={currentPlan ?? null}
      lessonDrafts={currentPlan?.lessonDrafts ?? []}
      aiCosts={aiCosts}
      directionSummary={directionSummary}
      publishRecord={publishRecord ? {
        id: publishRecord.id,
        packageSlug: publishRecord.packageSlug,
        packageTitle: publishRecord.packageTitle,
        createdAt: publishRecord.createdAt.toISOString(),
      } : null}
    />
  );
}
