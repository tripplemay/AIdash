# AI Dash 项目交接文档 — 供 ChatGPT 规划新系统使用

> 本文档供 ChatGPT 阅读，目的是让 ChatGPT 充分了解 AI Dash 现有系统的架构、数据模型、接口规范和约束，以便规划「AI 生成课程工作台」时确保新系统能正确接入。
>
> 最终产出的交接包将由 Claude Code 在此代码库中实施开发。

---

## 1. 项目概述

**AI Dash** 是一个面向老师与管理员的教师授课系统。老师可以浏览课程包、进入具体课次查看教学内容；管理员可以上传课程包、管理用户。

**技术栈**：Next.js 16 (App Router) + React 19 + Prisma 6 + MySQL + NextAuth.js v5 + 纯 CSS 设计系统

**生产环境**：VPS + PM2 + Nginx，域名 ai.dashedu.net

---

## 2. 系统架构

### 2.1 路由结构

```
app/
├── page.tsx                             # / — 登录页（无需认证）
├── layout.tsx                           # 根 layout（html/body）
├── globals.css                          # 纯 CSS 设计系统（~1700行，BEM-lite 命名）
└── (app)/                               # Route Group（不影响 URL，括号不出现在路径中）
    ├── layout.tsx                       # 统一认证检查 + AppShell（Sidebar 常驻）
    ├── list/page.tsx                    # /list — 课程包列表
    ├── detail/[slug]/page.tsx           # /detail/:slug — 课程包详情
    ├── lesson/[slug]/[lessonId]/page.tsx # /lesson/:slug/:id — 单课渲染（v2 JSON）
    └── admin/
        ├── layout.tsx                   # admin 角色校验
        ├── packages/page.tsx            # /admin/packages — 课程包管理
        └── users/page.tsx               # /admin/users — 用户管理
```

### 2.2 Layout 持久化架构

`(app)/layout.tsx` 渲染 `AppShell`（包含 Sidebar + TopBar），在子路由切换时不卸载不重建。

```
AppShell (client component, 常驻)
├── Sidebar（完全自治：内部通过 API 获取筛选树/课次导航数据）
└── <main>
    ├── TopBar（常驻，通过 TopBarContext 接收面包屑）
    └── {children}（各页面只输出纯业务内容）
```

**关键设计决策**：
- Sidebar 不接受外部 props（除 userName/userRole），所有导航数据通过 `/api/filter-tree` 和 `/api/lesson-nav` 自行获取
- 新页面放在 `(app)/` 目录下即可自动获得 Sidebar + TopBar + 认证保护
- 课次页有特殊高度约束（`calc(100vh - 40px)`），AppShell 根据 `isLessonPage` 条件处理

### 2.3 认证机制

NextAuth.js v5 Credentials 提供者（用户名 + 密码，bcryptjs 哈希）。

- `(app)/layout.tsx` 统一做认证检查，未登录重定向到 `/`
- `(app)/admin/layout.tsx` 统一做 admin 角色校验
- 用户角色：`"teacher"` | `"admin"`
- JWT 中携带 `role` 字段

认证配置（`auth.config.ts`）：
```typescript
// 受保护路由
const PROTECTED = ["/list", "/detail", "/admin"];
// 已登录用户访问登录页，重定向到列表页
if (nextUrl.pathname === "/" && isLoggedIn) redirect("/list");
```

> **新系统接入注意**：如果新系统的页面需要认证保护，放在 `(app)/` 下即可；如果需要新角色，需修改 `auth.config.ts` 和数据库 `User.role` 字段。

---

## 3. 数据库 Schema（Prisma 6 + MySQL）

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  username  String   @unique
  password  String
  name      String
  role      String   @default("teacher") // "teacher" | "admin"
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model CoursePackage {
  id          String   @id @default(cuid())
  slug        String   @unique
  title       String
  ageRange    String
  level       String
  summary     String?
  coverImage  String?
  status      String   @default("draft") // "draft" | "published" | "offline"
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  lessons     Lesson[]
}

