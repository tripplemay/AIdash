# Next.js 迁移实现方案

> 状态：已确认
> 日期：2026-03-13

## 技术栈

| 项目 | 选型 |
|------|------|
| 框架 | Next.js 15 App Router + TypeScript |
| 样式 | Tailwind CSS v4 + 现有 CSS 变量映射 |
| ORM | Prisma |
| 数据库 | 腾讯云 TDSQL-C PostgreSQL（Serverless）|
| 认证 | NextAuth.js v5 |

## 实现阶段

### Phase 1：项目初始化与基础配置
1. `create-next-app` 初始化，启用 TypeScript、Tailwind、App Router
2. CSS 变量映射进 `tailwind.config.ts`
3. 创建全局组件：`RootLayout`、`Sidebar`、`TopBar`

### Phase 2：数据库 Schema 设计
1. Prisma Schema（User、CoursePackage、Lesson、Attachment）
2. 文档：`docs/tech/database/schema.md`
3. 本地开发用 SQLite，上线前换腾讯云连接串

### Phase 3：页面迁移（静态先行，可与 Phase 2 并行）
1. 登录页 `/app/page.tsx`
2. 课程包列表页 `/app/list/page.tsx`
3. 课程包详情页 `/app/detail/[slug]/page.tsx`
4. 管理员后台页 `/app/admin/page.tsx`
5. 单课原型迁移至 `/public/course-packages/`

### Phase 4：API Routes 开发（依赖 Phase 2）
1. 登录认证 `/app/api/auth/[...nextauth]/route.ts`
2. 课程包列表 `/app/api/packages/route.ts`
3. 课程包详情 `/app/api/packages/[slug]/route.ts`
4. 管理员 CRUD `/app/api/admin/packages/route.ts`

### Phase 5：前后端联通（依赖 Phase 3 + 4）
1. 列表页从 API 读取真实数据
2. 详情页动态加载
3. 登录认证接入，保护鉴权页面
4. 管理员后台接入真实操作

### Phase 6：验收
- 对照 `CLAUDE交接包/docs/08_验收清单.md` 逐项核验

## 依赖关系

```
Phase 1 → Phase 2 → Phase 4 → Phase 5 → Phase 6
        → Phase 3 ↗
```

## 风险

| 风险 | 等级 | 处理 |
|------|------|------|
| 腾讯云 TDSQL-C 需实际开通 | 中 | 本地先用 SQLite |
| NextAuth.js v5 配置差异 | 低 | 参考官方文档 |
| Tailwind v4 CSS 变量映射 | 低 | 优先 CSS 变量，Tailwind 补充 |
