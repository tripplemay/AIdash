/** 系统角色常量 */
export const ROLES = {
  TEACHER: "teacher",
  RD_MANAGER: "rd_manager",
  ADMIN: "admin",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/** 所有有效角色值 */
export const VALID_ROLES: Role[] = [ROLES.TEACHER, ROLES.RD_MANAGER, ROLES.ADMIN];

/** 角色中文标签 */
export const ROLE_LABELS: Record<Role, string> = {
  [ROLES.TEACHER]: "教师",
  [ROLES.RD_MANAGER]: "研发员",
  [ROLES.ADMIN]: "管理员",
};

/** 角色 CSS class 后缀 */
export const ROLE_CSS: Record<Role, string> = {
  [ROLES.TEACHER]: "teacher",
  [ROLES.RD_MANAGER]: "rd-manager",
  [ROLES.ADMIN]: "admin",
};