model Lesson {
  id              String   @id @default(cuid())
  lessonNo        Int
  title           String
  durationMinutes Int      @default(45)
  deliveryMode    String   @default("offline_small_group")
  groupSize       String?
  aiRoundsCount   Int?
  outputSummary   String?
  entryFile       String   @default("index.html")
  contentPath     String?  // v1 遗留，不再使用
  contentData     String?  @db.LongText // v2 核心：JSON { hero, sections }
  status          String   @default("draft")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  packageId       String
  package         CoursePackage @relation(fields: [packageId], references: [id], onDelete: Cascade)
  attachments     Attachment[]
  @@unique([packageId, lessonNo])
}

model Attachment {
  id       String @id @default(cuid())
  type     String // "teacher_screen" | "student_ai_input_template" | "student_output_template" | "teacher_demo_case"
  title    String
  path     String
  lessonId String
  lesson   Lesson @relation(fields: [lessonId], references: [id], onDelete: Cascade)
}
```

---

## 4. 课次内容数据结构（v2 JSON）

课次内容存储在 `Lesson.contentData` 字段中（JSON 字符串）。TypeScript 类型定义：

```typescript
type PillColor = "blue" | "violet" | "yellow" | "green" | "default";
type BoxVariant = "default" | "danger" | "success" | "note";

interface TextBlock    { type: "text";      content: string }
interface QuoteBlock   { type: "quote";     content: string }
interface ListBlock    { type: "list";      ordered: boolean; items: string[] }
interface TemplateBlock{ type: "template";  label?: string; content: string }
interface QaPairBlock  { type: "qa_pair";   question: string; answer: string }

interface BoxBlock {
  type: "box";
  pill?: { text: string; color: PillColor };
  variant?: BoxVariant;
  title?: string;
  blocks: Block[];  // 可嵌套
}

interface GridBlock {
  type: "grid";
  cols: 2 | 3;
  items: BoxBlock[];  // 只能放 BoxBlock
}

interface AccordionBlock {
  type: "accordion";
  title: string;
  time: string;
  blocks: Block[];
}

type Block = TextBlock | QuoteBlock | ListBlock | TemplateBlock
           | BoxBlock | GridBlock | AccordionBlock | QaPairBlock;

interface Section {
  id: string;     // 唯一标识
  title: string;
  blocks: Block[];
}

interface Hero {
  tags: string[];
  title: string;
  subtitle: string;
  goal: string;
  outcome: string;
}

interface LessonContent {
  hero: Hero;
  sections: Section[];
}
```

---

## 5. 现有 API 列表

| 方法 | 路径 | 用途 | 认证要求 |
|------|------|------|---------|
| GET | `/api/packages` | 课程包列表 | 无 |
| GET | `/api/packages/[slug]` | 课程包详情 | 无 |
| GET | `/api/admin/packages` | 管理端课程包列表 | admin |
| POST | `/api/admin/packages` | 创建课程包 | admin |
| PATCH | `/api/admin/packages/[slug]` | 更新课程包状态 | admin |
| DELETE | `/api/admin/packages/[slug]` | 删除课程包 | admin |
| **POST** | **`/api/admin/upload`** | **上传课程包 ZIP** | **admin** |
| GET | `/api/admin/users` | 用户列表 | admin |
| POST | `/api/admin/users` | 创建用户 | admin |
| PATCH | `/api/admin/users/[id]` | 更新用户/重置密码 | admin |
| DELETE | `/api/admin/users/[id]` | 删除用户 | admin |
| GET | `/api/filter-tree` | 筛选树数据 | 无 |
| GET | `/api/lesson-nav?lessonId=xxx` | 课次导航数据 | 无 |
| GET | `/api/course-files/[...path]` | 静态资源服务 | 无 |

### 关键 API：上传接口（POST /api/admin/upload）

新系统生成的课程包 ZIP 必须通过此接口上传。接口预期：

**请求**：`multipart/form-data`，字段 `file`（.zip，最大 50MB）

**ZIP 结构要求**：
```
{slug}/
├── package.json          # 必须：课程包元信息
└── lessons/
    └── {lesson_dir}/
        ├── lesson.json   # 必须：课次内容（含 hero + sections）
        └── assets/       # 可选：图片资源
