# "问AI"模块技术方案

> 创建时间：2026-03-19
> 状态：待实施

---

## 一、模块定位

"问AI"是系统的一级功能模块，与课程包列表、课程研发平级。提供类 ChatGPT 的自然语言对话体验，支持通用 AI 问答和课程设计专业咨询两种模式。

### 核心能力
- 多轮对话，流式输出（SSE）
- 对话历史持久化，支持查看/继续/删除
- 对话标题 AI 自动生成
- AI 回复支持 Markdown 富文本渲染
- 两种模式：通用模式 / 课程设计模式（注入基线知识）

### 访问权限
所有角色（teacher / rd_manager / admin）均可使用。

---

## 二、界面布局

在现有 AppShell 内，右侧内容区分为左右两栏：

```
┌─ Sidebar ─┬──────────────────────────────────┐
│ 课程包列表  │ ┌─ 对话列表 ─┬─ 对话区域 ───────┐ │
│ 问AI ←    │ │ + 新建对话   │                  │ │
│ 课程研发   │ │ 对话1 通用  │ AI: 你好...       │ │
│ 管理后台   │ │ 对话2 课设  │ 用户: 帮我设计... │ │
│           │ │             │ AI: 好的...       │ │
│           │ │             │                  │ │
│           │ │             │ [输入框] [发送]    │ │
│           │ └─────────────┴──────────────────┘ │
└───────────┴──────────────────────────────────┘
```

### 对话列表（左侧，280px）
- 顶部"+ 新建对话"按钮
- 按最近更新排序的对话列表
- 每条显示：标题 + 模式标签（通用/课设）+ 相对时间
- 选中高亮
- 右键/操作菜单：重命名、删除

### 对话区域（右侧，flex-1）
- 空状态："选择或创建一个对话"
- 消息列表：用户消息右对齐，AI 消息左对齐
- AI 消息支持 Markdown 渲染（标题、列表、代码块、表格等）
- 流式输出时显示打字光标动画
- 底部输入栏：自适应高度 textarea + 发送按钮
- Enter 发送，Shift+Enter 换行
- 流式输出期间禁用输入

### 新建对话弹窗
- 两个模式选择卡片：
  - **通用模式**：通用 AI 助手，可以回答任何问题
  - **课程设计模式**：AI 具备课程设计专业知识，适合课程规划和设计咨询
- 点击即创建对话并进入

---

## 三、数据模型

### ChatConversation（对话）
```prisma
model ChatConversation {
  id        String   @id @default(cuid())
  userId    String
  title     String   @default("新对话")
  mode      String   @default("general") // "general" | "course_design"
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user     User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages ChatMessage[]
}
```

### ChatMessage（消息）
```prisma
model ChatMessage {
  id             String   @id @default(cuid())
  conversationId String
  role           String   // "user" | "assistant"
  content        String   @db.LongText
  createdAt      DateTime @default(now())

  conversation ChatConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
}
```

### 关联修改
- `User` 模型新增 `chatConversations ChatConversation[]` 关系
- `CourseRndAiCallLog.projectId` 改为可选（`String?`），因为对话没有关联项目

---

## 四、AI 服务配置

### 新增动作
在 AI 服务配置页面（`/admin/ai-settings`）新增 `chat` 动作，管理员可以独立选择对话使用的模型。

```
DEFAULT_ACTIONS 新增：
{ key: "chat", label: "AI 对话", type: "text" }
```

### 模型选择建议
- 对话场景推荐使用**响应快、上下文长**的模型
- 和课程生成使用的模型可以不同（对话更注重速度，生成更注重质量）

---

## 五、System Prompt 设计

### 通用模式
```
你是一个智能助手。请用中文回答用户的问题，回答要准确、清晰、有帮助。
支持使用 Markdown 格式（标题、列表、代码块、表格等）来组织回答。
```

### 课程设计模式
```
你是一个智能助手，同时也是 AI 辅助教学课程设计专家。

你具备以下课程设计基线知识，请在回答课程设计相关问题时参考：

# 课程设计基线
{通用基线}
{分层规则矩阵}

对于非课程设计的问题，正常回答即可。
支持使用 Markdown 格式来组织回答。
```

### 模板系统集成
- 优先从 DB 模板加载（`chat_general` / `chat_course_design`）
- DB 无模板时使用硬编码回退
- 课程设计模式通过 `assembleBaselines()` 获取通用基线和矩阵

---

## 六、API 设计

### 6.1 对话列表
```
GET /api/chat/conversations
→ { data: [{ id, title, mode, updatedAt }] }
```

### 6.2 创建对话
```
POST /api/chat/conversations
Body: { mode: "general" | "course_design" }
→ { data: { id, title, mode, createdAt } }
```

### 6.3 对话详情（含消息历史）
```
GET /api/chat/conversations/[id]
→ { data: { id, title, mode, messages: [{ id, role, content, createdAt }] } }
```

### 6.4 重命名对话
```
PATCH /api/chat/conversations/[id]
Body: { title: "新标题" }
→ { data: { id, title } }
```

### 6.5 删除对话
```
DELETE /api/chat/conversations/[id]
→ { data: { id } }
```

