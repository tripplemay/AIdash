import { prisma } from "@/lib/prisma";

/** 硬编码兜底映射（DB 无数据时使用） */
const FALLBACK_LABELS: Record<string, string> = {
  A1: "A1｜6-7岁",
  A2: "A2｜8-9岁",
  A3: "A3｜10-12岁",
  A4: "A4｜13-15岁",
};

/** 从 BaselineDoc 表查询年龄段标签映射 */
export async function loadAgeRangeLabels(): Promise<Record<string, string>> {
  try {
    const docs = await prisma.baselineDoc.findMany({
      where: { type: "age" },
      select: { key: true, label: true },
    });
    if (docs.length === 0) return FALLBACK_LABELS;
    const map: Record<string, string> = {};
    for (const doc of docs) {
      // label 格式如 "A2｜8-9岁 基础段"，取 "A2｜8-9岁" 部分
      const short = doc.label.replace(/\s+\S+段$/, "");
      map[doc.key] = short;
    }
    return { ...FALLBACK_LABELS, ...map };
  } catch {
    return FALLBACK_LABELS;
  }
}

/** 客户端用：根据传入的标签映射格式化年龄段 */
export function formatAgeRange(ageRange: string, labels?: Record<string, string>): string {
  const map = labels ?? FALLBACK_LABELS;
  return map[ageRange] ?? `${ageRange}岁`;
}