```

**package.json 必填字段**：`package_slug`、`package_title`、`age_range`、`level`、`lessons[]`

**lesson.json 必填字段**：`lesson_no`、`lesson_title`、`sections`（Block 数组）

**处理流程**：
1. 验证 ZIP 结构和 package.json
2. 解压到持久化目录（`/opt/aidash/uploads/course-packages/`）
3. 数据库 upsert：CoursePackage + Lesson（事务）
4. `Lesson.contentData` = `JSON.stringify({ hero, sections })`
5. 状态自动设为 `published`

---

## 6. CSS 设计系统

纯 CSS 变量体系（无 Tailwind），视觉基调：**浅蓝紫雾光科技感**。

### 设计令牌

```css
:root {
  /* 色彩 */
  --bg: #eef3ff;          --panel: rgba(255,255,255,0.86);
  --line: #e4eaff;        --text: #3a4d7a;
  --muted: #5f6f96;       --brand: #7e95ff;
  --brand2: #84b7ff;      --accent: #7fd7ff;
  --green: #228654;       --danger: #e55555;
  --warning: #f1b24a;

  /* 间距网格（8px base） */
  --sp-1: 4px;  --sp-2: 8px;  --sp-3: 12px;  --sp-4: 16px;
  --sp-5: 20px; --sp-6: 24px; --sp-8: 32px;  --sp-10: 40px;

  /* 圆角 */
  --radius-md: 14px;  --radius-lg: 18px;  --radius-xl: 22px;
  --radius-2xl: 28px; --radius-pill: 999px;

  /* 阴影 */
  --shadow-sm: 0 4px 12px rgba(110,130,190,0.06);
  --shadow-md: 0 12px 30px rgba(110,130,190,0.08);
  --shadow-brand: 0 10px 22px rgba(111,134,255,0.18);

  /* 过渡 */
  --transition-fast: 150ms ease;
  --transition-normal: 200ms ease;
}
```

### 命名规范

BEM-lite：`.sidebar__nav-item--active`、`.lesson-block--box--danger`

### 新页面接入建议

- 使用上述 CSS 变量，不要硬编码颜色/间距
- 按钮用 `.btn`、`.btn--soft`、`.btn--danger` 等现有类
- 输入框用 `.input`、`.select`
- 卡片用 `.card`、`.card--flat`、`.card--glass`
- 模态框用 `.modal-overlay` + `.modal`

---

## 7. 冻结约束

新系统设计时必须遵守：

1. **主链路不得增加层级**：登录 → 列表 → 详情 → 进入本课 → 课次内容
2. **导航结构**：全局采用左侧 Sidebar（Layout 层常驻），不得引入顶部水平导航栏
3. **视觉风格**：浅蓝紫雾光科技感，高亮度、通透、教师友好
4. **样板课不可替换**：《我的神奇搭档课程包》为固定示例数据

---

## 8. 新系统接入指南

### 8.1 新增页面

将页面文件放在 `app/(app)/` 下，自动获得：
- 认证保护（未登录重定向）
- Sidebar + TopBar（常驻）
- 统一的页面壳层（page-shell + 装饰光晕）

### 8.2 新增 API

将 API 路由放在 `app/api/` 下。命名规范：
- RESTful 风格：`/api/resource`（GET/POST）、`/api/resource/[id]`（PATCH/DELETE）
- admin 接口需在处理器内调用 `requireAdmin()` 验证权限

### 8.3 数据库变更

修改 `prisma/schema.prisma`，然后：
```bash
npx prisma migrate dev --name 描述   # 开发环境
npx prisma migrate deploy             # 生产环境（deploy 脚本自动执行）
```

### 8.4 Sidebar 导航

Sidebar 当前有两个顶级菜单：「课程包列表」和「管理后台」（仅 admin 可见）。
新系统如需在 Sidebar 中添加入口，需修改 `components/Sidebar.tsx`。

### 8.5 课程发布方式（重要）

新系统定稿的课程需要**一键发布到现有课程库**，不走手动下载 ZIP 再上传的流程。需要设计两种发布通道：

| 方式 | 场景 | 实现 |
|------|------|------|
| **A. ZIP 上传** | 外部导入（手动制作的课程包） | 现有 `POST /api/admin/upload`，接收 multipart/form-data |
| **B. 直接入库（一键发布）** | 新系统内部定稿后直接发布 | **需新增 API**，接收 JSON 直接写入数据库 |

**方式 B 的新 API 设计建议**：

```
POST /api/admin/publish

