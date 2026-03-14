# ADR-002 单课页展示方式：从 window.open 迁移至 iframe 嵌入

**日期**：2026-03-14
**状态**：已确认
**决策人**：产品负责人（用户）+ Claude Code

---

## 背景

阶段二完成后，"进入本课"按钮通过 `window.open(contentPath, "_blank")` 在新标签页直接打开单课 HTML 文件。该方案满足接入规范 v1 的独立性要求，但存在以下问题：

- 进入单课后，浏览器标签页脱离主系统环境，缺少 Sidebar / TopBar 导航
- 用户无法从单课页直接返回课程包详情页或课程包列表页，主链路中断
- 交互体验与系统其他模块（列表页、详情页）不一致

## 决策

**采用 iframe 嵌入方案**，具体实现：

1. 新增 Next.js 路由 `/lesson/[slug]/[lessonId]`（服务端组件，鉴权保护）
2. 该页面渲染系统 `Sidebar`（`variant="lesson"`）+ 顶部导航栏（含返回链接 + 打印按钮）
3. 单课 HTML 内容通过 `<iframe src={lesson.contentPath} sandbox="allow-scripts allow-same-origin allow-modals">` 在主内容区加载
4. `EnterLessonButton` 从 `window.open` 改为 `router.push(/lesson/slug/lessonId)`

## 与接入规范 v1 的关系

经分析，此变更**不违反**接入规范 v1：

- 规范约束的是**课程包内容的打包方式**（`index.html + assets/ + attachments/ + lesson.json` 结构），而非内容的展示容器
- 单课 HTML 依然完全独立、可脱离系统直接运行，规范核心约束满足
- 规范中"浏览器无关"原则是指内容包本身，不限制系统侧的渲染方式

## 影响

| 文件 | 变更类型 |
|------|--------|
| `app/app/lesson/[slug]/[lessonId]/page.tsx` | 新增 — 单课页路由 |
| `app/components/PrintLessonButton.tsx` | 新增 — 打印按钮客户端组件 |
| `app/components/EnterLessonButton.tsx` | 修改 — props 及行为变更 |
| `app/components/Sidebar.tsx` | 修改 — 新增 lesson 变体 |
| `app/app/detail/[slug]/page.tsx` | 修改 — 调整 EnterLessonButton 用法 |
| `CLAUDE.md` | 修改 — 更新冻结约束 #2 |

## 冻结约束更新

原约束：`"进入本课"行为：必须用 window.open 新标签打开独立 HTML，不得用 iframe 包壳或动态渲染`

新约束（2026-03-14 起生效）：`通过 Next.js router 跳转至 /lesson/[slug]/[lessonId] 页面，主内容区用 <iframe> 加载单课 HTML；单课内容本身仍须符合接入规范 v1，可脱离系统独立运行`
