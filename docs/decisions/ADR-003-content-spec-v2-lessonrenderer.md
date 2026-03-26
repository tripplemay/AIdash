# ADR-003 内容接入规范升级至 v2：JSON 结构化数据 + LessonRenderer

**日期**：2026-03-14（后续迭代中确认）
**状态**：已确认（现行方案）
**决策人**：产品负责人（用户）+ Claude Code
**取代**：ADR-002（iframe + HTML 文件方案）

---

## 背景

ADR-002 确认的 iframe 方案将单课 HTML 文件嵌入系统壳层。随着课程内容结构化需求增加，HTML 文件方式存在以下问题：

- 内容无法被系统检索、统计或动态处理
- 多人协作时 HTML 文件格式不统一，维护成本高
- 无法利用 React 组件能力实现交互增强（一键复制、TOC 导航等）
- 上传流程需要手动管理静态文件路径，易出错

## 决策

**废弃 iframe + HTML 文件方案，采用 v2 结构化 JSON + LessonRenderer 方案：**

1. 课程内容以结构化 JSON 形式定义（`sections` 数组，每个 section 包含 `blocks`）
2. 上传 zip 包时，`POST /api/admin/upload` 解析 `lesson.json` 中的 `sections` 字段，序列化后存入 `Lesson.contentData`（`LongText`）
3. `/lesson/[slug]/[lessonId]` 页面由 `LessonRenderer` 服务端组件读取 `contentData` 并渲染为 React 组件树
4. 不再依赖 `contentPath`（HTML 文件路径），`contentPath` 字段保留但不使用

## 内容 Block 类型

| 类型 | 用途 |
|------|------|
| `text` | 普通段落文本 |
| `quote` | 引用块 |
| `list` | 有序/无序列表 |
| `template` | AI 对话模板（含一键复制） |
| `box` | 高亮信息框（default/note/success/danger） |
| `grid` | 多列网格布局 |
| `accordion` | 折叠展开区域 |
| `qa_pair` | 问答对 |

## 影响

| 文件 | 变更类型 |
|------|--------|
| `app/prisma/schema.prisma` | 新增 `Lesson.contentData String? @db.LongText` |
| `app/types/lesson-content.ts` | 新增 — v2 TypeScript 类型定义 |
| `app/components/lesson/LessonRenderer.tsx` | 新增 — 服务端渲染组件 |
| `app/components/lesson/CopyButton.tsx` | 新增 — template block 复制按钮 |
| `app/components/lesson/LessonToc.tsx` | 新增 — TOC 导航客户端组件 |
| `app/app/lesson/[slug]/[lessonId]/page.tsx` | 修改 — 移除 iframe，改用 LessonRenderer |
| `app/app/api/admin/upload/route.ts` | 修改 — 强制要求 sections 字段，存入 contentData |
| `app/lib/lesson-utils.ts` | 新增 — `isLessonAccessible()` 检查 contentPath || contentData |

## 与 v1 的关系

v1 接入规范（`index.html + assets/ + attachments/ + lesson.json`）已废弃。现行 v2 课程包 ZIP 不再需要 `index.html`，`lesson.json` 必须包含 `sections` 字段。详见 `docs/product/content-integration-spec-v2.md`。

## 冻结约束更新

原约束（ADR-002）：`主内容区用 <iframe> 加载单课 HTML`

新约束（本 ADR 起生效）：`主内容区由 LessonRenderer 渲染 Lesson.contentData（v2 JSON），不再使用 iframe`
