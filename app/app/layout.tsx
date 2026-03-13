import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Dash — 教师授课系统",
  description: "面向老师与管理员的教师授课系统",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
