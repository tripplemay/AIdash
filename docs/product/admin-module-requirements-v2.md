# 管理员模块需求文档（v2 扩展）

> 版本：v2.0
> 日期：2026-03-19
> 状态：✅ 已完成
> 前置文档：[admin-module-requirements.md](admin-module-requirements.md)（v1，课程包管理 + 用户管理）

---

## 一、背景

v1 管理后台仅覆盖课程包管理和用户管理。随着课程研发模块上线（AI 驱动的课程生成），系统新增了大量 AI 相关配置和运维需求：

- 管理员需要配置和切换不同的 AI 服务提供商和模型
- 管理员需要在线编辑 AI 生成课程时使用的基线文档和 Prompt 模板
- 系统需要完整的 AI 调用审计日志，追踪成本和 Prompt 质量
- 系统需要操作日志，记录所有管理操作供审计

---

## 二、用户角色扩展

v2 新增 `rd_manager`（教学主管）角色，权限介于 teacher 和 admin 之间。

| 功能 | teacher | rd_manager | admin |
|------|---------|------------|-------|
| 课程包列表 / 详情 / 课次 | ✅ | ✅ | ✅ |
| 课程研发模块 | ❌ | ✅ | ✅ |
| 课程包管理（增删改） | ❌ | ✅ | ✅ |
| 用户管理 | ❌ | ❌ | ✅ |
| AI 服务配置（查看） | ✅ | ✅ | ✅ |
| AI 服务配置（编辑） | ❌ | ❌ | ✅ |
| Prompt 配置（查看） | ✅ | ✅ | ✅ |
| Prompt 配置（编辑） | ❌ | ❌ | ✅ |
| AI 调用记录 | ❌ | ✅（仅自己） | ✅（全部） |
| 操作日志 | ✅（仅自己） | ✅（仅自己） | ✅（全部） |

---

## 三、新增功能需求

### 3.1 AI 服务配置（/admin/ai-settings）

#### 3.1.1 AI 提供商管理

管理员可添加、编辑、删除 AI 服务提供商。

**每个提供商的配置项**：

| 字段 | 说明 | 必填 |
|------|------|------|
| name | 提供商名称（如 OpenRouter、PackyAPI） | ✅ |
| baseUrl | API 地址（如 `https://openrouter.ai/api/v1`） | ✅ |
| apiKey | API 密钥（AES-256-GCM 加密存储，UI 显示掩码） | ✅ |
| protocol | 协议类型（当前仅支持 openai 兼容） | ✅ |
| supportText | 是否支持文本生成 | ✅ |
| supportImage | 是否支持图片生成 | ✅ |
| proxyUrl | 代理地址（如 `socks5://127.0.0.1:1080`），为空表示直连 | ❌ |

**功能要求**：
- 添加提供商后可测试连接（调用 `/models` 接口验证）
- baseUrl 自动清理误填的子路径（如 `/chat/completions`）和末尾斜杠
- API Key 前端显示为 `sk-****...****`，编辑时可重新填写
- 支持启用/停用提供商

#### 3.1.2 动作→模型映射

系统定义了 10 个 AI 动作，管理员为每个动作指定提供商和模型。

**文本动作（7 个）**：

| actionKey | 说明 |
|-----------|------|
| generate_framework | 生成课程框架 |
| revise_framework | 修订课程框架 |
| regenerate_lesson | 生成/重新生成课次 |
| revise_lesson | 修订课次 |
| rewrite_field | 重写指定字段 |
| validate_lesson | 课次审核 |
| chat | 问 AI 对话 |

**图片动作（3 个）**：

| actionKey | 说明 |
|-----------|------|
| lesson_cover | 课次封面图 |
| lesson_illustration | 课次插图 |
| package_cover | 课程包封面 |

**配置项**：
- 选择提供商 → 从该提供商 API 拉取模型列表 → 搜索选择模型
- 文本模型：配置输入/输出价格（USD/百万 token），支持自动获取和手动覆盖
- 图片模型：配置单次调用价格（USD 或 CNY），仅支持手动输入
- 保存前自动测试模型可用性（图片模型跳过测试）
- 模型列表兼容火山引擎等非标准 modalities 格式

#### 3.1.3 AI 用量统计

- 按模型/按动作类型分组统计调用次数、token 数、费用
- 支持时间范围筛选：今日 / 本周 / 本月 / 全部
- 显示当前 USD→CNY 汇率
- 所有角色可查看（只读）

---

### 3.2 Prompt 配置（/admin/prompt-config）

三个标签页：基线管理 / 提示词模板 / 预设管理。

#### 3.2.1 基线管理

**基线文档**共 23 条，按 6 个维度分类：

| 维度 | key 范围 | 数量 | 说明 |
|------|----------|------|------|
| 通用 | general | 1 | 所有课程通用的设计原则 |
| 年龄段 | A1 ~ A4 | 4 | 按年龄段的教学要求 |
| 难度等级 | L1 ~ L4 | 4 | 按难度的内容深度要求 |
| 组织形态 | S1 ~ S2 | 2 | 线下小班 / 大班等 |
| 产出物形态 | P1 ~ P11 | 11 | 不同类型的学生产出物 |
| 生成矩阵 | matrix | 1 | 跨维度规则矩阵 |

