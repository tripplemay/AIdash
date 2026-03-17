import { ROLES, type Role } from "./roles";

/** 功能权限标识 */
export const PERMISSIONS = {
  /** 课程包浏览（列表/详情/课次） */
  VIEW_COURSES: "view_courses",
  /** 课程研发模块 */
  COURSE_RND: "course_rnd",
  /** 管理后台 — 课程包管理 */
  MANAGE_PACKAGES: "manage_packages",
  /** 管理后台 — 用户管理 */
  MANAGE_USERS: "manage_users",
  /** 管理后台 — AI 设置 */
  AI_SETTINGS: "ai_settings",
  /** 操作日志 — 查看全部 */
  VIEW_ALL_LOGS: "view_all_logs",
  /** 操作日志 — 查看自己 */
  VIEW_OWN_LOGS: "view_own_logs",
  /** 管理后台 — Prompt 配置（基线/模板/预设） */
  PROMPT_CONFIG: "prompt_config",
  /** 查看 Prompt 配置（只读） */
  VIEW_PROMPT_CONFIG: "view_prompt_config",
} as const;

type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** 角色 → 权限映射 */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [ROLES.TEACHER]: [
    PERMISSIONS.VIEW_COURSES,
  ],
  [ROLES.RD_MANAGER]: [
    PERMISSIONS.VIEW_COURSES,
    PERMISSIONS.COURSE_RND,
    PERMISSIONS.MANAGE_PACKAGES,
    PERMISSIONS.VIEW_OWN_LOGS,
    PERMISSIONS.VIEW_PROMPT_CONFIG,
  ],
  [ROLES.ADMIN]: [
    PERMISSIONS.VIEW_COURSES,
    PERMISSIONS.COURSE_RND,
    PERMISSIONS.MANAGE_PACKAGES,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.AI_SETTINGS,
    PERMISSIONS.VIEW_ALL_LOGS,
    PERMISSIONS.VIEW_OWN_LOGS,
    PERMISSIONS.PROMPT_CONFIG,
    PERMISSIONS.VIEW_PROMPT_CONFIG,
  ],
};

/** 检查角色是否拥有某个权限 */
export function hasPermission(role: string, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role as Role];
  if (!perms) return false;
  return perms.includes(permission);
}

/** 检查角色是否在允许列表中 */
export function hasRole(role: string, allowedRoles: Role[]): boolean {
  return allowedRoles.includes(role as Role);
}

/** 可访问管理后台的角色 */
export const ADMIN_PANEL_ROLES: Role[] = [ROLES.RD_MANAGER, ROLES.ADMIN];

/** 可访问课程研发的角色 */
export const COURSE_RND_ROLES: Role[] = [ROLES.RD_MANAGER, ROLES.ADMIN];
