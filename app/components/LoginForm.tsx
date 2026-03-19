"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError("账号或密码错误，请重试");
    } else {
      window.location.href = "/list";
    }
  }

  return (
    <div className="login">
      <div className="login__card">
        <div className="login__brand-logo">
          <img src="/images/logo-sm.png" alt="AI Dash" style={{ height: 100 }} />
        </div>

        <h1 className="login__brand-title">智能课程系统</h1>

        <form onSubmit={handleLogin} className="login__form">
          <div style={{ marginBottom: "var(--sp-4)" }}>
            <label className="field-label">账号</label>
            <input
              className="input"
              type="text"
              placeholder="请输入账号"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="field-label">密码</label>
            <input
              className="input"
              type="password"
              placeholder="请输入密码"
              value={password}
              onChange={e => setPassword(e.target.value)}
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
            {loading ? "登录中..." : "登录"}
          </button>

          <div className="login__divider">其他登录方式</div>

          <div className="login__social-btns">
            <button type="button" disabled className="login__social-btn">
              企业微信登录
            </button>
            <button type="button" disabled className="login__social-btn login__social-btn--wechat">
              微信登录
            </button>
          </div>

          <div style={{ textAlign: "center", marginTop: "var(--sp-3)" }}>
            <Link href="/register" style={{ color: "var(--brand)", fontSize: 13, fontWeight: 500 }}>
              没有账号？使用邀请码注册
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
