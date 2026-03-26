# API 路由总览

> 最后更新：2026-03-19
> 框架：Next.js App Router Route Handlers
> 认证：NextAuth.js v5（所有 API 默认要求登录，除特别标注外）
> 权限：`requireRole()` + `forbiddenResponse()` 守卫（`lib/auth-utils.ts`）

---

## 概览

| 模块 | 路由数 | 说明 |
|------|--------|------|
| 认证 | 1 | NextAuth 处理器 |
| 课程包（教师端） | 2 | 列表 + 详情 |
| 课程研发 | 13 | 项目管理 + AI 生成 + 发布 |
| 问 AI 对话 | 4 | 对话管理 + 消息发送 |
| 管理后台 | 30 | 课程包/用户/AI/Prompt/日志 |
| 静态资源 | 3 | 文件服务 + 导航 + 筛选 |
| **合计** | **53** | |

---

## 一、认证

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET/POST | `/api/auth/[...nextauth]` | NextAuth 登录/登出/Session | 无 |

---

## 二、课程包（教师端）

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/packages` | 已发布课程包列表（支持搜索筛选） | 已登录 |
| GET | `/api/packages/[slug]` | 课程包详情（含课次列表） | 已登录 |

---

## 三、课程研发

> SSE 标记的路由使用 Server-Sent Events 流式响应

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/course-rnd/projects` | 当前用户的研发项目列表（最近 20 个） | 已登录 |
| GET | `/api/course-rnd/projects/[id]` | 项目详情 + 版本历史 | 已登录 |
| GET | `/api/course-rnd/form-options` | 立项表单下拉选项（年龄/难度/组织/产出/预设） | 已登录 |
| POST | `/api/course-rnd/generate-title` | AI 生成项目标题 | 已登录 |
| POST | `/api/course-rnd/projects/[id]/generate-framework` | AI 生成课程框架 **[SSE]** | 已登录 |
| POST | `/api/course-rnd/projects/[id]/revise-framework` | AI 修订课程框架 **[SSE]** | 已登录 |
| POST | `/api/course-rnd/projects/[id]/generate-cover` | AI 生成课程包封面图 | 已登录 |
| POST | `/api/course-rnd/projects/[id]/validate` | AI 审核课次（10 项基线校验）**[SSE]** | 已登录 |
| POST | `/api/course-rnd/projects/[id]/finalize` | 定稿（含课次完整性检查） | 已登录 |
| POST | `/api/course-rnd/projects/[id]/save-version` | 保存当前方案版本快照 | 已登录 |
| POST | `/api/course-rnd/projects/[id]/lessons/[lessonNo]/regenerate` | 生成/重新生成单课 **[SSE]** | 已登录 |
| POST | `/api/course-rnd/projects/[id]/lessons/[lessonNo]/revise` | 修订单课（增量合并） | 已登录 |
| POST | `/api/course-rnd/projects/[id]/lessons/[lessonNo]/regenerate-image` | 重新生成课次图片 | 已登录 |

---

## 四、问 AI 对话

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/chat/conversations` | 当前用户对话列表 | 已登录 |
| POST | `/api/chat/conversations` | 新建对话（general / course_design） | 已登录 |
| GET | `/api/chat/conversations/[id]` | 对话详情 + 全部消息 | 已登录 |
| POST | `/api/chat/conversations/[id]/messages` | 发送消息 **[SSE]** | 已登录 |

---

## 五、管理后台 — 课程包

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/admin/packages` | 全部课程包列表（含草稿/下线） | admin, rd_manager |
| POST | `/api/admin/packages` | 创建课程包 | admin, rd_manager |
| PATCH | `/api/admin/packages/[slug]` | 更新课程包元信息/状态 | admin, rd_manager |
| POST | `/api/admin/upload` | 上传 ZIP 课程包（解压 + upsert） | admin, rd_manager |
| POST | `/api/admin/publish` | 一键发布（研发项目 → 课程库） | admin, rd_manager |

---

