"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  variant?: "list" | "detail" | "admin" | "lesson";
  userName?: string;
  backHref?: string;
}

export default function Sidebar({ variant = "list", userName = "张老师", backHref }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside style={{
      width: "var(--sidebar-w)",
      borderRight: "1px solid var(--line)",
      background: "linear-gradient(180deg, rgba(240,244,255,0.78), rgba(234,239,255,0.78))",
      display: "grid",
      gridTemplateRows: "auto auto auto 1fr auto",
      minHeight: "100%",
    }}>
      {/* Logo */}
      <div style={{
        padding: "18px 14px 14px",
        borderBottom: "1px solid var(--line)",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
        <div style={{
          width: 36, height: 36,
          borderRadius: 12,
          background: "linear-gradient(135deg, #7e95ff, #9ad8ff)",
          boxShadow: "0 8px 18px rgba(126,149,255,0.22)",
          flexShrink: 0,
        }} />
        <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text)" }}>AI Dash</div>
      </div>

      {/* 用户卡（仅列表页显示） */}
      {variant === "list" && (
        <div style={{ padding: "12px 10px 0" }}>
          <div style={{
            padding: "10px 12px",
            borderRadius: 14,
            background: "rgba(255,255,255,0.52)",
            border: "1px solid #e6ecff",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}>
            <div style={{
              width: 36, height: 36,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #f5d0c2, #fff4ef)",
              border: "2px solid rgba(255,255,255,0.7)",
              flexShrink: 0,
            }} />
            <div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 2 }}>欢迎回来</div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{userName}</div>
            </div>
          </div>
        </div>
      )}

      {/* 导航菜单 */}
      {variant === "list" && (
        <nav style={{ padding: "10px 8px 8px", display: "grid", gap: 4 }}>
          {[
            { label: "课程包列表", href: "/list" },
          ].map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              style={{
                height: 40,
                borderRadius: 12,
                color: pathname === href ? "#fff" : "#6074a9",
                display: "flex",
                alignItems: "center",
                padding: "0 12px",
                fontSize: 14,
                fontWeight: pathname === href ? 800 : 600,
                textDecoration: "none",
                background: pathname === href
                  ? "linear-gradient(90deg, #8bb1ff, #7ea5ff)"
                  : "transparent",
                boxShadow: pathname === href
                  ? "0 8px 18px rgba(126,149,255,0.16)"
                  : "none",
              }}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}

      {/* 详情页导航 */}
      {variant === "detail" && (
        <nav style={{ padding: "18px 8px 8px", display: "grid", gap: 4 }}>
          {[
            { label: "课程包详情", href: "#" },
            { label: "课次列表", href: "#" },
          ].map(({ label, href }, i) => (
            <Link
              key={label}
              href={href}
              style={{
                height: 40,
                borderRadius: 12,
                color: i === 0 ? "#fff" : "#6074a9",
                display: "flex",
                alignItems: "center",
                padding: "0 12px",
                fontSize: 14,
                fontWeight: i === 0 ? 800 : 600,
                textDecoration: "none",
                background: i === 0
                  ? "linear-gradient(90deg, #8bb1ff, #7ea5ff)"
                  : "transparent",
              }}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}

      {/* 课程包树（仅列表页） */}
      {variant === "list" && (
        <div style={{ padding: "0 8px 8px" }}>
          <div style={{
            background: "rgba(255,255,255,0.42)",
            border: "1px solid #e6ecff",
            borderRadius: 14,
            padding: 12,
          }}>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 6 }}>课程包</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>按年龄段与级别浏览</div>
            <div style={{ padding: "7px 10px", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#5f79ef", background: "#eef3ff", marginBottom: 4 }}>8–12 岁</div>
            <div style={{ paddingLeft: 10, borderLeft: "1px solid #dfe7ff", marginLeft: 8, marginBottom: 4, display: "grid", gap: 3 }}>
              <div style={{ padding: "6px 10px", borderRadius: 9, fontSize: 12, fontWeight: 700, color: "#5f79ef", background: "#eef3ff" }}>L1</div>
              <div style={{ padding: "6px 10px", borderRadius: 9, fontSize: 12, color: "var(--muted)" }}>L2</div>
            </div>
            <div style={{ padding: "7px 10px", borderRadius: 10, fontSize: 13, color: "var(--muted)", background: "rgba(255,255,255,0.6)" }}>6–7 岁</div>
          </div>
        </div>
      )}

      {/* 单课页导航 */}
      {variant === "lesson" && (
        <nav style={{ padding: "18px 8px 8px", display: "grid", gap: 4 }}>
          {backHref && (
            <Link
              href={backHref}
              style={{
                height: 40,
                borderRadius: 12,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                padding: "0 12px",
                fontSize: 14,
                fontWeight: 800,
                textDecoration: "none",
                background: "linear-gradient(90deg, #8bb1ff, #7ea5ff)",
                boxShadow: "0 8px 18px rgba(126,149,255,0.16)",
              }}
            >
              ← 返回课程包
            </Link>
          )}
          <Link
            href="/list"
            style={{
              height: 40,
              borderRadius: 12,
              color: "#6074a9",
              display: "flex",
              alignItems: "center",
              padding: "0 12px",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            课程包列表
          </Link>
        </nav>
      )}

      {/* 版权 */}
      <div style={{ padding: "8px 14px 14px", color: "#97a5ca", fontSize: 11 }}>
        {variant === "detail" || variant === "lesson" ? "教师授课系统" : "© 2024 AI Dash"}
      </div>
    </aside>
  );
}
