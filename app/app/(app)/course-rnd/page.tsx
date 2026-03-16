import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import CourseRndDashboard from "@/components/course-rnd/CourseRndDashboard";

export const dynamic = "force-dynamic";

export default async function CourseRndPage() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role ?? "teacher";
  if (!hasPermission(role, PERMISSIONS.COURSE_RND)) redirect("/");

  const userId = (session?.user as { id?: string })?.id;

  // 获取所有项目
  const projects = userId
    ? await prisma.courseRndProject.findMany({
        where: { createdById: userId },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          status: true,
          ageRange: true,
          level: true,
          lessonCount: true,
          updatedAt: true,
          planVersions: {
            where: { isSelected: true },
            take: 1,
            select: {
              lessonDrafts: {
                select: { lessonNo: true, contentData: true },
              },
            },
          },
        },
      })
    : [];

  // 获取 AI 费用：总汇总 + 按项目汇总
  const totalCost = userId
    ? await prisma.courseRndAiCallLog.aggregate({
        where: { userId },
        _sum: { estimatedCost: true },
        _count: true,
      })
    : { _sum: { estimatedCost: null }, _count: 0 };

  const projectCosts = userId
    ? await prisma.courseRndAiCallLog.groupBy({
        by: ["projectId"],
        where: { userId },
        _sum: { estimatedCost: true },
      })
    : [];

  const costMap: Record<string, number> = {};
  for (const pc of projectCosts) {
    costMap[pc.projectId] = pc._sum.estimatedCost ?? 0;
  }

  return (
    <CourseRndDashboard
      projects={projects}
      projectCosts={costMap}
      totalCost={totalCost._sum.estimatedCost ?? 0}
      totalCalls={totalCost._count}
    />
  );
}