请求体（JSON）：
{
  "package": {
    "slug": "new-course-slug",
    "title": "课程包名称",
    "ageRange": "8-12",
    "level": "L1",
    "summary": "课程包简介",
    "coverImage": null
  },
  "lessons": [
    {
      "lessonNo": 1,
      "title": "第一课标题",
      "durationMinutes": 45,
      "deliveryMode": "offline_small_group",
      "groupSize": "4-6",
      "aiRoundsCount": 3,
      "outputSummary": "本课成果描述",
      "contentData": {
        "hero": { ... },
        "sections": [ ... ]
      },
      "attachments": []
    }
  ]
}

响应：
{
  "data": {
    "slug": "new-course-slug",
    "title": "课程包名称",
    "lessonsImported": 1
  }
}
```

**处理逻辑**：
1. 验证 `package` 必填字段 + `lessons` 非空
2. 验证每个 lesson 的 `contentData` 结构符合 v2 规范（含 `hero` + `sections`）
3. 数据库事务：upsert `CoursePackage` + upsert 每个 `Lesson`（`contentData` 直接 `JSON.stringify` 存入）
4. 状态自动设为 `published`
5. 无需 ZIP 打包/解压，无需文件系统操作

**与现有 upload API 的区别**：
- `upload`：接收 ZIP 文件 → 解压 → 提取 JSON → 入库（面向人工操作）
- `publish`：直接接收 JSON → 入库（面向系统间调用，新系统一键发布用）

> **新系统的交接包中必须包含**：
> 1. 定稿课程的数据结构如何映射到上述 `publish` API 的请求体
> 2. 一键发布的 UI 交互流程（按钮位置、确认弹窗、发布状态反馈）
> 3. 发布后是否需要跳转到课程详情页

### 8.6 交接包格式建议

ChatGPT 输出的交接包建议包含：
1. **PRD**（产品需求文档）：功能描述、用户故事、页面流程
2. **数据模型变更**：新增/修改的 Prisma 模型
3. **API 设计**：端点列表、请求/响应格式（特别是 `publish` API 的调用方式）
4. **页面路由**：在 `(app)/` 下的文件结构
5. **组件设计**：关键组件的接口定义
6. **与现有系统的集成点**：哪些现有 API/组件需要修改
7. **发布流程**：新系统如何调用 `publish` API 实现一键发布

---

## 9. 内容接入规范 v2（完整）

新系统生成的课程内容必须符合 v2 规范。无论通过 ZIP 上传还是 JSON 直接入库，`contentData` 的数据结构都必须一致。

详见附件：`docs/product/content-integration-spec-v2.md`

核心要点：
- `contentData` 必须包含 `hero` 和 `sections`
- `sections` 必须包含 7 个固定 section id（core / ai_value / prep / flow / issues / materials / review）
- Block 类型：text / quote / list / template / box / grid / accordion / qa_pair
- `template` 块系统会自动注入复制按钮
- `grid.items` 只能放 `box` 类型
- `accordion` 必须有 `time` 字段
- text 的 content 支持 `**粗体**` 标记
