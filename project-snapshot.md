# 项目快照

## 一句话描述
AI Dash — 面向教师/教学主管/管理员的智能课程系统，集成 AI 驱动的课程设计、教师授课管理、智能对话助手三大核心模块。

## 技术栈
- **框架**: Next.js 16 (App Router) + React 19
- **语言**: TypeScript
- **数据库**: MySQL + Prisma 6 ORM（21 个模型）
- **认证**: NextAuth.js v5
- **样式**: 纯 CSS 设计系统（BEM-lite），无 Tailwind
- **AI 集成**: OpenAI 兼容协议，支持 22+ 服务商（火山/阿里/智谱/DeepSeek/OpenAI/Gemini 等）
- **部署**: GitHub Actions → rsync → PM2 + Nginx（腾讯云）
- **测试**: Jest，94% 覆盖率，74 个测试文件
- **主要依赖**: zod、react-markdown、adm-zip、socks-proxy-agent、bcryptjs、lucide-react

## 目录结构说明
```
app/
├── app/                  # Next.js App Router 路由
│   ├── (app)/            # 认证保护的 Route Group
│   │   ├── list/         # 课程包列表
│   │   ├── detail/       # 课程包详情
│   │   ├── lesson/       # 单课渲染（LessonRenderer）
│   │   ├── course-rnd/   # 课程研发模块（AI 工作台）
│   │   ├── chat/         # 问AI对话
│   │   ├── guide/        # 使用指南
│   │   ├── profile/      # 个人资料
│   │   └── admin/        # 管理后台（6 个子页面）
│   ├── api/              # API Routes（53 个）
│   └── register/         # 邀请码注册
├── components/           # React 组件（20 个）
├── lib/                  # 业务逻辑
│   ├── ai/               # AI 服务层（provider/pricing/prompt/baseline/chat）
│   ├── permissions.ts    # 角色权限矩阵
│   ├── auth-utils.ts     # 认证守卫
│   ├── crypto.ts         # AES-256-GCM 加密
│   └── proxy-fetch.ts    # SOCKS5/HTTP 代理
├── prisma/               # Schema + Migrations + Seeds
├── __tests__/            # 74 个测试文件
├── types/                # TypeScript 类型定义
└── public/               # 静态资源
```

## 已完成的核心功能

### 教师授课系统
- 用户认证（登录 + 邀请码注册 + 三角色权限）
- 课程包列表/详情/筛选树
- 单课渲染（v2 JSON → LessonRenderer）
- 课程包上传（ZIP 解压 + upsert）
- 个人资料管理（姓名/邮箱/手机/部门/头像）

### 课程研发模块（AI 驱动）
- 研发进度看板（手风琴布局）
- 方向确认 + 框架生成/修订（SSE 流式）
- 逐课生成 + 批量修订 + AI 审核
- 图片生成（Gemini/DALL-E/GPT-5-image）
- 定稿 + 一键发布到课程库
- AI 工具执行路径（tool_plan）
- 费用追踪面板

### 问AI对话模块
- 多轮对话 + SSE 流式输出
- 通用模式 / 课程设计模式（基线注入）
- 联网搜索（Tavily + function calling）
- Markdown 富文本渲染 + 引用标注
- 对话历史持久化 + 标题自动生成

### 管理后台
- 课程包管理 + 用户管理 + 部门管理 + 邀请码管理
- AI 服务配置（提供商 + 动作→模型映射 + 代理）
- 基线管理 + Prompt 模板管理 + 预设管理（版本历史 + diff + 回滚）
- AI 调用审计日志 + 操作日志
- Export API（供 ChatGPT GPTs 调用）
- 外部服务密钥管理（Tavily 等）
- 使用指南（教师版/主管版）

### 基础设施
- 纯 CSS 设计系统（浅蓝紫雾光科技感）
- SOCKS5/HTTP 代理支持
- AES-256-GCM API Key 加密
- Prompt 模板引擎（28 个变量 + 基线维度拼装）
- GitHub Actions CI/CD + PM2 部署

## 已知问题 / 技术债
- schema.prisma 有未提交的修改（待确认内容）
- 头像图片（60 个 boy/girl PNG）已被删除但未提交
- 多个 ADR 文档（ADR-006 ~ ADR-022）为新增未跟踪文件
- `features.json` 文件存在但内容待更新
- `docs/PROJECT_STATUS.md` 有未提交修改

## 构建 & 运行命令
```bash
cd app/
npm run dev           # 开发服务器 http://localhost:3000
npm run build         # 生产构建
npm run typecheck     # TypeScript 类型检查
npm test              # Jest 运行全部测试
npm run test:coverage # Jest + 覆盖率报告
npx prisma migrate dev --name xxx  # 创建 migration
npx prisma studio     # GUI 数据库管理
```

## 项目成熟度
- **13 个阶段全部完成**
- **21 个数据库模型**，53 个 API 路由
- **94% 测试覆盖率**，74 个测试文件
- 完善的文档体系（PRD / ADR / 技术方案 / 使用指南）
- 生产环境已部署运行
