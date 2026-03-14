# 教师课包系统内容接入规范 v2

> 版本：v2.0
> 日期：2026-03-14
> 状态：已确认
> 适用系统：AI Dash 教师授课系统

---

## 1. 升级目的

v1 要求课程设计方交付完整可运行的 `index.html`，导致：

- 视觉风格依赖每份 HTML 自维护，无法保证一致性
- 更新系统模板需要重新制作所有 HTML
- AI 复制按钮、打印样式等系统功能无法统一注入

**v2 改变**：zip 中不再需要 `index.html`，改为在 `lesson.json` 内交付结构化内容数据。系统负责统一渲染视觉与交互。

---

## 2. v1 → v2 主要变化对照

| 项目 | v1 | v2 |
|---|---|---|
| 课程内容交付形式 | 完整 `index.html` | `lesson.json` 中的结构化 `sections` 字段 |
| 视觉渲染方 | 课程设计方 | 系统统一模板 |
| 附件页（投屏/模板等）| 独立 HTML 文件 | 内联为 `lesson.json` 中的 section |
| AI 复制按钮 | 手动嵌入 | 系统对所有 `template` 块自动注入 |
| 向后兼容 | — | 含 `index.html` 且无 `sections` 的包仍按 v1 处理 |

---

## 3. zip 目录结构

```
{slug}/
├── package.json
├── assets/
│   └── images/
│       └── cover.png          ← 课程包封面图
└── lessons/
    └── {lesson_dir}/
        ├── lesson.json        ← 包含全部内容（v2 核心交付物）
        └── assets/            ← 本课图片等静态资源（可选）
```

**不再需要 `index.html`**。系统从 `lesson.json` 的 `sections` 字段渲染课程页。

---

## 4. package.json 规范（与 v1 相同）

```json
{
  "package_slug": "my-magical-partner",
  "package_title": "我的神奇搭档课程包",
  "age_range": "8-12",
  "level": "L1",
  "summary": "面向 8-12 岁学生的 AI 创作入门课程包。",
  "cover_image": "assets/images/cover.png",
  "lessons": [
    { "lesson_no": 1, "lesson_dir": "lesson-01" }
  ]
}
```

---

## 5. lesson.json v2 完整规范

### 5.1 顶层结构

```json
{
  "lesson_no": 1,
  "lesson_title": "我的神奇搭档",
  "age_range": "8-12",
  "level": "L1",
  "duration_minutes": 45,
  "delivery_mode": "offline_small_group",
  "output_summary": "基础版《我的神奇搭档介绍页》",
  "entry_file": null,

  "hero": { ... },
  "sections": [ ... ],
  "attachments": [ ... ]
}
```

`entry_file` 在 v2 中设为 `null`（无独立 HTML 入口，由系统渲染）。

---

### 5.2 hero 字段

课程页顶部横幅信息。

```json
"hero": {
  "tags": ["教师授课包 · 主文件", "45 分钟首课", "主题包：我的神奇搭档创作计划"],
  "title": "《我的神奇搭档》教师授课包",
  "subtitle": "让学生在 45 分钟内，通过 3 个短 AI 回合，完成一张基础版《我的神奇搭档介绍页》；让老师拿到即能备课、即能带课、即能复盘。",
  "goal": "用 3 个短 AI 回合，帮助学生从「模糊想法」更快走到「完整作品」。",
  "outcome": "基础版《我的神奇搭档介绍页》"
}
```

---

### 5.3 sections 字段

固定 7 个 section，id 固定，顺序固定：

| 序号 | id | title |
|---|---|---|
| 1 | `core` | 本课核心信息 |
| 2 | `ai_value` | 本课 AI 环节价值说明 |
| 3 | `prep` | 课前备课提示单 |
| 4 | `flow` | 课堂执行清单（含各环节） |
| 5 | `issues` | 学生卡点应对表 |
| 6 | `materials` | 本课附件与模板 |
| 7 | `review` | 课后复盘记录区 |

每个 section 结构：

```json
{
  "id": "core",
  "title": "本课核心信息",
  "blocks": [ ...内容块数组... ]
}
```

---

### 5.4 attachments 字段

v2 中附件内容已内联至 sections，attachments 字段用于额外的可下载文件（如 PDF）：

```json
"attachments": [
  {
    "type": "student_ai_input_template",
    "title": "学生 AI 输入模板单（可打印版）",
    "path": "assets/student-ai-template.pdf"
  }
]
```

