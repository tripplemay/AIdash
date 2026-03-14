"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Package, Users, Settings, ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import SidebarNavItem from "./SidebarNavItem";
import DetailSidebarNav from "./DetailSidebarNav";
import SidebarFilterTree, { type FilterGroup } from "./SidebarFilterTree";

interface SidebarProps {
  variant?: "list" | "detail" | "admin" | "lesson";
  userName?: string;
  backHref?: string;
  adminSection?: "packages" | "users";
  userRole?: string;
  filterTree?: FilterGroup[];
  activeAgeRange?: string;
  activeLevel?: string;
}

export default function Sidebar({
  variant = "list",
  userName = "张老师",
  backHref,
  adminSection,
  userRole,
  filterTree,
  activeAgeRange = "",
  activeLevel = "",
}: SidebarProps) {
  const pathname = usePathname();
  const isAdmin = userRole === "admin";

  return (
    <aside style={{
      width: "var(--sidebar-w)",
      borderRight: "1px solid var(--line)",
      background: "linear-gradient(180deg, rgba(240,244,255,0.78), rgba(234,239,255,0.78))",
      display: "grid",
      gridTemplateRows: "auto auto auto 1fr auto auto",
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
      {variant === "list" ? (
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
      ) : (
        <div />
      )}

      {/* 导航菜单 */}
      {variant === "list" && (
        <nav style={{ padding: "10px 8px 8px", display: "grid", gap: 4 }}>
          <SidebarNavItem
            icon={BookOpen}
            label="课程包列表"
            href="/list"
            active={pathname === "/list"}
          />
        </nav>
      )}

      {variant === "admin" && (
        <nav style={{ padding: "18px 8px 8px", display: "grid", gap: 4 }}>
          <SidebarNavItem
            icon={Package}
            label="课程包管理"
            href="/admin/packages"
            active={adminSection === "packages"}
          />
          <SidebarNavItem
            icon={Users}
            label="用户管理"
            href="/admin/users"
            active={adminSection === "users"}
          />
        </nav>
      )}

      {variant === "detail" && <DetailSidebarNav />}

      {variant === "lesson" && (
        <nav style={{ padding: "18px 8px 8px", display: "grid", gap: 4 }}>
          {backHref && (
            <SidebarNavItem
              icon={ChevronLeft}
              label="返回课程包"
              href={backHref}
              active
            />
          )}
          <SidebarNavItem
            icon={BookOpen}
            label="课程包列表"
            href="/list"
            active={pathname === "/list"}
          />
        </nav>
      )}

      {/* 课程包树（仅列表页，有数据时显示） */}
      {variant === "list" && filterTree && filterTree.length > 0 ? (
        <Suspense fallback={null}>
          <SidebarFilterTree
            filterTree={filterTree}
            activeAgeRange={activeAgeRange}
            activeLevel={activeLevel}
          />
        </Suspense>
      ) : (
        <div />
      )}

      {/* 管理后台入口（管理员在非 admin 页面显示） */}
      {isAdmin && variant !== "admin" && (
        <div style={{ padding: "0 8px 8px" }}>
          <SidebarNavItem
            icon={Settings}
            label="管理后台"
            href="/admin/packages"
          />
        </div>
      )}

      {/* 版权 */}
      <div style={{ padding: "8px 14px 14px", color: "#97a5ca", fontSize: 11 }}>
        {variant === "admin"
          ? "管理员后台"
          : variant === "detail" || variant === "lesson"
          ? "教师授课系统"
          : "© 2024 AI Dash"}
      </div>
    </aside>
  );
}
