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

  // 检查本次定稿后是否已发布
  let publishRecord: { id: string; packageSlug: string; packageTitle: string; createdAt: Date } | null = null;
  const lastFinalizeLog = await prisma.operationLog.findFirst({
    where: { targetId: projectId, module: "course_rnd", action: "finalize" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (lastFinalizeLog) {
    // 有定稿日志：只查找定稿之后的发布记录
    const publishAfterFinalize = await prisma.courseRndPublishRecord.findFirst({
      where: { projectId, createdAt: { gt: lastFinalizeLog.createdAt } },
      orderBy: { createdAt: "desc" },
      select: { id: true, packageSlug: true, packageTitle: true, createdAt: true },
    });
    if (publishAfterFinalize) {
      publishRecord = publishAfterFinalize;
    }
  } else {
    // 无定稿日志（老项目）：直接查最新发布记录
    const latestPublish = await prisma.courseRndPublishRecord.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: { id: true, packageSlug: true, packageTitle: true, createdAt: true },
    });
    if (latestPublish) {
      publishRecord = latestPublish;
    }
  }

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
