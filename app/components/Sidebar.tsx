"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BookOpen, Settings, Package, Users, FlaskConical, FileText, Cpu } from "lucide-react";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import SidebarNavItem from "./SidebarNavItem";
import type { FilterGroup } from "./SidebarFilterTree";
import SidebarFilterTree from "./SidebarFilterTree";

interface SidebarProps {
  userName: string;
  userRole: string;
}

interface LessonNavData {
  title: string;
  slug: string;
  lessons: { id: string; lessonNo: number; title: string }[];
}

export default function Sidebar({ userName, userRole }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const canAccessAdmin = hasPermission(userRole, PERMISSIONS.MANAGE_PACKAGES) || hasPermission(userRole, PERMISSIONS.MANAGE_USERS);
  const canAccessRnd = hasPermission(userRole, PERMISSIONS.COURSE_RND);
  const initial = userName.charAt(0).toUpperCase();

  // 路由检测
  const isListPage = pathname === "/list";
  const isListActive = isListPage || pathname.startsWith("/detail") || pathname.startsWith("/lesson");
  const isAdminActive = pathname.startsWith("/admin");
  const isDetailPage = pathname.startsWith("/detail/");
  const isLessonPage = pathname.startsWith("/lesson/");
  const isRndActive = pathname.startsWith("/course-rnd");

  // admin 子页面自动检测
  const adminSection = pathname.includes("/admin/packages") ? "packages"
    : pathname.includes("/admin/users") ? "users"
    : undefined;

  // 筛选状态
  const urlAgeRange = searchParams.get("ageRange") ?? "";
  const urlLevel = searchParams.get("level") ?? "";
  const [activeAgeRange, setActiveAgeRange] = useState(urlAgeRange);
  const [activeLevel, setActiveLevel] = useState(urlLevel);

  const hasActiveFilter = !!(activeAgeRange || activeLevel);
  const listParentActive = isListActive && !hasActiveFilter;
  const adminParentActive = isAdminActive && !adminSection;

  // 筛选树数据
  const [filterTree, setFilterTree] = useState<FilterGroup[]>([]);
  const [listExpanded, setListExpanded] = useState(false);
  const [adminExpanded, setAdminExpanded] = useState(false);

  // 课次导航数据
  const [lessonNav, setLessonNav] = useState<LessonNavData | null>(null);

  // 初始化：从缓存恢复 + 后台刷新
  useEffect(() => {
    // 恢复筛选状态
    if (!isListPage) {
      setActiveAgeRange(localStorage.getItem("sidebar_ageRange") ?? "");
      setActiveLevel(localStorage.getItem("sidebar_level") ?? "");
    }

    // 恢复筛选树
    try {
      const cached = localStorage.getItem("sidebar_filterTree");
      if (cached) {
        const data = JSON.parse(cached) as FilterGroup[];
        setFilterTree(data);
        if (data.length > 0 && isListActive) setListExpanded(true);
      }
    } catch {}

    if (isAdminActive) setAdminExpanded(true);

    // 后台刷新筛选树
    fetch("/api/filter-tree")
      .then(r => r.json())
      .then((data: FilterGroup[]) => {
        setFilterTree(data);
        localStorage.setItem("sidebar_filterTree", JSON.stringify(data));
        if (data.length > 0 && isListActive) setListExpanded(true);
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 课次页：获取课次导航数据
  useEffect(() => {
    if (isLessonPage) {
      const parts = pathname.split("/");
      const lessonId = parts[parts.length - 1];
      if (lessonId) {
        fetch(`/api/lesson-nav?lessonId=${lessonId}`)
          .then(r => r.json())
          .then((data: LessonNavData | null) => setLessonNav(data))
          .catch(() => {});
      }
    } else {
      setLessonNav(null);
    }
  }, [pathname, isLessonPage]);

  // URL 变化时同步筛选状态
  useEffect(() => {
    if (isListPage) {
      setActiveAgeRange(urlAgeRange);
      setActiveLevel(urlLevel);
      localStorage.setItem("sidebar_ageRange", urlAgeRange);
      localStorage.setItem("sidebar_level", urlLevel);
    }
  }, [isListPage, urlAgeRange, urlLevel]);

  function handleListClick() {
    setListExpanded(v => !v);
  }

  function handleAdminClick() {
    setAdminExpanded(v => !v);
  }


  // 课次页：当前 lessonId
  const currentLessonId = isLessonPage ? pathname.split("/").pop() ?? "" : "";
  const currentSlug = isLessonPage ? pathname.split("/")[2] ?? "" : "";

  return (
    <aside className="sidebar">
      <Link href="/list" className="sidebar__logo">
        <div className="sidebar__logo-mark" />
        <span className="sidebar__logo-text">AI Dash</span>
      </Link>

      <div className="sidebar__user-wrap">
        <div className="sidebar__user-card">
          <div className="sidebar__avatar">{initial}</div>
          <div>
            <div className="sidebar__user-name">{userName}</div>
            <div className="sidebar__user-role">{ROLE_LABELS[userRole as Role] ?? "教师"}</div>
          </div>
        </div>
      </div>

      <nav className="sidebar__nav">
        {/* 课程包列表 */}
        <div>
          <SidebarNavItem
            icon={BookOpen}
            label="课程包列表"
            active={listParentActive}
            onClick={handleListClick}
          />
          {listExpanded && filterTree.length > 0 && (
            <div className="sidebar__sub-content">
              <SidebarFilterTree
                filterTree={filterTree}
                activeAgeRange={activeAgeRange}
                activeLevel={activeLevel}
              />
            </div>
          )}
        </div>

        {/* 课程研发 */}
        {canAccessRnd && (
          <div>
            <SidebarNavItem
              icon={FlaskConical}
              label="课程研发"
              href="/course-rnd"
              active={isRndActive}
            />
          </div>
        )}

        {/* 管理后台 */}
        {canAccessAdmin && (
          <div>
            <SidebarNavItem
              icon={Settings}
              label="管理后台"
              active={adminParentActive}
              onClick={handleAdminClick}
            />
            {adminExpanded && (
              <div className="sidebar__sub-content">
                <Link
                  href="/admin/packages"
                  className={`sidebar__sub-item${adminSection === "packages" ? " sidebar__sub-item--active" : ""}`}
                >
                  <Package size={14} />
                  课程包管理
                </Link>
                {hasPermission(userRole, PERMISSIONS.MANAGE_USERS) && (
                  <Link
                    href="/admin/users"
                    className={`sidebar__sub-item${adminSection === "users" ? " sidebar__sub-item--active" : ""}`}
                  >
                    <Users size={14} />
                    用户管理
                  </Link>
                )}
                <Link
                  href="/admin/operation-logs"
                  className={`sidebar__sub-item${pathname.includes("/admin/operation-logs") ? " sidebar__sub-item--active" : ""}`}
                >
                  <FileText size={14} />
                  操作日志
                </Link>
                {hasPermission(userRole, PERMISSIONS.AI_SETTINGS) && (
                  <Link
                    href="/admin/ai-settings"
                    className={`sidebar__sub-item${pathname.includes("/admin/ai-settings") ? " sidebar__sub-item--active" : ""}`}
                  >
                    <Cpu size={14} />
                    AI 服务配置
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* 上下文区域 — 根据路由自动渲染 */}
      {isLessonPage && lessonNav && (
        <>
          <hr className="sidebar__divider" />
          <div className="sidebar__context">
            {/* 课次页：课次导航 */}
            {isLessonPage && lessonNav && (
              <div className="sidebar__context-card">
                {lessonNav.lessons.map((lesson) => (
                  <Link
                    key={lesson.id}
                    href={`/lesson/${lessonNav.slug}/${lesson.id}`}
                    className={`sidebar__sub-item${lesson.id === currentLessonId ? " sidebar__sub-item--active" : ""}`}
                  >
                    <span className="sidebar__lesson-no">第 {lesson.lessonNo} 课</span>
                    <span className="sidebar__lesson-title">{lesson.title}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {!isLessonPage && <div className="sidebar__spacer" />}

      <div className="sidebar__footer">&copy; 2025 AI Dash</div>
    </aside>
  );
}
