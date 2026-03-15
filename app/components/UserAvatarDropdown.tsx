"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function UserAvatarDropdown({
  userName,
  userRole,
}: {
  userName: string;
  userRole: string;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, right: 0 });

  const updatePos = useCallback(() => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (open) updatePos();
  }, [open, updatePos]);

  const roleLabel = userRole === "admin" ? "管理员" : "教师";

  return (
    <>
      <button ref={btnRef} className="avatar-btn" onClick={() => setOpen(v => !v)}>
        {userName.charAt(0)}
      </button>

      {open && createPortal(
        <div
          ref={dropdownRef}
          className="avatar-dropdown"
          style={{ top: pos.top, right: pos.right }}
        >
          <div className="avatar-dropdown__info">
            <div className="avatar-dropdown__name">{userName}</div>
            <span className={`badge-role badge-role--${userRole === "admin" ? "admin" : "teacher"}`}>
              {roleLabel}
            </span>
          </div>
          <button className="avatar-dropdown__logout" onClick={() => signOut({ callbackUrl: "/" })}>
            <LogOut size={14} />
            退出登录
          </button>
        </div>,
        document.body
      )}
    </>
  );
}
