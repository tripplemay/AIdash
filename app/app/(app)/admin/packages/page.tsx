export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import AdminPackageList from "@/components/admin/AdminPackageList";
import { loadAgeRangeLabels } from "@/lib/age-range-labels";

export default async function AdminPackagesPage() {
  const packages = await prisma.coursePackage.findMany({
    include: { _count: { select: { lessons: true } } },
    orderBy: { createdAt: "desc" },
  });

  const ageRangeLabels = await loadAgeRangeLabels();

  return <AdminPackageList packages={packages} ageRangeLabels={ageRangeLabels} />;
}
