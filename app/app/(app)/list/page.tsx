import { prisma } from "@/lib/prisma";
import PackageGrid from "@/components/PackageGrid";

export default async function ListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; ageRange?: string; level?: string }>;
}) {
  const { q = "", ageRange = "", level = "" } = await searchParams;

  const packages = await prisma.coursePackage.findMany({
    where: {
      status: "published",
      ...(q && { title: { contains: q } }),
      ...(ageRange && { ageRange }),
      ...(level && { level }),
    },
    include: {
      lessons: {
        orderBy: { lessonNo: "asc" },
        select: {
          lessonNo: true, title: true, outputSummary: true,
          durationMinutes: true, deliveryMode: true,
          groupSize: true, aiRoundsCount: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <>
      <div style={{ marginBottom: "var(--sp-4)" }}>
        <h2 style={{ fontSize: 36, lineHeight: 1.08, fontWeight: 800, letterSpacing: -0.5, marginBottom: "var(--sp-1)" }}>课程包列表</h2>
        <p className="muted" style={{ fontSize: 14 }}>查看不同年龄段与级别下的课程包，并进入对应课程包详情。</p>
      </div>
      <div className="card--glass" style={{ padding: "var(--sp-5)" }}>
        <PackageGrid packages={packages} />
      </div>
    </>
  );
}
