import Link from "next/link";

export default function AdminPage() {
  return (
    <div style={{ padding: 20, minHeight: "100vh" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* 头部 */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: "linear-gradient(135deg, #7e95ff, #9ad8ff)", flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>管理员后台</div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>维护课程包与课次元信息，绑定单课入口文件与资源目录</div>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <Link href="/list" style={{
              fontSize: 13, padding: "8px 14px",
              border: "1px solid var(--line)", borderRadius: 999,
              background: "rgba(255,255,255,0.78)",
              color: "var(--text)", textDecoration: "none",
              fontWeight: 600,
            }}>
              返回系统
            </Link>
          </div>
        </div>

        {/* 课程包元信息 */}
        <Section title="课程包元信息">
          <FormGrid>
            <Field label="课程包名称" value="我的神奇搭档课程包" />
            <Field label="课程包标识（slug）" value="my-magical-partner" />
            <Field label="适用年龄段" value="8-12" />
            <Field label="级别" value="L1" />
            <Field label="课程包简介" value="面向 8-12 岁学生的 AI 课程包，帮助学生通过 AI 互动创作「我的神奇搭档介绍页」。" fullWidth />
            <Field label="封面图路径" value="cover.png" />
            <Field label="发布状态" value="published" />
          </FormGrid>
        </Section>

        {/* 课次元信息 */}
        <Section title="课次元信息 — 第 1 课">
          <FormGrid>
            <Field label="课次序号" value="1" />
            <Field label="课次名称" value="我的神奇搭档" />
            <Field label="时长（分钟）" value="45" />
            <Field label="授课模式" value="offline_small_group" />
            <Field label="本课成果描述" value="《我的神奇搭档介绍页》" fullWidth />
          </FormGrid>
        </Section>

        {/* 单课资源绑定 */}
        <Section title="单课资源绑定">
          <FormGrid>
            <Field label="入口文件" value="index.html" />
            <Field label="元信息文件" value="lesson.json" />
            <Field label="资源目录" value="assets/" />
            <Field label="附件目录" value="attachments/" />
          </FormGrid>

          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>附件中心绑定</div>
            {[
              { type: "教师投屏页", path: "attachments/teacher-screen/index.html", bound: true },
              { type: "学生 AI 输入模板单", path: "attachments/student-ai-template/template.pdf", bound: false },
              { type: "学生成果模板", path: "attachments/student-output-template/template.pdf", bound: false },
              { type: "教师示范案例页", path: "attachments/teacher-demo/index.html", bound: false },
            ].map(({ type, path, bound }) => (
              <div key={type} style={{
                display: "grid", gridTemplateColumns: "120px 1fr auto",
                gap: 10, alignItems: "center",
                padding: "10px 0", borderBottom: "1px solid var(--line)",
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--brand)" }}>{type}</div>
                <div style={{ fontSize: 13, fontFamily: "monospace", color: "var(--muted)" }}>{path}</div>
                <span style={{
                  display: "inline-flex", alignItems: "center",
                  padding: "3px 7px", borderRadius: 999,
                  background: bound ? "#eefaf2" : "#eef3ff",
                  color: bound ? "#228654" : "#6278b2",
                  border: `1px solid ${bound ? "#d7f0e0" : "#dfe7ff"}`,
                  fontSize: 11, fontWeight: 600,
                }}>{bound ? "已绑定" : "待绑定"}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* 操作按钮 */}
        <div style={{ display: "flex", gap: 10, paddingBottom: 8 }}>
          <button style={{ height: 44, minWidth: 100, border: "none", borderRadius: 999, cursor: "pointer", color: "#fff", background: "linear-gradient(90deg, #6f86ff, #61d1ff)", fontWeight: 700 }}>保存</button>
          <button style={{ height: 44, minWidth: 120, border: "1px solid var(--line)", borderRadius: 999, cursor: "pointer", color: "var(--text)", background: "rgba(255,255,255,0.78)", fontWeight: 600 }}>保存并发布</button>
          <button style={{ height: 44, minWidth: 80, border: "1px solid #f4d0d0", borderRadius: 999, cursor: "pointer", color: "#c44", background: "rgba(255,255,255,0.78)", fontWeight: 600 }}>下线</button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.86)",
      border: "1px solid var(--line)",
      borderRadius: 22, padding: "22px 24px",
      marginBottom: 16,
    }}>
      <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid var(--line)" }}>{title}</div>
      {children}
    </div>
  );
}

function FormGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      {children}
    </div>
  );
}

function Field({ label, value, fullWidth }: { label: string; value: string; fullWidth?: boolean }) {
  return (
    <div style={{ gridColumn: fullWidth ? "1 / -1" : undefined }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text)" }}>{label}</div>
      <input
        defaultValue={value}
        style={{
          width: "100%", height: 48,
          borderRadius: 14,
          border: "1px solid #dde5fb",
          background: "rgba(255,255,255,0.72)",
          padding: "0 14px", fontSize: 15,
          color: "var(--text)", outline: "none",
        }}
      />
    </div>
  );
}