如无独立文件，`attachments` 可为空数组 `[]`。

---

## 6. 内容块类型完整说明

blocks 数组中每个元素为一个内容块，以 `type` 字段区分。

---

### 6.1 `text` — 段落文本

```json
{
  "type": "text",
  "content": "这节课是一节**首课进入课**。它不是知识讲授课，而是让学生快速感知 AI 价值的首课。"
}
```

content 支持 `**粗体**` 标记。

---

### 6.2 `quote` — 高亮引用

```json
{
  "type": "quote",
  "content": "本课使用 AI，不是为了替学生完成作品，而是为了帮助学生在 45 分钟内跨过首课创作中最容易卡住的三个点。"
}
```

---

### 6.3 `list` — 列表

```json
{
  "type": "list",
  "ordered": false,
  "items": [
    "适用年龄：8–12 岁",
    "适用能力层：L1 起步",
    "授课模式：4–6 人线下小班",
    "运行前提：通用外部 AI 工具可访问"
  ]
}
```

`ordered: true` 为有序列表，`false` 为无序。

---

### 6.4 `template` — AI 输入模板

**系统会为所有 `template` 块自动添加"复制"按钮。**

```json
{
  "type": "template",
  "label": "AI 回合 1：想名字",
  "content": "我想设计一个神奇搭档，它像______。请帮我想 3 个适合小学生理解、好记又有趣的搭档名字。"
}
```

---

### 6.5 `box` — 卡片容器

可嵌套其他块。

```json
{
  "type": "box",
  "pill": { "text": "本课定位", "color": "blue" },
  "variant": "default",
  "blocks": [
    {
      "type": "text",
      "content": "这节课是一节**首课进入课 / 快成果作品课 / AI 价值展示课**。"
    }
  ]
}
```

**pill.color** 可选值：`blue` | `violet` | `yellow` | `green` | `default`

**variant** 可选值：`default` | `danger`（红色背景）| `success`（绿色背景）| `note`（黄色背景）

---

### 6.6 `grid` — 多列网格

`items` 数组内只放 `box` 类型块。

```json
{
  "type": "grid",
  "cols": 2,
  "items": [
    {
      "type": "box",
      "pill": { "text": "教师准备", "color": "default" },
      "blocks": [
        { "type": "list", "ordered": false, "items": ["熟悉唯一成果：基础版搭档介绍页", "预览示范案例《云朵小狐》"] }
      ]
    },
    {
      "type": "box",
      "pill": { "text": "教室与设备", "color": "default" },
      "blocks": [
        { "type": "list", "ordered": false, "items": ["投屏正常", "网络正常", "学生设备正常", "AI 工具可访问"] }
      ]
    }
  ]
}
```

`cols` 可选值：`2` | `3`

---

### 6.7 `accordion` — 可折叠环节块

用于 `flow` section 中的课堂环节。

```json
{
  "type": "accordion",
  "title": "环节 1：开场进入",
  "time": "0–5 分钟",
  "blocks": [
    { "type": "text", "content": "**目标：** 快速把学生带入「神奇搭档」主题。" },
    { "type": "text", "content": "**你要做什么：** 抛一个问题，给两个轻示例，直接宣布今天任务。" },
    { "type": "text", "content": "**你可以直接说：**" },
    { "type": "list", "ordered": false, "items": [
      "「如果今天开始，你可以拥有一个神奇搭档，你希望它像什么？」",
      "「它可以像动物、机器人，也可以像你想出来的神奇生物。」",
      "「今天每个人都要做出自己的神奇搭档介绍页。」"
    ]},
    { "type": "text", "content": "**这一段结束时要看到：** 每个学生脑中有一个初步方向。" }
  ]
}
```

---

### 6.8 `qa_pair` — 问题应对对

用于 `issues` section。

```json
{
  "type": "qa_pair",
  "question": "不知道它像什么",
  "answer": "「先从三个里选一个：动物、机器人、神奇生物。」"
}
```

---

## 7. 完整 lesson.json 示例

> 以下为第 1 节课《我的神奇搭档》的完整 v2 数据，可直接作为 ChatGPT 生成新课包的参考模板。

