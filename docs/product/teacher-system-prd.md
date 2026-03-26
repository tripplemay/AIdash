# PRD｜AI Dash 教师授课系统

> 版本：v1.0
> 日期：2026-03-19
> 状态：✅ 已实现
> 目标用户：教师（teacher 角色）

---

## 1. 背景与目标

### 1.1 背景

AI Dash 教师授课系统是面向一线教师的课程浏览与授课平台。教师需要一个简洁的界面来发现课程包、了解课程内容、进入单课进行授课准备和课堂教学。

### 1.2 目标

1. **快速发现**：教师能通过年龄段和难度等级筛选，快速找到适合的课程包
2. **充分了解**：详情页展示课程包完整信息和课次列表，帮助教师做授课准备
3. **沉浸授课**：单课页提供结构化内容渲染，目录导航、一键复制、打印等辅助功能
4. **无缝导航**：Sidebar + TopBar 常驻，页面切换不丢失上下文

### 1.3 设计原则

- **页面少**：登录 → 列表 → 详情 → 单课，四个页面覆盖全部教学场景
- **信息分层**：列表页概览 → 详情页了解 → 单课页深入
- **教师友好**：大字号、清晰层级、一键操作
- **视觉统一**：浅蓝紫雾光科技感，所有页面共享 CSS 设计系统

---

## 2. 用户与权限

| 角色 | 标识 | 访问范围 |
|------|------|---------|
| 教师 | `teacher` | 登录 → 课程包列表 → 详情 → 单课 → 问 AI |
| 教学主管 | `rd_manager` | 教师权限 + 课程研发 + 课程包管理 |
| 管理员 | `admin` | 全部权限 |

所有角色均可使用教师授课系统，权限差异体现在 Sidebar 菜单的可见性。

---

## 3. 主链路

```
登录页 (/) → 课程包列表 (/list) → 课程包详情 (/detail/:slug) → 单课页 (/lesson/:slug/:lessonId)
```

> 冻结约束：主链路不得增加层级。

---

## 4. 页面需求

### 4.1 登录页（`/`）

**布局**：单栏居中卡片

**元素**：
- 品牌 Logo + 系统名称"智能课程系统"
- 账号输入框
- 密码输入框
- 登录按钮（含 loading 状态"登录中..."）
- 错误提示："账号或密码错误，请重试"
- 企业微信 / 微信登录按钮（预留，当前禁用）

**行为**：
- 两个字段均为必填
- 登录成功 → 跳转 `/list`
- 登录失败 → 显示错误提示

**认证**：NextAuth.js v5 Credentials Provider，bcrypt 密码比对

---

### 4.2 课程包列表页（`/list`）

**布局**：AppShell（Sidebar + TopBar）+ 课程包卡片网格

**TopBar**：
- 标题："课程包列表"
- 右侧：用户头像下拉菜单

**Sidebar**：
- 课程包列表入口（当前页高亮）
- **筛选树**（展开式）：
  - 全部课程
  - 按年龄段分组（A1 ~ A4，显示基线完整标签如"A2｜8-9岁 基础段"）
    - 每个年龄段下按难度等级分组
  - 筛选状态缓存在 localStorage，切页后保持

**课程包卡片**：
- 封面图（有图显示图，无图显示渐变色占位）
- 右上角标签：年龄段 + 难度
- 标题
- 元信息：适用年龄、第一课标题、本课成果
- 底部标签：难度 · 时长 · 人数 · AI 回合 · "已按规范接入"
- "进入详情"按钮 → 跳转 `/detail/:slug`

**筛选**：
- URL 参数：`?q=搜索词&ageRange=A2&level=中级`
- 搜索：按课程包标题模糊匹配
- 年龄段 / 难度：精确匹配

**空状态**：无已发布课程包时显示"暂无已发布的课程包"

**数据来源**：服务端 Prisma 查询，仅返回 `status: "published"` 的课程包

---

### 4.3 课程包详情页（`/detail/:slug`）

**布局**：AppShell + 详情面板

**TopBar**：
- 面包屑："← 返回课程包列表"（链接到 `/list`）
- 标题：课程包名称

**内容区**：

**课程包信息区**：
- 封面大图（或渐变占位）
- 课程包标题（h1）
- 简介（summary）
- 元数据网格（4 项）：
  - 适用年龄段（格式化显示，如"A2｜8-9岁"）
  - 级别
  - 状态（已发布 / 草稿）
  - 接入方式："标准单课成品包"

**课次列表区**：
- 标题："课次列表"
- 副标题："点击「进入本课」直接打开已确认原型内容"
- 每条课次展示：
  - 课次编号："第 N 课"
  - 课次标题
  - 标签：时长（N 分钟）、状态（已按规范接入）
  - 元信息：人数 + 模式、AI 回合数
  - 本课成果
  - 操作按钮：
    - 有内容（contentData 或 contentPath）→ "进入本课"（跳转 `/lesson/:slug/:lessonId`）
    - 无内容 → "未接入"（灰色，不可点击）

**数据来源**：`prisma.coursePackage.findUnique({ where: { slug }, include: { lessons } })`

