import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import PackageGrid from "@/components/PackageGrid";

export default async function ListPage() {
  const session = await auth();
  if (!session) redirect("/");

  const packages = await prisma.coursePackage.findMany({
    where: { status: "published" },
    include: {
      lessons: { orderBy: { lessonNo: "asc" } },
    },
    orderBy: { createdAt: "asc" },
  });

  const userName = session.user?.name ?? "老师";

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
          <Sidebar variant="list" userName={userName} />

          <main style={{ display: "flex", flexDirection: "column" }}>
            <TopBar userName={userName} />

            {/* 页面头部 */}
            <div style={{ padding: "22px 24px 10px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 48, lineHeight: 1.05, fontWeight: 800, letterSpacing: -1, marginBottom: 6 }}>课程包列表</div>
                <div style={{ fontSize: 14, color: "var(--muted)" }}>查看不同年龄段与级别下的课程包，并进入对应课程包详情。</div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input
                  placeholder="搜索课程包"
                  style={{
                    height: 48, borderRadius: 14,
                    border: "1px solid var(--line)",
                    background: "rgba(240,244,255,0.76)",
                    padding: "0 16px", fontSize: 14,
                    color: "var(--text)", outline: "none",
                    width: 220,
                  }}
                />
                <div style={{
                  height: 44, minWidth: 130, padding: "0 14px",
                  borderRadius: 12,
                  border: "1px solid var(--line)",
                  background: "rgba(255,255,255,0.82)",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  fontSize: 13, cursor: "pointer", gap: 8,
                }}>
                  <span>学科类型</span><span style={{ color: "var(--muted)" }}>▾</span>
                </div>
              </div>
            </div>

            {/* 卡片区 */}
            <div style={{ flex: 1, padding: "8px 24px 16px" }}>
              <div style={{
                background: "rgba(255,255,255,0.52)",
                border: "1px solid var(--line)",
                borderRadius: 22, padding: 18,
              }}>
                <PackageGrid packages={packages} />
              </div>
            </div>

            {/* 分页 */}
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
