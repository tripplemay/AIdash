# AI Dash — 教师授课系统 / Teacher Instruction System

> 面向教师与管理员的课程包管理与授课支撑平台。
>
> A course package management and instruction support platform for teachers and administrators.

---

## 项目简介 / Overview

AI Dash 是一套面向 K12 AI 教育场景的教师授课系统，帮助老师统一管理课程包、进入单课授课流程，并支持管理员通过后台上传和维护课程资产。

AI Dash is a teacher instruction system for K12 AI education, enabling teachers to manage course packages, enter individual lesson flows, and allowing administrators to upload and maintain course assets via a backend portal.

**主链路 / Main Flow**

```
登录 → 课程包列表 → 课程包详情 → 进入本课（iframe）
Login → Package List → Package Detail → Enter Lesson (iframe)
```

---

<!-- DYNAMIC:FEATURES -->
## 功能概览 / Features

### 教师端 / Teacher

- 课程包列表：按年龄段、级别、关键词筛选浏览
- 课程包详情：查看封面、简介、元信息与课次列表
- 进入本课：在系统导航框架内通过 iframe 加载单课 HTML 内容
- 锚点导航：详情页侧边栏可快速跳转至"课程包详情"和"课次列表"区块
- 课程包树：侧边栏按年龄段/级别联动筛选课程包

### 管理员端 / Admin

- 课程包管理：上传标准 zip 包，自动解析并入库
- 用户管理：新增、编辑、禁用教师账号，重置密码

### 通用 / Common

- 角色权限：教师与管理员菜单独立，管理员在任意页面可直达后台
- 用户头像下拉：显示当前用户信息，支持退出登录
- 打印优化：单课页支持打印样式，隐藏导航与交互元素
<!-- /DYNAMIC:FEATURES -->

---

<!-- DYNAMIC:TECH -->
## 技术栈 / Tech Stack

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router) + React 19 |
| 样式 | Tailwind CSS + CSS Variables（浅蓝紫雾光科技感主题）|
| 数据库 | 腾讯云 TDSQL-C PostgreSQL（MySQL 协议）|
| ORM | Prisma 6 |
| 认证 | NextAuth.js v5 (Credentials) |
| 图标 | lucide-react |
| 部署 | VPS + PM2 + Nginx + GitHub Actions CI/CD |
| 课程包存储 | 服务器持久目录 `/opt/aidash/uploads/course-packages/`（独立于应用目录）|
<!-- /DYNAMIC:TECH -->

---

<!-- DYNAMIC:STRUCTURE -->
## 目录结构 / Directory Structure

```
AIdash/
├── app/                        # Next.js 应用主目录
│   ├── app/                    # App Router 页面
│   │   ├── page.tsx            # 登录页
│   │   ├── list/               # 课程包列表页
│   │   ├── detail/[slug]/      # 课程包详情页
│   │   ├── lesson/[slug]/[lessonId]/  # 单课页（iframe）
│   │   ├── admin/
│   │   │   ├── packages/       # 管理员：课程包管理
│   │   │   └── users/          # 管理员：用户管理
│   │   └── api/
│   │       ├── auth/           # NextAuth 认证
│   │       ├── packages/       # 课程包查询接口
│   │       ├── course-files/   # 课程包文件动态服务
│   │       └── admin/          # 管理员操作接口（上传、用户 CRUD）
│   ├── components/             # 共用组件
│   │   ├── Sidebar.tsx         # 侧边栏（多 variant）
│   │   ├── TopBar.tsx          # 顶部导航栏
│   │   ├── SidebarNavItem.tsx  # 侧边栏菜单项（图标 + hover）
│   │   ├── DetailSidebarNav.tsx # 详情页锚点导航
│   │   ├── SidebarFilterTree.tsx # 课程包树联动筛选
│   │   ├── UserAvatarDropdown.tsx # 头像下拉菜单
│   │   └── admin/              # 管理员专用组件
│   ├── prisma/
│   │   ├── schema.prisma       # 数据库模型（User / CoursePackage / Lesson / Attachment）
│   │   └── seed.ts             # 初始账号数据
│   └── scripts/
│       └── deploy-remote.sh    # 服务器端部署脚本
├── docs/                       # 项目文档
│   ├── PROJECT_STATUS.md       # 项目进度总览
│   ├── decisions/              # 架构决策记录 ADR
│   ├── product/                # 产品需求文档
│   ├── tech/                   # 技术方案
│   ├── design/                 # UI/UX 规范
│   └── ops/                    # 运维部署方案
└── .github/workflows/
    └── deploy.yml              # GitHub Actions 自动部署
```
<!-- /DYNAMIC:STRUCTURE -->

---

## 部署说明 / Deployment

### CI/CD 流程 / CI/CD Flow

推送至 `main` 分支后自动触发：

1. GitHub Actions 执行 TypeScript 类型检查
2. `rsync` 将 `app/` 同步至服务器 `/opt/aidash/app/`（排除 `.env`、`node_modules`、`.next`）
3. 服务器执行 `deploy-remote.sh`：安装依赖 → Prisma 迁移 → 构建 → PM2 重载

### 环境变量 / Environment Variables

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | 腾讯云 TDSQL-C 连接串（mysql://...）|
| `AUTH_SECRET` | NextAuth 密钥 |
| `AUTH_TRUST_HOST` | `true`（Nginx 反代必须）|
| `AUTH_URL` | 生产域名（https://your-domain.com）|
| `UPLOADS_DIR` | 课程包上传目录（`/opt/aidash/uploads/course-packages/`）|

### 首次部署后 / After First Deploy

1. 登录管理员后台（`/admin/packages`）
2. 上传符合接入规范 v1 的课程包 zip 文件
3. 课程包自动解析入库并上线

---

## 使用说明 / Usage

### 默认账号 / Default Accounts

| 角色 | 账号 | 密码 |
|------|------|------|
| 教师 | `teacher01` | `teacher123` |
| 管理员 | `admin` | `admin123` |

> ⚠️ 生产环境请及时修改密码。

### 课程包接入规范 / Course Package Spec

上传的 zip 必须符合以下结构：

```
{slug}/
├── package.json          # 课程包元信息（package_slug、package_title、age_range、level、lessons）
├── assets/images/        # 封面图
└── lessons/
    └── {lesson_dir}/
        ├── lesson.json   # 课次元信息（lesson_no、lesson_title、entry_file、attachments）
        ├── index.html    # 单课入口（可独立运行）
        ├── assets/
        └── attachments/
```

---

## 开发指南 / Development

### 本地环境搭建 / Local Setup

```bash
cd app
npm install
cp .env.example .env        # 填入本地数据库连接串
npx prisma migrate dev
npm run seed                # 初始化账号数据
npm run dev                 # 启动开发服务器 http://localhost:3000
```

### 常用命令 / Commands

```bash
npm run dev          # 启动开发服务器
npm run build        # 生产构建
npm run typecheck    # TypeScript 类型检查
npm run seed         # 重置/初始化种子数据（账号）
npx prisma studio    # 可视化数据库管理
npx prisma migrate dev --name <name>  # 新建数据库迁移
```

### 课程包本地测试 / Local Course Package Testing

本地开发时，课程包文件存放于 `app/public/course-packages/`（不提交 git）。通过管理员后台上传 zip 即可自动解析至该目录。
