"use client";

import { useState } from "react";
import { Info, List } from "lucide-react";
import SidebarNavItem from "./SidebarNavItem";

export default function DetailSidebarNav() {
  const [active, setActive] = useState<"info" | "lessons">("info");

  function scrollTo(id: string, section: "info" | "lessons") {
    setActive(section);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <nav style={{ padding: "18px 8px 8px", display: "grid", gap: 4 }}>
      <SidebarNavItem
        icon={Info}
        label="课程包详情"
        active={active === "info"}
        onClick={() => scrollTo("package-info", "info")}
      />
      <SidebarNavItem
        icon={List}
        label="课次列表"
        active={active === "lessons"}
        onClick={() => scrollTo("lesson-list", "lessons")}
      />
    </nav>
  );
}
