import { prisma } from "@/lib/prisma";
import { SetTopBar } from "@/components/TopBarContext";
import { loadAgeRangeLabels } from "@/lib/age-range-labels";
import SlideshowPackageGrid from "@/components/SlideshowPackageGrid";

export default async function SlideshowPage() {
  const packages = await prisma.coursePackage.findMany({
    where: { status: "published" },
    include: {
      lessons: {
        orderBy: { lessonNo: "asc" },
        select: { lessonNo: true, title: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const ageRangeLabels = await loadAgeRangeLabels();

  return (
    <>
      <SetTopBar title="课件生成" />
      <div className="card--glass" style={{ padding: "var(--sp-5)" }}>
        <SlideshowPackageGrid packages={packages} ageRangeLabels={ageRangeLabels} />
      </div>
    </>
  );
}
