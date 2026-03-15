import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const groups = await prisma.coursePackage.groupBy({
    by: ["ageRange", "level"],
    where: { status: "published" },
    orderBy: [{ ageRange: "asc" }, { level: "asc" }],
  });

  const map = new Map<string, string[]>();
  for (const row of groups) {
    if (!map.has(row.ageRange)) map.set(row.ageRange, []);
    map.get(row.ageRange)!.push(row.level);
  }

  const filterTree = Array.from(map.entries()).map(([ageRange, levels]) => ({
    ageRange,
    levels,
  }));

  return NextResponse.json(filterTree);
}