## 六、管理后台 — 用户

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/admin/users` | 用户列表（排除密码字段） | admin |
| POST | `/api/admin/users` | 新建用户（bcrypt 哈希密码） | admin |
| PATCH | `/api/admin/users/[id]` | 更新用户信息 / 重置密码 | admin |

> 删除用户也通过 PATCH/DELETE 同路由处理，禁删自身。

---

## 七、管理后台 — AI 服务配置

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/admin/ai-providers` | 提供商列表（Key 掩码显示） | 已登录 |
| POST | `/api/admin/ai-providers` | 新增提供商 | admin |
| PATCH | `/api/admin/ai-providers/[id]` | 编辑提供商配置 | admin |
| POST | `/api/admin/ai-providers/[id]/test` | 测试提供商连接 | admin |
| GET | `/api/admin/ai-providers/[id]/models` | 从提供商 API 拉取模型列表 | 已登录 |
| GET | `/api/admin/ai-actions` | 动作→模型映射列表 | 已登录 |
| POST | `/api/admin/ai-actions` | 创建/更新动作映射（含模型测试 + 价格获取） | admin |
| GET | `/api/admin/ai-usage` | AI 用量统计（按模型/动作/时间范围） | 已登录 |
| GET | `/api/admin/refresh-pricing` | 获取当前价格状态（USD→CNY 汇率） | 已登录 |
| POST | `/api/admin/refresh-pricing` | 手动刷新价格 | admin |

---

## 八、管理后台 — Prompt 配置

### 基线文档

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/admin/baselines` | 全部基线列表 | 已登录 |
| GET | `/api/admin/baselines/[id]` | 单条基线详情 | 已登录 |
| PUT | `/api/admin/baselines/[id]` | 更新基线内容（自动创建版本） | admin |
| GET | `/api/admin/baselines/[id]/versions` | 版本历史 | 已登录 |
| GET | `/api/admin/baselines/[id]/diff?v1=X&v2=Y` | 逐行 diff 对比 | 已登录 |
| POST | `/api/admin/baselines/[id]/rollback` | 回滚到指定版本 | admin |

### Prompt 模板

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/admin/prompt-templates` | 全部模板列表 | 已登录 |
| GET | `/api/admin/prompt-templates/[actionKey]` | 按动作获取模板 | 已登录 |
| PUT | `/api/admin/prompt-templates/[actionKey]` | 更新模板（自动创建版本） | admin |
| GET | `/api/admin/prompt-templates/[actionKey]/versions` | 版本历史 | 已登录 |
| GET | `/api/admin/prompt-templates/[actionKey]/diff?v1=X&v2=Y` | 逐行 diff 对比 | 已登录 |
| POST | `/api/admin/prompt-templates/[actionKey]/rollback` | 回滚到指定版本 | admin |
| GET | `/api/admin/prompt-templates/variables` | 28 个预定义模板变量列表 | 已登录 |

### 预设

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/admin/presets?category=X` | 预设列表（可按分类筛选） | 已登录 |
| POST | `/api/admin/presets` | 新增预设 | admin |
| PUT | `/api/admin/presets/[id]` | 编辑预设 | admin |
| DELETE | `/api/admin/presets/[id]` | 删除预设 | admin |
| PUT | `/api/admin/presets/reorder` | 预设排序（事务 + 锁序一致防死锁） | admin |

---

## 九、管理后台 — 日志

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/admin/ai-logs` | AI 调用记录（分页 + 筛选） | admin, rd_manager（仅自己） |
| GET | `/api/admin/ai-logs/[id]` | 单条日志详情（含完整 prompt） | admin, rd_manager（仅自己） |
| GET | `/api/admin/operation-logs` | 操作审计日志 | admin（全部）, 其他（仅自己） |

---

## 十、静态资源与辅助

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/course-files/[...path]` | 课程包静态文件服务（HTML/CSS/JS/图片等） | 无 |
| GET | `/api/ai-images/[...path]` | AI 生成图片服务（含路径穿越防护） | 无 |
| GET | `/api/lesson-nav?lessonId=X` | 课次导航信息（课程包 + 课次列表） | 无 |
| GET | `/api/filter-tree` | 筛选树（按年龄/难度分组的已发布课程包） | 无 |

---

## 通用约定

### 响应格式

**成功**：
```json
{ "data": { ... } }
```

**错误**：
```json
{ "error": "错误描述" }
```

**分页**（AI 日志等）：
```json
{
  "data": { "logs": [...], "total": 100, "page": 1, "pageSize": 20 }
}
```

### SSE 流式响应

SSE 路由返回 `text/event-stream`，格式为：
```
data: {"type":"progress","message":"正在生成第3课..."}

data: {"type":"content","lesson":{...}}

data: {"type":"done"}
```

Nginx 配置要求（`/api/course-rnd/` 路径）：
- `proxy_buffering off`
- `proxy_read_timeout 180s`
- `X-Accel-Buffering: no`

### 认证守卫

```typescript
// lib/auth-utils.ts
const session = await auth();
if (!session) return unauthorizedResponse();

// 角色守卫
requireRole(session, ["admin", "rd_manager"]);
```

### 权限矩阵

权限定义在 `lib/permissions.ts`，API 层通过 `requireRole()` 执行。部分 API 对不同角色返回不同数据范围（如 rd_manager 仅返回自己的项目/日志）。
