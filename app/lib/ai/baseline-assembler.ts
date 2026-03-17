import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

export interface BaselineSet {
  general: string;
  age: string;
  level: string;
  orgForm: string;
  deliverable: string;
  matrix: string;
}

export interface AssembleBaselineParams {
  ageRange?: string | null;
  level?: string | null;
  orgForm?: string | null;
  deliverableType?: string | null;
}

// ── Simple TTL cache (60s) ──

interface CacheEntry {
  data: BaselineSet;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const TTL_MS = 60_000;

function cacheKey(params: AssembleBaselineParams): string {
  return [
    params.ageRange ?? "",
    params.level ?? "",
    params.orgForm ?? "",
    params.deliverableType ?? "",
  ].join("|");
}

// ── Filesystem fallback for general baseline ──

function readGeneralBaselineFallback(): string {
  try {
    const filePath = path.join(
      process.cwd(),
      "..",
      "docs",
      "product",
      "AI生成课程系统共用基线_课程设计原则与生成约束_v2.md",
    );
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}

// ── Main function ──

export async function assembleBaselines(
  params: AssembleBaselineParams,
): Promise<BaselineSet> {
  const key = cacheKey(params);
  const cached = cache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  // Build query conditions for all dimensions in a single round-trip
  const conditions: { type: string; key: string }[] = [
    { type: "general", key: "general" },
    { type: "matrix", key: "matrix" },
  ];
  if (params.ageRange) conditions.push({ type: "age", key: params.ageRange });
  if (params.level) conditions.push({ type: "level", key: params.level });
  if (params.orgForm)
    conditions.push({ type: "org_form", key: params.orgForm });
  if (params.deliverableType)
    conditions.push({ type: "deliverable", key: params.deliverableType });

  const rows = await prisma.baselineDoc.findMany({
    where: { OR: conditions },
    select: { type: true, key: true, content: true },
  });

  const lookup = new Map(rows.map((r) => [`${r.type}:${r.key}`, r.content]));

  let general = lookup.get("general:general") ?? "";
  if (!general) {
    general = readGeneralBaselineFallback();
  }

  const result: BaselineSet = {
    general,
    age: params.ageRange ? (lookup.get(`age:${params.ageRange}`) ?? "") : "",
    level: params.level ? (lookup.get(`level:${params.level}`) ?? "") : "",
    orgForm: params.orgForm
      ? (lookup.get(`org_form:${params.orgForm}`) ?? "")
      : "",
    deliverable: params.deliverableType
      ? (lookup.get(`deliverable:${params.deliverableType}`) ?? "")
      : "",
    matrix: lookup.get("matrix:matrix") ?? "",
  };

  cache.set(key, { data: result, expiresAt: Date.now() + TTL_MS });
  return result;
}
