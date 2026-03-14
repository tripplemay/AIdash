import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import PackageGrid from "@/components/PackageGrid";
import PackageFilters from "@/components/PackageFilters";
import { Suspense } from "react";

export default async function ListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; ageRange?: string; level?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/");

  const { q = "", ageRange = "", level = "" } = await searchParams;
  const userRole = (session.user as { role?: string })?.role ?? "teacher";
  const userName = session.user?.name ?? "老师";

  const [packages, filterGroups] = await Promise.all([
    prisma.coursePackage.findMany({
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
    }),
    prisma.coursePackage.groupBy({
      by: ["ageRange", "level"],
      where: { status: "published" },
      orderBy: [{ ageRange: "asc" }, { level: "asc" }],
    }),
  ]);

  // Group into { ageRange, levels[] }
  const filterTreeMap = new Map<string, string[]>();
  for (const row of filterGroups) {
    if (!filterTreeMap.has(row.ageRange)) filterTreeMap.set(row.ageRange, []);
    filterTreeMap.get(row.ageRange)!.push(row.level);
  }
  const filterTree = Array.from(filterTreeMap.entries()).map(([ar, levels]) => ({
    ageRange: ar,
    levels,
  }));

  return (
    <div style={{ padding: 20 }}>
      <div style={{
        borderRadius: 28,
        background: "linear-gradient(135deg, rgba(244,247,255,0.96), rgba(238,242,255,0.96))",
        overflow: "hidden",
        position: "relative",
      }}>
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: `
            radial-gradient(circle at 78% 12%, rgba(161,196,255,0.15), transparent 18%),
            radial-gradient(circle at 12% 84%, rgba(186,201,255,0.16), transparent 26%),
            linear-gradient(135deg, rgba(132,180,255,0.05), rgba(174,139,255,0.06))
          `,
        }} />

        <div style={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "var(--sidebar-w) 1fr", minHeight: 820 }}>
          <Sidebar
            variant="list"
            userName={userName}
            userRole={userRole}
            filterTree={filterTree}
            activeAgeRange={ageRange}
            activeLevel={level}
          />

          <main style={{ display: "flex", flexDirection: "column" }}>
            <TopBar userName={userName} userRole={userRole} />

            <div style={{ padding: "22px 24px 10px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 48, lineHeight: 1.05, fontWeight: 800, letterSpacing: -1, marginBottom: 6 }}>课程包列表</div>
                <div style={{ fontSize: 14, color: "var(--muted)" }}>查看不同年龄段与级别下的课程包，并进入对应课程包详情。</div>
              </div>
              <Suspense>
                <PackageFilters q={q} ageRange={ageRange} />
              </Suspense>
            </div>

            <div style={{ flex: 1, padding: "8px 24px 16px" }}>
              <div style={{
                background: "rgba(255,255,255,0.52)",
                border: "1px solid var(--line)",
                borderRadius: 22, padding: 18,
              }}>
                <PackageGrid packages={packages} />
              </div>
            </div>

            <div style={{
              height: 68, borderTop: "1px solid var(--line)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#91a0c6",
            }}>
              <div style={{
                width: 46, height: 38, borderRadius: 11,
                border: "1px solid var(--line)",
                background: "#eef3ff", fontWeight: 800, fontSize: 14,
                color: "var(--brand)", display: "grid", placeItems: "center", cursor: "pointer",
              }}>1</div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
