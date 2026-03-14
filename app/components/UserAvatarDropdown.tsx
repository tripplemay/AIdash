"use client";

import { useState, useEffect, useRef } from "react";
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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const roleLabel = userRole === "admin" ? "管理员" : "教师";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: 36, height: 36,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #8bb1ff, #7ea5ff)",
          border: "2px solid rgba(255,255,255,0.7)",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 800, color: "#fff",
          boxShadow: "0 4px 12px rgba(126,149,255,0.28)",
          flexShrink: 0,
          transition: "box-shadow 0.15s ease",
        }}
        onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 6px 18px rgba(126,149,255,0.42)")}
        onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(126,149,255,0.28)")}
      >
        {userName.charAt(0)}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0,
          minWidth: 168,
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(12px)",
          border: "1px solid var(--line)",
          borderRadius: 16,
          boxShadow: "0 12px 32px rgba(112,134,210,0.14)",
          zIndex: 50,
          overflow: "hidden",
        }}>
          <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid var(--line)" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)" }}>{userName}</div>
            <div style={{
              display: "inline-flex", marginTop: 4,
              padding: "2px 8px", borderRadius: 999,
              background: "#eef3ff", color: "#6278b2",
              fontSize: 11, fontWeight: 600,
            }}>
              {roleLabel}
            </div>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            style={{
              width: "100%", padding: "10px 16px",
              display: "flex", alignItems: "center", gap: 8,
              border: "none", background: "transparent",
              cursor: "pointer", fontSize: 13, fontWeight: 600,
              color: "#e05a5a", textAlign: "left",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(224,90,90,0.06)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <LogOut size={14} />
            退出登录
          </button>
        </div>
      )}
    </div>
  );
}
