/** 功能开关 — 通过环境变量控制，无需改代码即可开关功能 */

export const FEATURES = {
  /** 课程研发模块（Sidebar 入口 + 页面路由 + API） */
  RD_MODULE: process.env.ENABLE_RD_MODULE === "true",
} as const;
