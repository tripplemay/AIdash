import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import EnterLessonButton from "@/components/EnterLessonButton";
import Image from "next/image";
import Link from "next/link";

export default async function DetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session) redirect("/");

  const { slug } = await params;

  const pkg = await prisma.coursePackage.findUnique({
    where: { slug },
    include: {
      lessons: {
        orderBy: { lessonNo: "asc" },
        include: { attachments: true },
      },
    },
  });

  if (!pkg) notFound();

  return (
    <div style={{ padding: 20 }}>
      <div style={{
        borderRadius: 28,
        background: "linear-gradient(135deg, rgba(244,247,255,0.96), rgba(238,242,255,0.96))",
        overflow: "hidden",
        position: "relative",
      }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(circle at 78% 12%, rgba(161,196,255,0.15), transparent 18%), radial-gradient(circle at 12% 84%, rgba(186,201,255,0.16), transparent 26%)" }} />

        <div style={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "var(--sidebar-w) 1fr", minHeight: 820 }}>
          <Sidebar variant="detail" />

          <main style={{ padding: "20px 24px 28px" }}>
            {/* 面包屑 */}
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
              <Link href="/list" style={{ color: "var(--brand)", textDecoration: "none" }}>返回课程包列表</Link>
              <span> / {pkg.ageRange} 岁 / {pkg.level}</span>
            </div>

            {/* 课程包信息卡 */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "320px 1fr",
              gap: 20, padding: 20,
              background: "linear-gradient(180deg, rgba(238,243,255,0.95), rgba(255,255,255,0.92))",
              border: "1px solid var(--line)",
              borderRadius: 22, marginBottom: 16,
            }}>
              {/* 主图：严格使用已确认最终版 */}
              <div style={{ borderRadius: 18, overflow: "hidden", border: "1px solid #dde6ff", background: "#eef3ff", minHeight: 240, position: "relative" }}>
                {pkg.coverImage && (
                  <Image src={pkg.coverImage} alt={`${pkg.title}主图`} fill style={{ objectFit: "cover" }} />
                )}
              </div>

              {/* 文字信息 */}
              <div>
                <span style={{
                  display: "inline-flex", alignItems: "center",
                  padding: "6px 10px", borderRadius: 999,
                  background: "#eef3ff", color: "#6278b2",
                  border: "1px solid #dfe7ff", fontSize: 12, fontWeight: 600,
                }}>样板课</span>

                <div style={{ fontSize: 28, fontWeight: 800, margin: "10px 0 8px" }}>{pkg.title}</div>
                {pkg.summary && (
                  <div style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.8, marginBottom: 16 }}>{pkg.summary}</div>
                )}

                {/* 元信息格 */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                  {[
                    { label: "适用年龄段", value: `${pkg.ageRange} 岁` },
                    { label: "级别", value: pkg.level },
                    { label: "状态", value: pkg.status === "published" ? "已发布" : "草稿", green: pkg.status === "published" },
                    { label: "接入方式", value: "标准单课成品包", small: true },
                  ].map(({ label, value, green, small }) => (
                    <div key={label} style={{
                      background: "rgba(255,255,255,0.86)",
                      border: "1px solid var(--line)",
                      borderRadius: 16, padding: 14,
                    }}>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: small ? 13 : 17, fontWeight: 800, color: green ? "#228654" : "var(--text)" }}>
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 课次列表 */}
            <div style={{ background: "rgba(255,255,255,0.82)", border: "1px solid var(--line)", borderRadius: 22, padding: 18 }}>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>课次列表</div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>点击「进入本课」直接打开已确认原型内容</div>
              </div>

              {pkg.lessons.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)", fontSize: 14 }}>暂无课次</div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {pkg.lessons.map((lesson) => (
                    <div key={lesson.id} style={{
                      display: "grid",
                      gridTemplateColumns: "90px 1fr auto",
                      gap: 16, alignItems: "center",
                      padding: 16, borderRadius: 16,
                      background: "#fbfcff",
                      border: "1px solid var(--line)",
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#6177aa" }}>第 {lesson.lessonNo} 课</div>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>{lesson.title}</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                          {[
                            `${lesson.durationMinutes} 分钟`,
                            lesson.deliveryMode === "offline_small_group" ? "线下小班" : lesson.deliveryMode,
                          ].map(tag => (
                            <span key={tag} style={{
                              display: "inline-flex", padding: "6px 10px", borderRadius: 999,
                              background: "#eef3ff", color: "#6278b2", border: "1px solid #dfe7ff",
                              fontSize: 12, fontWeight: 600,
                            }}>{tag}</span>
                          ))}
                          {lesson.status === "published" && (
                            <span style={{
                              display: "inline-flex", padding: "6px 10px", borderRadius: 999,
                              background: "#eefaf2", color: "#228654", border: "1px solid #d7f0e0",
                              fontSize: 12, fontWeight: 600,
                            }}>已按规范接入</span>
                          )}
                        </div>
                        {lesson.outputSummary && (
                          <div style={{ fontSize: 13, color: "var(--muted)" }}>本课成果：{lesson.outputSummary}</div>
                        )}
                      </div>

                      {/* 进入本课：符合接入规范 v1，window.open 新标签 */}
                      {lesson.contentPath ? (
                        <EnterLessonButton entryPath={lesson.contentPath} />
                      ) : (
                        <span style={{ fontSize: 13, color: "var(--muted)" }}>未接入</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