### 6.6 发送消息（SSE 流式）
```
POST /api/chat/conversations/[id]/messages
Body: { content: "用户消息" }
→ SSE stream:
    event: delta
    data: { text: "..." }

    event: title
    data: { title: "AI 自动生成的标题" }

    event: done
    data: { tokens: { input: N, output: N }, cost: N }

    event: error
    data: { message: "..." }
```

### SSE 消息处理流程
1. 保存用户消息到 ChatMessage
2. 加载对话完整历史
3. 根据 mode 构建 system prompt
4. 调用 `getProviderAndModel("chat")` 获取模型
5. 组装多轮消息数组发送给 AI
6. 流式返回 AI 响应
7. 响应完成后保存 assistant 消息
8. 记录 AI 调用日志（费用追踪）
9. 如果是第一轮对话，异步生成标题

---

## 七、技术实现要点

### 7.1 chatStream 多轮消息支持

当前 `provider.chatStream()` 只接受 `systemPrompt + userMessage`，内部拼装两条消息。对话场景需要发送完整历史。

**修改方案**：`ChatParams` 新增可选 `messages` 字段：
```typescript
interface ChatParams {
  systemPrompt: string;
  userMessage: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  messages?: Array<{ role: string; content: string }>; // 新增
}
```

当 `messages` 存在时，直接使用它替代 `systemPrompt + userMessage` 的自动拼装。现有调用方不传 `messages`，行为不变，**完全向后兼容**。

### 7.2 上下文长度控制

长对话可能超过模型的上下文窗口。策略：
- 发送消息时统计历史 token 数（粗略估算：中文 1 字 ≈ 2 token）
- 超过阈值时截断最早的消息，只保留最近 N 轮
- system prompt 始终保留（不截断）

### 7.3 自动生成标题

第一轮对话（1 条用户消息 + 1 条 AI 回复）完成后：
1. 用 `provider.chat()` 发送短 prompt："请用 10 个字以内概括以下对话的主题：{用户消息}\n{AI回复}"
2. 更新 `conversation.title`
3. 通过 SSE `title` 事件通知前端更新对话列表
4. 在主流式响应完成后执行，不阻塞用户

### 7.4 Nginx SSE 配置

生产环境 Nginx 需要为 `/api/chat/` 路径配置 SSE：
```nginx
location /api/chat/ {
    proxy_pass http://127.0.0.1:3002;
    proxy_buffering off;
    proxy_read_timeout 180s;
    proxy_set_header Connection '';
    chunked_transfer_encoding off;
}
```

---

## 八、前端组件结构

```
components/chat/
├── ChatPage.tsx          — 根组件，管理对话状态，两栏布局
├── ConversationList.tsx  — 左侧对话列表
├── ChatArea.tsx          — 右侧对话区域（消息列表 + 输入栏）
├── ChatMessage.tsx       — 单条消息渲染（Markdown）
└── NewChatDialog.tsx     — 新建对话弹窗（模式选择）
```

### 依赖
- `react-markdown` — Markdown 渲染
- `remark-gfm` — 支持 GFM（表格、删除线、任务列表等）

---

## 九、费用追踪

复用 `CourseRndAiCallLog` 表（`projectId` 改为可选）：
- `projectId`: null（对话无关联项目）
- `pageKey`: "chat"
- `actionType`: "chat"
- `promptLog`: 完整 system prompt
- `messageLog`: 用户最新消息（不记录完整历史，避免数据膨胀）

管理端"AI 调用记录"页面可以按 `actionType: "chat"` 筛选查看对话的 AI 调用。

---

## 十、实施阶段

| 阶段 | 内容 | 预计文件数 |
|------|------|-----------|
| Phase 1 | 数据库 schema + migration | 1 |
| Phase 2 | 权限配置 | 1 |
| Phase 3 | 系统 Prompt（chat-prompts.ts） | 1 |
| Phase 4 | provider.ts 扩展 + API 路由 | 4 |
| Phase 5 | 前端组件 | 6 |
| Phase 6 | Sidebar 集成 | 1 |
| Phase 7 | CSS 样式 | 1 |
| Phase 8 | npm 依赖 | - |
| Phase 9 | Nginx 配置 | 1 |
| Phase 10 | 测试 | 3 |

总计新增约 **19 个文件**。

---

## 十一、风险与对策

| 风险 | 级别 | 对策 |
|------|------|------|
| chatStream 不支持多轮消息 | 高 | 新增可选 messages 参数，向后兼容 |
| CourseRndAiCallLog.projectId 必填 | 中 | 改为可选，同一次 migration |
| Nginx 未配置 SSE | 中 | deploy-remote.sh 同步更新 |
| 长对话超出上下文窗口 | 中 | 估算 token 数，超限截断历史 |
| 并发发送消息 | 低 | 前端禁用按钮，后端按 createdAt 排序 |
| 对话数据跨用户泄露 | 高 | API 层严格校验 userId 归属 |

---

## 十二、相关文件参考

- SSE 流式模式：`app/api/course-rnd/projects/[id]/lessons/[lessonNo]/regenerate/route.ts`
- 基线拼装：`app/lib/ai/baseline-assembler.ts`
- AI Provider：`app/lib/ai/provider.ts`
- 权限系统：`app/lib/permissions.ts`
- Sidebar：`app/components/Sidebar.tsx`
- 部署脚本：`app/scripts/deploy-remote.sh`
