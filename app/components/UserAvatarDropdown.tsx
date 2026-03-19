"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { signOut } from "next-auth/react";
import { LogOut, User, KeyRound } from "lucide-react";
import { ROLE_LABELS, ROLE_CSS, type Role } from "@/lib/roles";
import Link from "next/link";
import PasswordChangeModal from "./profile/PasswordChangeModal";

export default function UserAvatarDropdown({
  userName,
  userRole,
}: {
  userName: string;
  userRole: string;
}) {
  const [open, setOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, right: 0 });

  // Fetch avatar on mount
  useEffect(() => {
    fetch("/api/user/profile")
      .then(r => r.json())
      .then(json => {
        const data = json.data ?? json;
        if (data.avatarUrl) setAvatarUrl(data.avatarUrl);
      })
      .catch(() => {});
  }, []);

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

  const roleLabel = ROLE_LABELS[userRole as Role] ?? "教师";
  const roleCss = ROLE_CSS[userRole as Role] ?? "teacher";

  return (
    <>
      <button ref={btnRef} className="avatar-btn" onClick={() => setOpen(v => !v)}>
        {avatarUrl ? (
          <img src={avatarUrl} alt={userName} className="avatar-btn__img" />
        ) : (
          userName.charAt(0)
        )}
      </button>

      {open && createPortal(
        <div
          ref={dropdownRef}
          className="avatar-dropdown"
          style={{ top: pos.top, right: pos.right }}
        >
          <div className="avatar-dropdown__info">
            <div className="avatar-dropdown__name">{userName}</div>
            <span className={`badge-role badge-role--${roleCss}`}>
              {roleLabel}
            </span>
          </div>
          <Link
            href="/profile"
            className="avatar-dropdown__menu-item"
            onClick={() => setOpen(false)}
          >
            <User size={14} />
            个人资料
          </Link>
          <button
            className="avatar-dropdown__menu-item"
            onClick={() => { setOpen(false); setShowPasswordModal(true); }}
          >
            <KeyRound size={14} />
            修改密码
          </button>
          <button className="avatar-dropdown__logout" onClick={() => signOut({ callbackUrl: "/" })}>
            <LogOut size={14} />
            退出登录
          </button>
        </div>,
        document.body
      )}

      {showPasswordModal && (
        <PasswordChangeModal onClose={() => setShowPasswordModal(false)} />
      )}
    </>
  );
}
