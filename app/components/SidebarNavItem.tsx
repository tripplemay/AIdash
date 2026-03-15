"use client";

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
  const cls = `sidebar__nav-item${active ? " sidebar__nav-item--active" : ""}`;

  const content = (
    <>
      <Icon size={16} strokeWidth={active ? 2.5 : 2} />
      {label}
    </>
  );

  if (onClick) {
    return (
      <button className={cls} onClick={onClick}>
        {content}
      </button>
    );
  }

  return (
    <Link href={href ?? "#"} className={cls}>
      {content}
    </Link>
  );
}
