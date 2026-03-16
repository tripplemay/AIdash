"use client";

import Link from "next/link";
import UserAvatarDropdown from "./UserAvatarDropdown";
import { useTopBar } from "./TopBarContext";

interface TopBarProps {
  userName: string;
  userRole: string;
}

export default function TopBar({ userName, userRole }: TopBarProps) {
  const { state } = useTopBar();
  const { breadcrumb, title, actions } = state;

  return (
    <div className="topbar">
      <div className="topbar__left">
        {breadcrumb && (
          <>
            <Link href={getBreadcrumbHref(breadcrumb)} className="topbar__back-link">
              ← 返回{breadcrumb}
            </Link>
            <span className="topbar__sep" />
          </>
        )}
        {title && <span className="topbar__title">{title}</span>}
      </div>
      <div className="topbar__right">
        {actions && <div className="topbar__actions">{actions}</div>}
        <UserAvatarDropdown userName={userName} userRole={userRole} />
      </div>
    </div>
  );
}

function getBreadcrumbHref(breadcrumb: string): string {
  const map: Record<string, string> = {
    "管理后台": "/admin/packages",
    "课程包列表": "/list",
    "课程包": "/list",
    "课程研发": "/course-rnd",
    "研发进度管理": "/course-rnd",
    "研发进度": "/course-rnd",
  };
  return map[breadcrumb] ?? "/list";
}
