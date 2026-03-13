# 数据库 Schema 设计文档

> 最后更新：2026-03-13
> 对应文件：`app/prisma/schema.prisma`

---

## 概述

当前使用 **SQLite**（本地开发）+ Prisma 7 + `@prisma/adapter-libsql`。
生产环境计划迁移至腾讯云 **TDSQL-C PostgreSQL**（待决策 → ADR-002）。

---

## 表结构

### User（用户）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK, cuid() | 主键 |
| username | String | UNIQUE | 登录账号 |
| password | String | — | bcrypt 哈希密码 |
| name | String | — | 显示名（如"张老师"） |
| role | String | DEFAULT "teacher" | `"teacher"` 或 `"admin"` |
| createdAt | DateTime | DEFAULT now() | 创建时间 |
| updatedAt | DateTime | @updatedAt | 更新时间 |

**关系**：无外键，独立表。

---

### CoursePackage（课程包）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK, cuid() | 主键 |
| slug | String | UNIQUE | URL 友好标识符，如 `my-magical-partner` |
| title | String | — | 课程包名称 |
| ageRange | String | — | 适用年龄段，如 `"8-12"` |
| level | String | — | 级别，如 `"L1"` |
| summary | String? | NULLABLE | 课程包简介 |
| coverImage | String? | NULLABLE | 主图路径，如 `/images/xxx.png` |
| status | String | DEFAULT "draft" | `"draft"` / `"published"` / `"offline"` |
| createdAt | DateTime | DEFAULT now() | 创建时间 |
| updatedAt | DateTime | @updatedAt | 更新时间 |

**关系**：一对多 → `Lesson[]`（onDelete: Cascade）

---

### Lesson（课次）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK, cuid() | 主键 |
| lessonNo | Int | — | 课次序号（用于排序） |
| title | String | — | 课次标题 |
| durationMinutes | Int | DEFAULT 45 | 课时时长（分钟） |
| deliveryMode | String | DEFAULT "offline_small_group" | 授课形式，当前仅 `"offline_small_group"` |
| outputSummary | String? | NULLABLE | 本课成果描述 |
| entryFile | String | DEFAULT "index.html" | 课包内入口文件名 |
| contentPath | String? | NULLABLE | 单课包在 `/public` 下的相对路径，如 `/course-packages/my-magical-partner/lessons/lesson-01/index.html` |
| status | String | DEFAULT "draft" | `"draft"` / `"published"` |
| createdAt | DateTime | DEFAULT now() | 创建时间 |
| updatedAt | DateTime | @updatedAt | 更新时间 |
| packageId | String | FK → CoursePackage.id | 所属课程包 |

**关系**：
- 多对一 → `CoursePackage`（onDelete: Cascade）
- 一对多 → `Attachment[]`（onDelete: Cascade）

---

### Attachment（附件）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK, cuid() | 主键 |
| type | String | — | 附件类型（见下方枚举） |
| title | String | — | 显示名称 |
| path | String | — | 文件相对路径 |
| lessonId | String | FK → Lesson.id | 所属课次 |

**附件类型枚举**：

| type 值 | 说明 |
|---------|------|
| `teacher_screen` | 教师投屏页 |
| `student_ai_input_template` | 学生 AI 输入模板单 |
| `student_output_template` | 学生成果模板 |
| `teacher_demo_case` | 教师示范案例页 |

**关系**：多对一 → `Lesson`（onDelete: Cascade）

---

## ER 关系图

```
User
（独立，无外键）

CoursePackage
  └── Lesson (1:N, Cascade)
        └── Attachment (1:N, Cascade)
```

---

## 开发环境配置

```bash
# 本地数据库
DATABASE_URL="file:./dev.db"

# 初始化 / 迁移
npx prisma migrate dev

# 写入种子数据
npx tsx prisma/seed.ts
```

**测试账号**：
- 教师：`teacher01` / `teacher123`
- 管理员：`admin` / `admin123`

---

## 生产迁移计划

> 待决策事项（见下方）

当前本地开发使用 SQLite via libsql。生产环境迁移至腾讯云 TDSQL-C PostgreSQL 时需：
1. 修改 `datasource db { provider = "postgresql" }`
2. 更新 `prisma.config.ts` datasource.url 为 PostgreSQL 连接串
3. 重新执行 `prisma migrate deploy`
4. 替换 `@prisma/adapter-libsql` 为标准 Prisma Client（无需 adapter）

详见 ADR-002（待创建）。