```json
{
  "lesson_no": 1,
  "lesson_title": "我的神奇搭档",
  "age_range": "8-12",
  "level": "L1",
  "duration_minutes": 45,
  "delivery_mode": "offline_small_group",
  "output_summary": "基础版《我的神奇搭档介绍页》",
  "entry_file": null,

  "hero": {
    "tags": ["教师授课包 · 主文件", "45 分钟首课", "主题包：我的神奇搭档创作计划"],
    "title": "《我的神奇搭档》教师授课包",
    "subtitle": "让学生在 45 分钟内，通过 3 个短 AI 回合，完成一张基础版《我的神奇搭档介绍页》；让老师拿到即能备课、即能带课、即能复盘。",
    "goal": "用 3 个短 AI 回合，帮助学生从「模糊想法」更快走到「完整作品」。",
    "outcome": "基础版《我的神奇搭档介绍页》"
  },

  "sections": [
    {
      "id": "core",
      "title": "本课核心信息",
      "blocks": [
        {
          "type": "grid",
          "cols": 2,
          "items": [
            {
              "type": "box",
              "pill": { "text": "本课定位", "color": "blue" },
              "blocks": [{ "type": "text", "content": "这节课是一节**首课进入课 / 快成果作品课 / AI 价值展示课**。它不是知识讲授课，也不是工具说明课，而是一节让学生快速进入主题、快速感知 AI 价值、快速完成作品的首课。" }]
            },
            {
              "type": "box",
              "pill": { "text": "适用条件", "color": "violet" },
              "blocks": [{ "type": "list", "ordered": false, "items": ["适用年龄：8–12 岁", "适用能力层：L1 起步", "授课模式：4–6 人线下小班", "运行前提：通用外部 AI 工具可访问"] }]
            }
          ]
        },
        {
          "type": "grid",
          "cols": 3,
          "items": [
            {
              "type": "box",
              "pill": { "text": "核心目标", "color": "yellow" },
              "blocks": [{ "type": "list", "ordered": false, "items": ["学生能想出一个属于自己的神奇搭档", "学生能完成名字、本领和一句介绍", "学生开始理解：AI 给的是材料，作品要自己整理"] }]
            },
            {
              "type": "box",
              "pill": { "text": "最小成果", "color": "green" },
              "blocks": [{ "type": "list", "ordered": false, "items": ["搭档名字", "一个最特别的本领", "一句搭档介绍", "可选：它长什么样"] }]
            },
            {
              "type": "box",
              "pill": { "text": "成功标准", "color": "default" },
              "blocks": [{ "type": "list", "ordered": false, "items": ["大部分学生完成 3 项核心内容", "3 个 AI 回合都顺利跑完", "45 分钟内完成展示与提交"] }]
            }
          ]
        }
      ]
    },

    {
      "id": "ai_value",
      "title": "本课 AI 环节价值说明",
      "blocks": [
        {
          "type": "quote",
          "content": "本课使用 AI，不是为了替学生完成作品，而是为了帮助学生在 45 分钟内跨过首课创作中最容易卡住的三个点：起名、本领具体化和一句介绍的整理表达。"
        },
        {
          "type": "grid",
          "cols": 3,
          "items": [
            {
              "type": "box",
              "pill": { "text": "AI 环节 1：名字", "color": "blue" },
              "blocks": [{ "type": "text", "content": "帮助学生更快获得几个可选名字，让搭档从「模糊想法」变成「有名字的角色」。" }]
            },
            {
              "type": "box",
              "pill": { "text": "AI 环节 2：本领", "color": "violet" },
              "blocks": [{ "type": "text", "content": "帮助学生把「它很厉害」这种模糊想法变成一个更具体、更鲜明的本领。" }]
            },
            {
              "type": "box",
              "pill": { "text": "AI 环节 3：一句介绍", "color": "yellow" },
              "blocks": [{ "type": "text", "content": "帮助学生把朴素的话整理成更清楚、更像作品里的介绍语。" }]
            }
          ]
        },
        {
          "type": "grid",
          "cols": 2,
          "items": [
            {
              "type": "box",
              "variant": "danger",
              "blocks": [
                { "type": "text", "content": "**如果没有 AI，学生可能会遇到的困难**" },
                { "type": "list", "ordered": false, "items": ["长时间卡在起名", "本领写得很空，比如「很厉害」「很聪明」", "不知道怎么写一句完整介绍", "在 45 分钟内很难把想法整理成完整作品"] }
              ]
            },
            {
              "type": "box",
              "variant": "success",
              "blocks": [
                { "type": "text", "content": "**学生在 AI 之后仍然必须完成什么**" },
                { "type": "list", "ordered": false, "items": ["自己决定搭档的大方向", "自己从 AI 结果里做选择", "自己修改名字、本领和介绍", "自己把内容整理进介绍页"] }
              ]
            }
          ]
        }
      ]
    },

    {
      "id": "prep",
      "title": "课前备课提示单",
      "blocks": [
        {
          "type": "grid",
          "cols": 3,
          "items": [
            {
              "type": "box",
              "pill": { "text": "教师准备", "color": "default" },
              "blocks": [{ "type": "list", "ordered": false, "items": ["熟悉唯一成果：基础版搭档介绍页", "预览示范案例《云朵小狐》", "熟悉 3 个 AI 回合输入模板", "记住第 35 分钟后必须停 AI"] }]
            },
            {
              "type": "box",
              "pill": { "text": "教室与设备", "color": "default" },
              "blocks": [{ "type": "list", "ordered": false, "items": ["投屏正常", "网络正常", "学生设备正常", "AI 工具可访问"] }]
            },
            {
              "type": "box",
              "variant": "note",
              "pill": { "text": "一句提醒", "color": "yellow" },
              "blocks": [{ "type": "text", "content": "**首课最怕的不是内容浅，而是收不住。** 先保 3 个核心内容完整，再考虑美化和扩展。" }]
            }
          ]
        }
      ]
    },

    {
      "id": "flow",
      "title": "课堂执行清单",
      "blocks": [
        {
          "type": "accordion",
          "title": "环节 1：开场进入",
          "time": "0–5 分钟",
          "blocks": [
            { "type": "text", "content": "**目标：** 快速把学生带入「神奇搭档」主题。" },
            { "type": "text", "content": "**你要做什么：** 抛一个问题，给两个轻示例，直接宣布今天任务。" },
            { "type": "text", "content": "**你可以直接说：**" },
            { "type": "list", "ordered": false, "items": ["「如果今天开始，你可以拥有一个神奇搭档，你希望它像什么？」", "「它可以像动物、机器人，也可以像你想出来的神奇生物。」", "「今天每个人都要做出自己的神奇搭档介绍页。」"] },
            { "type": "text", "content": "**这一段结束时要看到：** 每个学生脑中有一个初步方向。" }
          ]
        },
        {
          "type": "accordion",
          "title": "环节 2：任务说明 + 教师示范",
          "time": "5–12 分钟",
          "blocks": [
            { "type": "text", "content": "**目标：** 让学生明白今天只做 3 个核心内容，并看懂 AI 如何参与。" },
            { "type": "text", "content": "**你要做什么：** 展示成果模板，明确 3 个必填项，快速示范一次完整流程。" },
            { "type": "text", "content": "**你可以直接说：**" },
            { "type": "list", "ordered": false, "items": ["「今天我们只保 3 个核心内容：名字、本领、一句介绍。」", "「我们会真的用 3 次 AI，但每次只解决一个小问题。」", "「最后交的是你的作品，不是 AI 对话。」"] }
          ]
        },
        {
          "type": "accordion",
          "title": "环节 3：AI 回合 1 —— 想名字",
          "time": "12–20 分钟",
          "blocks": [
            { "type": "text", "content": "**输入模板：**" },
            { "type": "template", "label": "AI 回合 1：想名字", "content": "我想设计一个神奇搭档，它像______。请帮我想 3 个适合小学生理解、好记又有趣的搭档名字。" },
            { "type": "text", "content": "**你要做什么：** 让学生先写「它像什么」，统一进入名字回合，只保留 1 个名字并马上写进成果模板。" },
            { "type": "text", "content": "**你可以直接说：**" },
            { "type": "list", "ordered": false, "items": ["「这一轮只做名字，不要顺手继续问本领。」", "「名字只保留一个。」", "「先定下来，后面还能小改。」"] },
            { "type": "text", "content": "**第 20 分钟前必须做到：** 大部分学生有名字。" }
          ]
        },
        {
          "type": "accordion",
          "title": "环节 4：AI 回合 2 —— 想本领",
          "time": "20–28 分钟",
          "blocks": [
            { "type": "text", "content": "**输入模板：**" },
            { "type": "template", "label": "AI 回合 2：想本领", "content": "我的神奇搭档名字是______。它像______。请帮我想 3 个适合小学生理解、又很特别的本领。" },
            { "type": "text", "content": "**你要做什么：** 统一进入本领回合，只保留 1 个本领，要求至少改 1 个词，再写进成果模板。" },
            { "type": "list", "ordered": false, "items": ["「今天只保留一个最特别的本领。」", "「不要贪多，首课先做清楚。」", "「把一个词改成你自己的表达。」"] },
            { "type": "text", "content": "**第 28 分钟前必须做到：** 大部分学生有 1 个本领。" }
          ]
        },
        {
          "type": "accordion",
          "title": "环节 5：AI 回合 3 —— 润色一句介绍",
          "time": "28–35 分钟",
          "blocks": [
            { "type": "text", "content": "**输入模板：**" },
            { "type": "template", "label": "AI 回合 3：润色一句介绍", "content": "请帮我把这句话说得更适合写在小学生作品上，语气简单、清楚、像孩子说的话：这是我的搭档，它会______。" },
            { "type": "text", "content": "**你要做什么：** 先让学生自己写一句朴素的话，再统一进入润色回合，选 1 句并改一点，写进成果模板。" },
            { "type": "list", "ordered": false, "items": ["「不要选最厉害的句子，选最像你会说的话。」", "「改一点，它才是你的作品。」", "「这一步做完，我们就不继续问 AI 了。」"] },
            { "type": "text", "content": "**第 35 分钟前必须做到：** 大部分学生有一句搭档介绍。" }
          ]
        },
        {
          "type": "accordion",
          "title": "环节 6：整理、展示与收束",
          "time": "35–45 分钟",
          "blocks": [
            { "type": "text", "content": "**整理作品（35–40 分钟）：** 统一停 AI，让学生把 3 个核心内容整理进介绍页；可选补「它长什么样」。" },
            { "type": "text", "content": "**你必须说：** 「现在停止继续问 AI，开始整理你的作品。」" },
            { "type": "text", "content": "**展示与收束（40–45 分钟）：** 展示 2–3 份作品，每位学生只讲两件事：我的搭档叫什么、它最特别的本领是什么。" }
          ]
        }
      ]
    },

    {
      "id": "issues",
      "title": "学生卡点应对表",
      "blocks": [
        {
          "type": "grid",
          "cols": 2,
          "items": [
            { "type": "box", "variant": "danger", "blocks": [{ "type": "qa_pair", "question": "不知道它像什么", "answer": "「先从三个里选一个：动物、机器人、神奇生物。」" }] },
            { "type": "box", "variant": "danger", "blocks": [{ "type": "qa_pair", "question": "想做现成角色", "answer": "「你可以借一点感觉，但它必须变成你的版本。至少要改名字和本领。」" }] },
            { "type": "box", "variant": "danger", "blocks": [{ "type": "qa_pair", "question": "一直纠结名字", "answer": "「这一轮最多保留两个候选，30 秒后必须选一个。」" }] },
            { "type": "box", "variant": "danger", "blocks": [{ "type": "qa_pair", "question": "直接复制 AI", "answer": "「改一个词，让它更像你会说的话；删一句，再换成你的表达。」" }] }
          ]
        }
      ]
    },

    {
      "id": "materials",
      "title": "本课附件与模板",
      "blocks": [
        {
          "type": "grid",
          "cols": 2,
          "items": [
            {
              "type": "box",
              "pill": { "text": "成果模板", "color": "blue" },
              "blocks": [
                { "type": "template", "label": "学生成果模板", "content": "《我的神奇搭档介绍页》\n\n我的搭档名字：________________\n\n它最特别的一个本领：________________\n\n一句搭档介绍：________________\n\n可选：它长什么样________________" }
              ]
            },
            {
              "type": "box",
              "pill": { "text": "教师示范案例", "color": "violet" },
              "blocks": [
                { "type": "text", "content": "**案例名称：** 云朵小狐" },
                { "type": "list", "ordered": false, "items": ["名字：云朵小狐", "本领：总能在别人紧张的时候想出一个温柔的好办法", "一句介绍：这是我的搭档云朵小狐，它总会安静地陪着我。", "可选外形：像一只软软的白色小狐狸，尾巴像云一样蓬松"] }
              ]
            }
          ]
        }
      ]
    },

    {
      "id": "review",
      "title": "课后复盘记录区",
      "blocks": [
        {
          "type": "grid",
          "cols": 2,
          "items": [
            {
              "type": "box",
              "blocks": [
                { "type": "text", "content": "**下课后马上记录**" },
                { "type": "list", "ordered": true, "items": ["学生最容易卡在哪个 AI 回合？", "哪一段最拖时间？", "哪类学生最需要更多引导？", "学生是否真的感受到了「这是我的搭档」？"] }
              ]
            },
            {
              "type": "box",
              "variant": "note",
              "blocks": [
                { "type": "text", "content": "**家长沟通简版话术**" },
                { "type": "text", "content": "今天这节课里，AI 主要帮助孩子完成了三件事：更快给搭档起名字、把搭档本领想得更具体、把一句介绍整理得更像作品；但最后的选择、修改和整理，仍然是孩子自己完成的。" }
              ]
            }
          ]
        }
      ]
    }
  ],

  "attachments": []
}
```