**功能要求**：
- 左侧按维度分类列表，右侧编辑器
- 编辑保存后自动创建版本记录
- 版本历史面板：查看所有历史版本 + 编辑摘要 + 时间戳
- 逐行 diff 对比（绿色添加 / 红色删除）
- 一键回滚到任意历史版本
- 管理员可编辑，teacher/rd_manager 只读查看

**运行时行为**：AI 生成课程时，`assembleBaselines()` 根据项目属性（年龄段、难度、组织形态、产出物类型）自动匹配并拼装对应维度的基线，只注入相关维度（节省 ~60% token）。60 秒缓存。

#### 3.2.2 提示词模板

6 个动作模板，支持 28 个预定义变量（`{{变量名}}` 格式）。

**变量分组**：

| 分组 | 变量示例 |
|------|----------|
| 项目信息 | projectTitle, courseDirection, lessonCount |
| 课程属性 | ageRange, ageLabel, level, levelLabel |
| 学员特征 | orgForm, orgFormLabel, deliverableType, deliverableName |
| 基线内容 | baselineContent（自动拼装的基线全文） |
| 框架上下文 | frameworkOverview, frameworkSummary |
| 课次上下文 | lessonTitle, lessonOverview, previousLessons |
| 图片 | imageStylePrompt |
| 用户输入 | userFeedback |

**功能要求**：
- 模板编辑器（大文本区域）
- 变量选择器面板（按分组，点击插入）
- 版本历史 + diff + 回滚（同基线管理）
- DB 模板优先，DB 无数据时 fallback 到 `lib/ai/prompts.ts` 硬编码

#### 3.2.3 预设管理

管理课程研发表单中的下拉选项和标签。

**预设分类**：

| category | 说明 | 示例 |
|----------|------|------|
| course_direction | 课程方向 | AI 创意写作、AI 数据分析 |
| image_style | 图片风格 | 水彩插画、扁平矢量 |
| image_composition | 构图引导 | 安全裁切区指导 |
| core_needs_tag | 核心需求标签 | 强调作品完成度、降低文字负担 |
| constraints_tag | 约束标签 | 45 分钟课时、4-6 人小班 |

**功能要求**：
- 左侧分类切换，右侧预设列表
- 新增 / 编辑 / 删除预设
- 拖拽排序（排序使用事务 + 按 ID 排序加锁，防死锁）
- 启用/停用预设
- 标签预设的 value 字段支持详细描述（点击标签时自动带入输入框）

---

### 3.3 AI 调用记录（/admin/ai-logs）

**功能要求**：
- 分页展示所有 AI API 调用记录（每页 20 条）
- 筛选条件：项目、动作类型、时间范围（今日/本周/本月/全部）
- 每条记录显示：项目名、动作类型、模型名、输入/输出 token、预估费用、时间
- 点击展开查看完整的 system prompt 和 user message（用于 Prompt 审计）
- admin 看到全部日志，rd_manager 仅看到自己项目的日志

---

### 3.4 操作日志（/admin/operation-logs）

**功能要求**：
- 展示系统操作审计记录（最近 100 条）
- 记录内容：时间、操作人（姓名+角色）、模块、动作、目标名称、详情
- admin 看到全部日志，其他角色仅看到自己的操作

**记录的操作类型**：

| 模块 | 动作 |
|------|------|
| package | upload / publish / online / offline / delete / edit |
| user | create / edit / delete / reset_password |

---

## 四、页面导航结构（v2 完整）

```
/admin                    → redirect 至 /admin/packages
/admin/packages           → 课程包管理
/admin/users              → 用户管理（仅 admin）
/admin/ai-settings        → AI 服务配置
/admin/prompt-config      → Prompt 配置（基线/模板/预设）
/admin/ai-logs            → AI 调用记录
/admin/operation-logs     → 操作日志
```

Sidebar 管理后台菜单（按权限显示）：
- 课程包管理（rd_manager + admin）
- 用户管理（仅 admin）
- 操作日志（所有角色）
- AI 调用记录（rd_manager + admin）
- AI 服务配置（所有角色，编辑仅 admin）
- Prompt 配置（所有角色，编辑仅 admin）

---

## 五、非功能需求

| 项目 | 要求 |
|------|------|
| API Key 安全 | AES-256-GCM 加密存储，前端掩码显示 |
| 版本管理 | 基线和模板每次编辑自动创建版本，支持 diff 和回滚 |
| 排序安全 | 预设排序使用数据库事务 + 按 ID 排序加锁，防止并发死锁 |
| 数据隔离 | rd_manager 仅可见自己创建的项目和日志 |
| 代理支持 | 按提供商配置 SOCKS5/HTTP 代理，通过 node:https + socks-proxy-agent 实现 |
| 价格管理 | 支持 USD/CNY 双币种，汇率存于 SystemConfig，可自动/手动更新 |
