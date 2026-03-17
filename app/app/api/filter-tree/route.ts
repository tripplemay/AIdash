import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const [groups, baselineDocs] = await Promise.all([
    prisma.coursePackage.groupBy({
      by: ["ageRange", "level"],
      where: { status: "published" },
      orderBy: [{ ageRange: "asc" }, { level: "asc" }],
    }),
    prisma.baselineDoc.findMany({
      where: { type: { in: ["age", "level"] } },
      select: { type: true, key: true, label: true },
    }),
  ]);

  // 构建标签映射：key → label（如 "A2" → "A2｜8-9岁 基础段"）
  const labelMap = new Map<string, string>();
  for (const doc of baselineDocs) {
    labelMap.set(doc.key, doc.label);
  }

  const map = new Map<string, string[]>();
  for (const row of groups) {
    if (!map.has(row.ageRange)) map.set(row.ageRange, []);
    map.get(row.ageRange)!.push(row.level);
  }

  const filterTree = Array.from(map.entries()).map(([ageRange, levels]) => ({
    ageRange,
    ageRangeLabel: labelMap.get(ageRange) ?? `${ageRange} 岁`,
    levels: levels.map(level => ({
      key: level,
      label: labelMap.get(level) ?? level,
    })),
  }));

  return NextResponse.json(filterTree);
}