---

## 8. 验收标准

上传的 zip 被视为「可接入」，须满足：

- [ ] `package.json` 存在且字段完整
- [ ] `lesson.json` 存在
- [ ] `lesson.json` 包含 `sections` 字段且含全部 7 个 section id
- [ ] `hero` 字段完整（tags, title, subtitle, goal, outcome）
- [ ] `flow` section 含至少 4 个 `accordion` 块
- [ ] `issues` section 含至少 2 个 `qa_pair` 块
- [ ] `materials` section 含至少 1 个 `template` 块
- [ ] 所有 `template` 块的 `content` 字段非空

---

## 9. 向 ChatGPT 传递本规范的方法

### 方法一：文件上传（推荐）

1. 打开 ChatGPT（需要 GPT-4o 或以上版本，支持文件上传）
2. 上传本文件 `content-integration-spec-v2.md`
3. 使用以下 **标准提示词** 开始对话：

```
你现在是一个课程包制作助手。我已上传教师课包系统内容接入规范 v2，请仔细阅读并记住所有规则。

接下来我会告诉你新课程的内容，请严格按照规范中的 lesson.json v2 格式生成 lesson.json 文件，并使用 Python 打包成符合规范目录结构的 zip 文件。

注意事项：
- entry_file 必须设为 null
- sections 必须包含全部 7 个固定 id（core / ai_value / prep / flow / issues / materials / review）
- flow section 必须使用 accordion 块，且每个环节包含 time 字段
- 所有 AI 输入模板使用 template 块，不要用 text 块代替
- zip 根目录必须是 {slug}，不要多套一层目录

准备好了请回复「已读取规范，请开始描述课程内容」。
```

