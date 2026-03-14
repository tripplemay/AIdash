"use client";

import { useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface SidebarNavItemProps {
  icon: LucideIcon;
  label: string;
  href?: string;
  active?: boolean;
  onClick?: () => void;
}

export default function SidebarNavItem({
  icon: Icon,
  label,
  href,
  active,
  onClick,
}: SidebarNavItemProps) {
  const [hovered, setHovered] = useState(false);

  const style: React.CSSProperties = {
    height: 40,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    padding: "0 12px",
    gap: 8,
    fontSize: 14,
    fontWeight: active ? 800 : 600,
    textDecoration: "none",
    cursor: "pointer",
    border: "none",
    width: "100%",
    background: active
      ? "linear-gradient(90deg, #8bb1ff, #7ea5ff)"
      : hovered
      ? "rgba(139,177,255,0.12)"
      : "transparent",
    color: active ? "#fff" : hovered ? "#7e95ff" : "#6074a9",
    boxShadow: active ? "0 8px 18px rgba(126,149,255,0.16)" : "none",
    transition: "all 0.15s ease",
  };

  const content = (
    <>
      <Icon size={16} strokeWidth={active ? 2.5 : 2} />
      {label}
    </>
  );

  if (onClick) {
    return (
      <button
        style={style}
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href={href ?? "#"}
      style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {content}
    </Link>
  );
}
