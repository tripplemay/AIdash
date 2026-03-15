export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import AdminPackageList from "@/components/admin/AdminPackageList";

export default async function AdminPackagesPage() {
  const packages = await prisma.coursePackage.findMany({
    include: { _count: { select: { lessons: true } } },
    orderBy: { createdAt: "desc" },
  });

  return <AdminPackageList packages={packages} />;
}
