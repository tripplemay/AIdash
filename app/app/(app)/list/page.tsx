import { prisma } from "@/lib/prisma";
import PackageGrid from "@/components/PackageGrid";
import { SetTopBar } from "@/components/TopBarContext";

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
      <SetTopBar title="课程包列表" />
      <div className="card--glass" style={{ padding: "var(--sp-5)" }}>
        <PackageGrid packages={packages} />
      </div>
    </>
  );
}
