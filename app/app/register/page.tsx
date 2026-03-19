"use client";

import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [inviteCode, setInviteCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Client-side validation
    if (!inviteCode || !username || !password || !confirmPassword || !name) {
      setError("请填写所有必填字段");
      return;
    }
    if (password.length < 6) {
      setError("密码至少需要 6 个字符");
      return;
    }
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode, username, password, name }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "注册失败");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="login">
        <div className="login__card">
          <div className="login__brand-logo">
            <img src="/images/logo-sm.png" alt="AI Dash" style={{ height: 100 }} />
          </div>
          <h1 className="login__brand-title">注册成功</h1>
          <p style={{ color: "var(--muted)", marginBottom: "var(--sp-6)", fontSize: 14 }}>
            账号创建成功，请使用新账号登录。
          </p>
          <Link href="/" className="btn btn--lg btn--block" style={{ borderRadius: "var(--radius-md)", textDecoration: "none" }}>
            返回登录
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="login">
      <div className="login__card">
        <div className="login__brand-logo">
          <img src="/images/logo-sm.png" alt="AI Dash" style={{ height: 100 }} />
        </div>

        <h1 className="login__brand-title">注册账号</h1>

        <form onSubmit={handleSubmit} className="login__form">
          <div style={{ marginBottom: "var(--sp-4)" }}>
            <label className="field-label">邀请码 <span className="field-required">*</span></label>
            <input
              className="input"
              type="text"
              placeholder="请输入邀请码"
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: "var(--sp-4)" }}>
            <label className="field-label">用户名 <span className="field-required">*</span></label>
            <input
              className="input"
              type="text"
              placeholder="用于登录，创建后不可修改"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: "var(--sp-4)" }}>
            <label className="field-label">姓名 <span className="field-required">*</span></label>
            <input
              className="input"
              type="text"
              placeholder="请输入姓名"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: "var(--sp-4)" }}>
            <label className="field-label">密码 <span className="field-required">*</span></label>
            <input
              className="input"
              type="password"
              placeholder="至少 6 个字符"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="field-label">确认密码 <span className="field-required">*</span></label>
            <input
              className="input"
              type="password"
              placeholder="再次输入密码"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className="field-error">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="btn btn--lg btn--block"
            style={{ marginTop: "var(--sp-6)", marginBottom: "var(--sp-3)", borderRadius: "var(--radius-md)" }}
          >
            {loading ? "注册中..." : "注册"}
          </button>

          <div style={{ textAlign: "center", marginTop: "var(--sp-3)" }}>
            <Link href="/" style={{ color: "var(--brand)", fontSize: 13, fontWeight: 500 }}>
              已有账号？返回登录
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
