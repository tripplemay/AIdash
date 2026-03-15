"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Image from "next/image";

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
      <div className="login__shell">
        <div className="login__glow" />

        <div className="login__grid">
          {/* ── 左侧品牌区 ── */}
          <div className="login__brand">
            <div className="login__brand-logo">
              <div className="sidebar__logo-mark" style={{ width: 48, height: 48, borderRadius: 16 }} />
              <span style={{ fontSize: 36, fontWeight: 800, color: "var(--text)" }}>AI Dash</span>
            </div>

            <h1 className="login__brand-title">教师授课系统</h1>
            <p className="login__brand-subtitle">开启智能备课新体验</p>
            <p className="login__brand-desc">
              借助 AI 智备课、互动课堂指导与智能复盘，帮助老师更高效地进入课程、管理课包与组织授课流程。
            </p>

            <div style={{ display: "flex", gap: "var(--sp-4)", flexWrap: "wrap", alignItems: "flex-end" }}>
              <div className="login__brand-features">
                {["AI 智能备课", "互动课堂指导", "AI 复盘助力提升"].map(item => (
                  <div key={item} className="login__brand-feature-item">{item}</div>
                ))}
              </div>
              <Image
                src="/images/login-brand-reference.png"
                alt="首页参考图"
                width={280}
                height={200}
                style={{ borderRadius: 20, objectFit: "cover", boxShadow: "var(--shadow-md)" }}
              />
            </div>
          </div>

          {/* ── 右侧登录区 ── */}
          <div className="login__form-area">
            <form onSubmit={handleLogin} className="login__form">
              <h2 className="login__form-title">欢迎回来</h2>
              <p className="login__form-subtitle">登录教师授课系统，进入课程包与授课流程</p>

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
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
