"use client";

import UserAvatarDropdown from "./UserAvatarDropdown";
import { useTopBar } from "./TopBarContext";

interface TopBarProps {
  userName: string;
  userRole: string;
}

export default function TopBar({ userName, userRole }: TopBarProps) {
  const { state } = useTopBar();

  return (
    <div className="topbar">
      <div>
        {state.breadcrumb && <nav className="topbar__breadcrumb">{state.breadcrumb}</nav>}
      </div>
      <div className="topbar__right">
        <UserAvatarDropdown userName={userName} userRole={userRole} />
      </div>
    </div>
  );
}