---

### 4.4 单课页（`/lesson/:slug/:lessonId`）

**布局**：自定义 TopBar + Sidebar（含课次导航）+ 课程内容渲染

**自定义 TopBar**（非通用 TopBar，`isLessonPage` 时隐藏通用 TopBar）：
- 左侧："← 返回课程包" + 课次标题
- 右侧："打印本课"按钮
- 顶部：阅读进度条（随滚动实时更新）

**Sidebar 课次导航**：
- 底部区域显示当前课程包的所有课次列表
- 格式："第 N 课 | 标题"
- 当前课次高亮
- 点击跳转到对应课次

**内容渲染**（LessonRenderer）：

**Hero 区域**：
- 标签（tags 数组）
- 课次标题 + 副标题
- 两张信息卡："一句话目标" + "唯一核心成果"
- 可选 hero 图片

**正文区域**（两栏布局）：
- 左侧：**目录导航**（sticky）
  - 列出所有 section 标题
  - IntersectionObserver 自动高亮当前可见 section
  - 点击跳转到对应 section
- 右侧：**section 序列**
  - 每个 section 包含标题 + blocks 数组

**支持的 Block 类型**（8 种）：

| Block 类型 | 渲染方式 |
|-----------|---------|
| `text` | 段落文本，支持 `**加粗**` |
| `quote` | 引用块（左边框装饰） |
| `list` | 有序 / 无序列表 |
| `template` | AI 对话模板 + 一键复制按钮 |
| `box` | 信息框（4 种变体：default / note / success / danger） |
| `grid` | 多列网格（2 或 3 列），每列为 box |
| `accordion` | 折叠展开区域（默认展开），含时间标签 |
| `qa_pair` | 问答对 |

**打印支持**：
- `window.print()` 触发
- `@media print` 样式：隐藏导航/进度条/复制按钮，单列白底
- 折叠区域打印前自动展开

**数据来源**：
- 课次内容：`prisma.lesson.findUnique({ where: { id }, select: { contentData } })`
- `contentData` 为 JSON 字符串，解析为 `LessonContent` 类型
- 课次导航：`GET /api/lesson-nav?lessonId=X`

---

## 5. 持久化 AppShell 架构

`(app)/layout.tsx` 渲染 AppShell，子路由切换时**不卸载不重建**：

```
AppShell (client component, 常驻)
├── ToastProvider（全局轻提示）
├── TopBarProvider（页面动态注入标题/面包屑/操作按钮）
├── Sidebar（自治：内部 fetch 筛选树/课次导航）
└── <main>
    ├── TopBar（← 返回 | 标题 + 操作按钮 + 用户头像）
    └── {children}（页面内容）
```

**TopBar 注入模式**：各页面通过 `<SetTopBar breadcrumb="..." title="..." actions={...} />` 注入，卸载时自动清除。

**课次页特殊处理**：`isLessonPage` 时隐藏通用 TopBar，由页面自行渲染 `lesson-topbar`。

---

## 6. 内容接入规范（v2）

课程内容以结构化 JSON 形式存储在 `Lesson.contentData` 字段中。

**JSON 结构**：
```typescript
interface LessonContent {
  hero: {
    tags: string[];       // 标签数组
    title: string;        // 课次标题
    subtitle: string;     // 副标题
    goal: string;         // 一句话目标
    outcome: string;      // 唯一核心成果
    imageUrl?: string;    // hero 图片
  };
  sections: Array<{
    id: string;           // section 标识
    title: string;        // section 标题
    blocks: Block[];      // 内容块数组
  }>;
}
```

详细规范见 [content-integration-spec-v2.md](content-integration-spec-v2.md)。

---

## 7. 默认账号与样板数据

| 账号 | 密码 | 角色 | 说明 |
|------|------|------|------|
| teacher01 | teacher123 | teacher | 教师账号 |
| rd01 | rd123456 | rd_manager | 教学主管 |
| admin | admin123 | admin | 管理员 |

**样板课程包**：《我的神奇搭档课程包》— 系统第一个课程包，内容不可替换（冻结约束）。

---

## 8. 视觉风格

- **基调**：浅蓝紫雾光科技感
- **主色**：`#7e95ff`（品牌蓝）
- **背景**：`#eef3ff`（淡蓝）
- **文字**：`#3a4d7a`（深蓝灰）
- **卡片**：glass morphism（半透明白底 + 模糊效果）
- **间距**：8px 网格基准
- **CSS 系统**：纯 CSS 变量 + BEM-lite 命名，无 Tailwind

详细视觉规范见 `docs/design/guidelines/`。

---

## 9. 冻结约束

1. 主链路不得增加层级：登录 → 列表 → 详情 → 单课
2. "进入本课"通过 Next.js router 跳转至 `/lesson/[slug]/[lessonId]`，由 LessonRenderer 渲染 v2 JSON
3. 样板课《我的神奇搭档课程包》内容不得替换
4. 视觉风格不得偏移：浅蓝紫雾光科技感
5. 导航结构已锁定：左侧 Sidebar 方案
