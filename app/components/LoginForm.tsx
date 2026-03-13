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
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    }}>
      <div style={{
        width: "100%",
        maxWidth: 1280,
        borderRadius: 32,
        background: "linear-gradient(135deg, rgba(244,247,255,0.97), rgba(238,242,255,0.97))",
        border: "1px solid var(--line)",
        boxShadow: "0 24px 64px rgba(112,134,210,0.14)",
        overflow: "hidden",
        position: "relative",
      }}>
        {/* 背景光晕 */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: `
            radial-gradient(circle at 78% 16%, rgba(161,196,255,0.18), transparent 18%),
            radial-gradient(circle at 22% 80%, rgba(186,201,255,0.18), transparent 24%),
            linear-gradient(135deg, rgba(132,180,255,0.06), rgba(174,139,255,0.07))
          `,
        }} />

        <div style={{
          position: "relative", zIndex: 1,
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          minHeight: 640,
        }}>
          {/* ── 左侧品牌区 ── */}
          <div style={{
            padding: "48px 40px 40px 44px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
              <div style={{
                width: 48, height: 48,
                borderRadius: 16,
                background: "linear-gradient(135deg, #7e95ff, #9ad8ff)",
                boxShadow: "0 10px 24px rgba(126,149,255,.22)",
              }} />
              <div style={{ fontSize: 36, fontWeight: 800, color: "var(--text)" }}>AI Dash</div>
            </div>

            <div style={{ fontSize: 58, lineHeight: 1.08, fontWeight: 800, letterSpacing: -1, marginBottom: 14 }}>
              教师授课系统
            </div>
            <div style={{ fontSize: 24, color: "#6f80bb", fontWeight: 500, marginBottom: 18 }}>
              开启智能备课新体验
            </div>
            <div style={{ color: "#7587b5", lineHeight: 1.9, fontSize: 15, maxWidth: 480, marginBottom: 28 }}>
              借助 AI 智备课、互动课堂指导与智能复盘，帮助老师更高效地进入课程、管理课包与组织授课流程。
            </div>

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{
                background: "rgba(255,255,255,0.64)",
                border: "1px solid var(--line)",
                borderRadius: 20,
                padding: "16px 20px",
                boxShadow: "0 8px 24px rgba(109,131,199,0.08)",
              }}>
                {["AI 智能备课", "互动课堂指导", "AI 复盘助力提升"].map(item => (
                  <div key={item} style={{ color: "#5f73b0", fontSize: 14, fontWeight: 700, lineHeight: 1.9 }}>{item}</div>
                ))}
              </div>
              <Image
                src="/images/login-brand-reference.png"
                alt="首页参考图"
                width={280}
                height={200}
                style={{ borderRadius: 20, objectFit: "cover", boxShadow: "0 16px 36px rgba(125,146,214,0.12)" }}
              />
            </div>
          </div>

          {/* ── 右侧登录区 ── */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            padding: "40px 44px 40px 24px",
            borderLeft: "1px solid rgba(228,234,255,0.6)",
          }}>
            <form
              onSubmit={handleLogin}
              style={{
                width: "100%",
                maxWidth: 400,
                background: "rgba(255,255,255,0.76)",
                border: "1px solid var(--line)",
                borderRadius: 28,
                padding: "36px 32px 28px",
                boxShadow: "0 16px 36px rgba(125,146,214,0.12)",
              }}
            >
              <div style={{ fontSize: 30, fontWeight: 800, marginBottom: 6 }}>欢迎回来</div>
              <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 28 }}>
                登录教师授课系统，进入课程包与授课流程
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>账号</div>
                <input
                  type="text"
                  placeholder="请输入账号"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  style={{
                    width: "100%", height: 48,
                    borderRadius: 14,
                    border: "1px solid #dde5fb",
                    background: "rgba(255,255,255,0.72)",
                    padding: "0 14px",
                    fontSize: 15,
                    color: "var(--text)",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ marginBottom: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>密码</div>
                <input
                  type="password"
                  placeholder="请输入密码"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{
                    width: "100%", height: 48,
                    borderRadius: 14,
                    border: "1px solid #dde5fb",
                    background: "rgba(255,255,255,0.72)",
                    padding: "0 14px",
                    fontSize: 15,
                    color: "var(--text)",
                    outline: "none",
                  }}
                />
              </div>

              {error && (
                <div style={{ marginTop: 10, fontSize: 13, color: "#c44", background: "#fff0f0", borderRadius: 10, padding: "8px 12px" }}>
                  {error}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", margin: "10px 0 18px", fontSize: 13, color: "var(--muted)" }}>
                <span style={{ cursor: "pointer" }}>验证码登录</span>
                <span style={{ cursor: "pointer" }}>忘记密码？</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%", height: 52,
                  fontSize: 16, fontWeight: 800,
                  border: "none", borderRadius: 14,
                  cursor: loading ? "not-allowed" : "pointer",
                  color: "#fff",
                  background: "linear-gradient(90deg, #6f86ff, #61d1ff)",
                  boxShadow: "0 10px 22px rgba(111,134,255,.18)",
                  opacity: loading ? 0.7 : 1,
                  marginBottom: 14,
                  transition: "opacity 0.15s",
                }}
              >
                {loading ? "登录中..." : "登录"}
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
                <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
                其他登录方式
                <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" style={{
                  flex: 1, height: 44,
                  border: "1px solid var(--line)",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.78)",
                  color: "var(--text)",
                  fontSize: 13, fontWeight: 600,
                  cursor: "pointer",
                }}>
                  企业微信登录
                </button>
                <button type="button" style={{
                  flex: 1, height: 44,
                  border: "1px solid #d9f0df",
                  borderRadius: 12,
                  background: "rgba(238,252,244,0.82)",
                  color: "#4f8d5a",
                  fontSize: 13, fontWeight: 600,
                  cursor: "pointer",
                }}>
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
