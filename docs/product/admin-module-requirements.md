# 管理员模块需求文档

> 版本：v1.0
> 日期：2026-03-14
> 状态：✅ v1 已完成
> ⚠️ 本文档为 v1 版本，仅覆盖课程包管理和用户管理。v2 扩展功能（AI 服务配置、Prompt 配置、操作日志、AI 调用审计）见 [admin-module-requirements-v2.md](admin-module-requirements-v2.md)。

---

## 一、背景与目标

当前系统后台页（`/admin`）为静态展示，无实际功能。随着课程包数量增长和多用户使用，需要一个完整的管理员操作界面，支持课程包的接入与管理、用户账号的维护。

**目标**：让管理员可以通过 Web 界面完成全部日常运营操作，无需直接操作数据库或服务器文件系统。

---

## 二、用户角色

| 角色 | 说明 | 访问范围 |
|------|------|---------|
| teacher（老师） | 普通用户 | 登录后只能访问 `/list`、`/detail`、`/lesson` |
| admin（管理员） | 系统管理者 | 在老师权限基础上，额外可访问 `/admin` 全部页面 |

管理员后台所有页面和 API 均需校验 `session.user.role === "admin"`，否则重定向至首页。

---

## 三、功能需求

### 3.1 课程包管理

#### 3.1.1 课程包列表

- 以表格形式展示所有课程包（含草稿和已下线）
- 展示字段：课程包名称、slug、适用年龄段、级别、状态（已发布 / 已下线 / 草稿）、课次数量、创建时间
- 支持对每条记录执行：下线、上线、删除操作

#### 3.1.2 课程包接入（上传）

**触发方式**：点击「上传课程包 zip」按钮，弹出上传弹窗。

**上传包格式**（接入规范 v1，由 ChatGPT 按规范生成）：

```
{package-slug}/
├── package.json          # 课程包元信息
├── cover.svg / cover.png # 封面图
└── lessons/
    └── lesson-{NN}/
        ├── index.html    # 单课主入口（必须）
        ├── lesson.json   # 课次元信息（必须）
        ├── assets/       # 课次资源
        └── attachments/
            ├── teacher-screen/index.html
            ├── student-ai-template/index.html
            ├── student-output-template/index.html
            └── teacher-demo/index.html
```

**package.json 规范**：

```json
{
  "package_slug": "my-magical-partner",
  "package_title": "我的神奇搭档课程包",
  "age_range": "8-12",
  "level": "L1",
  "summary": "课程包简介",
  "cover_image": "cover.svg",
  "lessons": [
    { "lesson_no": 2, "lesson_dir": "lesson-02" }
  ]
}
```

**lesson.json 规范**：

```json
{
  "lesson_no": 2,
  "lesson_title": "我的搭档会帮我做什么",
  "age_range": "8-12",
  "level": "L1",
  "duration_minutes": 45,
  "delivery_mode": "offline_small_group",
  "output_summary": "《我的搭档任务卡》",
  "entry_file": "index.html",
  "attachments": [
    { "type": "teacher_screen", "title": "教师投屏页", "path": "attachments/teacher-screen/index.html" },
    { "type": "student_ai_input_template", "title": "学生 AI 输入模板单", "path": "attachments/student-ai-template/index.html" },
    { "type": "student_output_template", "title": "学生成果模板", "path": "attachments/student-output-template/index.html" },
    { "type": "teacher_demo_case", "title": "教师示范案例页", "path": "attachments/teacher-demo/index.html" }
  ]
}
```

**系统处理逻辑**：

1. 校验文件格式（必须为 .zip，大小限制 50MB）
2. 解压到服务器 `/public/course-packages/{slug}/`
3. 读取 `package.json` → upsert CoursePackage 记录（status 设为 `published`）
4. 遍历每个 lesson 目录 → 读取 `lesson.json` → upsert Lesson 记录 → 重建 Attachment 记录
5. 上传完成后弹窗展示导入统计（导入课次数、附件数）

**冲突处理规则**：

| 情况 | 处理 |
|------|------|
| slug 不存在 | 新建课程包 |
| slug 已存在 | 更新课程包元信息，status 重置为 published |
| 课次（packageId + lessonNo）不存在 | 新建课次 |
| 课次已存在 | 覆盖更新元信息，重建附件列表 |

**安全规则**：
- slug 必须符合 `/^[a-z0-9-]+$/`，防止路径穿越攻击
- 文件大小上限 50MB

#### 3.1.3 下线 / 上线操作

- 已发布课程包可执行「下线」，`status` 变为 `offline`，老师端不可见
- 已下线课程包可执行「上线」，`status` 变为 `published`
- 下线操作需二次确认弹窗

#### 3.1.4 删除课程包

- 删除数据库记录（级联删除关联的 Lesson 和 Attachment）
- **不删除**服务器上的文件目录（保留文件，便于重新接入）
- 需二次确认弹窗，展示"此操作不可撤销"提示

---

### 3.2 用户管理

#### 3.2.1 用户列表

- 以表格形式展示所有用户
- 展示字段：姓名、用户名、角色、创建时间、操作
- 不展示密码字段

#### 3.2.2 新建用户

- 表单字段：用户名（唯一，不可重复）、姓名、角色（teacher / admin）、初始密码
- 密码存储前进行 bcrypt 哈希处理（salt rounds = 12）
- 用户名已存在时返回明确错误提示

#### 3.2.3 编辑用户

- 可修改字段：姓名、角色
- 用户名不可修改（唯一标识）

#### 3.2.4 重置密码

- 管理员可为任意用户重置密码（填写新密码即可，无需旧密码验证）
- 新密码最少 6 位

#### 3.2.5 删除用户

- 管理员不可删除自身账号（系统防护，返回错误）
- 需二次确认弹窗

---

## 四、页面导航结构

```
/admin                    → redirect 至 /admin/packages
/admin/packages           → 课程包管理（列表 + 上传）
/admin/users              → 用户管理（列表 + 增删改）
```

左侧 Sidebar 菜单项（admin variant）：
- 课程包管理 → `/admin/packages`
- 用户管理 → `/admin/users`

---

## 五、非功能需求

| 项目 | 要求 |
|------|------|
| 权限 | 所有 `/admin/**` 路由和 `/api/admin/**` API 均需 admin 角色，否则 403 / redirect |
| 文件存储 | zip 内容解压至服务器本地 `/public/course-packages/`，适用于自建服务器（pm2）部署，不适用于 serverless |
| 密码安全 | bcryptjs，salt rounds = 12，与现有 seed 脚本保持一致 |
| 数据一致性 | 文件解压与数据库写入通过 `prisma.$transaction` 保证原子性；事务失败时回滚已解压文件 |

---

## 六、不在本期范围内

- 课程包内容编辑（在线修改 HTML 内容）
- 图片/附件单独上传管理
- 操作日志审计
- 管理员后台数据统计看板
