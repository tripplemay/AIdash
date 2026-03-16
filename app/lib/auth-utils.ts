import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { Role } from "./roles";

/**
 * API 路由权限守卫：检查当前用户是否拥有指定角色之一
 * @param allowedRoles 允许的角色列表
 * @returns session（通过）或 null（未通过，已返回 403 响应）
 */
export async function requireRole(allowedRoles: Role[]) {
  const session = await auth();
  if (!session) return null;
  const role = (session.user as { role?: string })?.role;
  if (!role || !allowedRoles.includes(role as Role)) return null;
  return session;
}

/**
 * 生成 403 响应
 */
export function forbiddenResponse() {
  return NextResponse.json({ error: "无权限" }, { status: 403 });
}

/**
 * 从 session 中提取用户角色
 */
export function getUserRole(session: { user?: Record<string, unknown> }): string {
  return (session?.user as { role?: string })?.role ?? "teacher";
}
