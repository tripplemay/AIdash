# 管理员模块开发计划

> 版本：v1.0
> 日期：2026-03-14
> 状态：✅ v1 已完成
> 依赖需求文档：[admin-module-requirements.md](../product/admin-module-requirements.md)
> ⚠️ 本文档为 v1 开发计划，仅覆盖 Phase 1-4（课程包管理 + 用户管理）。v2 扩展功能的需求见 [admin-module-requirements-v2.md](../product/admin-module-requirements-v2.md)。

---

## 一、技术栈

| 层 | 技术 |
|----|------|
| 框架 | Next.js App Router + TypeScript |
| 数据库 ORM | Prisma 6 + MySQL |
| 认证 | NextAuth v5，admin 角色鉴权 |
| 文件解压 | `adm-zip`（纯 JS，无原生依赖） |
| 密码哈希 | `bcryptjs`（项目已有） |
| 文件系统 | Node.js 内置 `node:fs`、`node:path` |

---

## 二、开发分阶段计划

### Phase 1：数据库变更

**目标**：为 Lesson 表添加联合唯一约束，使 upsert 可通过 `(packageId, lessonNo)` 定位记录。

#### 任务

**P1.1 修改 `app/prisma/schema.prisma`**

在 Lesson 模型末尾添加：

```prisma
@@unique([packageId, lessonNo])
```

**P1.2 执行迁移**

```bash
cd app
npx prisma migrate dev --name add-lesson-package-unique-constraint
npx prisma generate
```

---

### Phase 2：课程包上传 API

**目标**：实现 zip 上传、解压、数据库 upsert 的完整链路。

#### 需要安装的依赖

```bash
cd app
npm install adm-zip
npm install --save-dev @types/adm-zip
```

#### 任务

**P2.1 新建 `app/app/api/admin/upload/route.ts`**

职责与实现要点：

- `POST` handler，使用 `request.formData()` 接收文件
- 校验：文件存在、扩展名为 `.zip`、大小 ≤ 50MB
- `file.arrayBuffer() → Buffer.from(...)` 转换为 Buffer
- `new AdmZip(buffer)` 解析 zip
- 读取根目录条目，取根目录名作为 slug
- slug 正则校验：`/^[a-z0-9-]+$/`（防路径穿越）
- 读取 `{slug}/package.json` 并 JSON.parse，校验必填字段
- 确定目标路径：`path.join(process.cwd(), 'public', 'course-packages', slug)`
- `zip.extractAllTo(destPath, true)` 解压
- 开启 `prisma.$transaction(async (tx) => { ... })`
  - upsert CoursePackage（where: `{ slug }`，update 含 `status: "published"`）
  - 遍历 `package.json.lessons`：
    - 读取 `{slug}/lessons/{lesson_dir}/lesson.json`（从 zip entries 读取，不依赖已解压文件）
    - upsert Lesson（where: `{ packageId_lessonNo: { packageId, lessonNo } }`）
    - `tx.attachment.deleteMany({ where: { lessonId } })`
    - `tx.attachment.createMany({ data: [...] })`
- 事务失败时 catch：`fs.rmSync(destPath, { recursive: true, force: true })`，返回 500
- 成功返回 201 + `{ data: { slug, title, lessonsImported, attachmentsImported } }`

**P2.2 contentPath 路径规则**

Lesson 的 `contentPath` 字段存储相对于 `/public` 的路径，格式为：

```
/course-packages/{slug}/lessons/{lesson_dir}/index.html
```

**P2.3 错误响应格式**

```json
{ "error": "zip 格式错误：缺少 package.json" }
{ "error": "slug 格式非法" }
{ "error": "文件大小超出限制（最大 50MB）" }
{ "error": "数据库写入失败，已回滚文件" }
```

---

### Phase 3：后台页面重构

**目标**：重构 `/admin` 为多页面管理后台，接入真实数据。

#### 文件结构

```
app/app/admin/
├── page.tsx                   [修改] → redirect to /admin/packages
├── packages/
│   └── page.tsx               [新建] 课程包管理 Server Component
└── users/
    └── page.tsx               [新建] 用户管理 Server Component

app/components/admin/
├── AdminPackageList.tsx        [新建] 课程包表格，Client Component
├── UploadModal.tsx             [新建] zip 上传弹窗，Client Component
├── AdminUserList.tsx           [新建] 用户表格，Client Component
└── UserFormModal.tsx           [新建] 新建/编辑用户弹窗，Client Component
```

---

### Phase 4：用户管理 API

**目标**：提供用户 CRUD 完整 API，密码安全处理。

#### 任务

**P4.1 新建 `app/app/api/admin/users/route.ts`**

```
GET  → prisma.user.findMany（select 排除 password）→ 返回列表
POST → 校验必填字段 → bcrypt.hash(password, 12) → prisma.user.create → 返回 201
     → username 已存在时捕获 Prisma P2002 唯一约束错误，返回 400 + "用户名已存在"
```

**P4.2 新建 `app/app/api/admin/users/[id]/route.ts`**

```
PATCH → 允许更新 name、role
      → 若 body 含 newPassword（长度 ≥ 6）→ bcrypt.hash(newPassword, 12) → 更新 password
      → prisma.user.update → 返回更新后数据（排除 password）

DELETE → 检查 id === session.user.id → 相同则返回 400 "不可删除自身账号"
       → prisma.user.delete → 返回 { success: true }
```

---

## 三、受影响文件汇总

### 修改现有文件

| 文件 | 修改内容 |
|------|----------|
| `app/prisma/schema.prisma` | Lesson 增加 `@@unique([packageId, lessonNo])` |
| `app/components/Sidebar.tsx` | 补充 `variant="admin"` nav 分支 |
| `app/app/admin/page.tsx` | 改为权限校验 + redirect |

### 新建文件

| 文件 | 说明 |
|------|------|
| `app/app/api/admin/upload/route.ts` | zip 上传处理 API |
| `app/app/api/admin/users/route.ts` | 用户列表 + 新建 API |
| `app/app/api/admin/users/[id]/route.ts` | 用户更新 + 删除 API |
| `app/app/admin/packages/page.tsx` | 课程包管理页 |
| `app/app/admin/users/page.tsx` | 用户管理页 |
| `app/components/admin/AdminPackageList.tsx` | 课程包表格组件 |
| `app/components/admin/UploadModal.tsx` | zip 上传弹窗组件 |
| `app/components/admin/AdminUserList.tsx` | 用户表格组件 |
| `app/components/admin/UserFormModal.tsx` | 用户表单弹窗组件 |

---

## 四、开发顺序建议

```
Phase 1（DB）→ Phase 4（Users API）→ Phase 2（Upload API）→ Phase 3（页面）
```

后端先于前端，API 可独立测试验证后再对接页面。Phase 1 是 Phase 2 upload upsert 的硬前置条件。

---

## 五、需要注意的约束

1. **文件系统限制**：upload API 依赖服务器本地文件系统写入，仅适用于 pm2 自建服务器部署，不适用于 Vercel 等 serverless 平台。
2. **Next.js FormData 限制**：App Router route handler 使用 `request.formData()` 读取上传文件，文件将完整读入内存，50MB 限制需在应用层手动检查 `file.size`。
3. **bcryptjs 已存在**：`package.json` 已有 `bcryptjs` 依赖，无需重新安装。
4. **slug 安全**：解压目标路径由 zip 根目录名决定，必须严格正则过滤后再拼接路径，防止路径穿越。