4. ChatGPT 确认后，描述新课程内容（课程主题、目标、环节、模板等）
5. ChatGPT 使用 **代码解释器（Code Interpreter）** 生成 zip 文件供下载

---

### 方法二：直接粘贴规范片段

如果无法上传文件，把 **第 6 节（内容块类型说明）** 和 **第 7 节（完整示例 JSON）** 直接复制粘贴进对话，然后使用同样的标准提示词。

---

### 方法三：ChatGPT 自定义 GPT（System Prompt 版）

如果你创建了自定义 GPT，把以下内容放入 System Prompt：

```
你是 AI Dash 课程包制作助手，专门生成符合「教师课包系统内容接入规范 v2」的 zip 文件。

【核心规则】
1. zip 不需要 index.html，只需要 package.json + lesson.json（含 sections 字段）
2. lesson.json 必须包含 hero 和 7 个固定 id 的 sections
3. 内容块类型：text / quote / list / template / box / grid / accordion / qa_pair
4. grid 的 cols 只能是 2 或 3，items 只放 box 类型
5. accordion 必须有 time 字段，用于 flow section 的课堂环节
6. template 块是 AI 输入模板，系统会自动为它添加复制按钮
7. 完成后使用 Python 打包 zip，zip 根目录为 {slug}

用户描述课程后，先输出 lesson.json 内容供确认，确认后再打包 zip。
```

然后上传本规范文件作为知识库文件。

---

## 10. 常见错误与修正

| 错误 | 修正 |
|---|---|
| sections 缺少某个 id | 每个课包必须有完整 7 个 section，内容可简短但不能缺 |
| flow 用 text 块描述环节 | 必须用 accordion 块，每个环节单独一个 accordion |
| AI 模板用 text 块 | 改为 template 块，系统才能识别并注入复制按钮 |
| grid.items 放非 box 块 | grid 的 items 只能是 box 类型 |
| entry_file 设为 "index.html" | v2 必须设为 null |
| zip 根目录多了 course-packages/ | zip 根目录直接是 {slug}，如 my-magical-partner/ |
