export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import AdminPackageList from "@/components/admin/AdminPackageList";
import { loadAgeRangeLabels } from "@/lib/age-range-labels";

async function loadLevelLabels(): Promise<Record<string, string>> {
  try {
    const docs = await prisma.baselineDoc.findMany({
      where: { type: "level" },
      select: { key: true, label: true },
    });
    if (docs.length === 0) return {};
    const map: Record<string, string> = {};
    for (const doc of docs) {
      map[doc.key] = doc.key;
    }
    return map;
  } catch {
    return {};
  }
}

export default async function AdminPackagesPage() {
  const packages = await prisma.coursePackage.findMany({
    include: { _count: { select: { lessons: true } } },
    orderBy: { createdAt: "desc" },
  });

  const ageRangeLabels = await loadAgeRangeLabels();
  const levelLabels = await loadLevelLabels();

  return <AdminPackageList packages={packages} ageRangeLabels={ageRangeLabels} levelLabels={levelLabels} />;
}
