"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface TopBarTab {
  label: string;
  href: string;
}

interface TopBarProps {
  tabs?: TopBarTab[];
  userName?: string;
}

const defaultTabs: TopBarTab[] = [
  { label: "课程包列表", href: "/list" },
];

export default function TopBar({ tabs = defaultTabs, userName = "张老师" }: TopBarProps) {
  const pathname = usePathname();

  return (
    <div style={{
      height: 80,
      borderBottom: "1px solid var(--line)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 18,
      padding: "0 24px",
    }}>
      <div style={{ display: "flex", gap: 22, alignItems: "center" }}>
        {tabs.map(({ label, href }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              style={{
                fontSize: 15,
                fontWeight: isActive ? 800 : 700,
                color: isActive ? "#52639e" : "#5c71a8",
                textDecoration: "none",
                position: "relative",
                paddingBottom: 4,
              }}
            >
              {label}
              {isActive && (
                <span style={{
                  position: "absolute",
                  left: 0, right: 0, bottom: -4,
                  height: 3,
                  background: "#83b4ff",
                  borderRadius: 999,
                  display: "block",
                }} />
              )}
            </Link>
          );
        })}
      </div>
      <div style={{ fontSize: 13, color: "var(--muted)" }}>{userName}</div>
    </div>
  );
}
