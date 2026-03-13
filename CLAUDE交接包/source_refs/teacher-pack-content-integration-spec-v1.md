# 教师课包系统内容接入规范 v1

## 1. 文档目的

本规范用于统一“课程设计产物”与“教师课包系统接入要求”之间的交付标准。

它解决的问题只有一个：

**如何确保课程设计工作流最终交付的单课内容，能够稳定、直接、低歧义地接入教师课包系统。**

本规范生效后：

- 课程设计侧按本规范输出课包成品
- 系统侧按本规范完成上传、绑定、访问与展示
- 一节课是否“可上传到系统”，以是否符合本规范为唯一判断标准

---

## 2. 适用范围

本规范适用于教师课包系统 V1 中所有单课教师课包内容。

适用对象包括：

- 课程设计产出方
- 教师课包页面制作方
- 系统开发方
- 后台上传与运营维护方

本规范当前只面向：

- 教师课包 HTML 成品
- 单课附件资源
- 课程包 / 课次元信息交付

本规范不包含：

- 课程内容本身的教学设计规范
- 学生端内容规范
- 在线编辑器规范
- 自动导入整包能力规范

---

## 3. 接入总原则

### 3.1 单课内容以独立 HTML 成品为准
每一节课最终必须交付为一份独立可运行的教师课包 HTML 成品。

系统负责：
- 登录
- 课程包组织
- 课次入口
- 资源绑定
- 权限控制

系统不负责：
- 在 V1 中动态拼装单课主体内容
- 在 V1 中动态渲染附件中心

### 3.2 单课内容必须可脱离系统独立运行
一节课在未接入系统前，也必须可以单独打开并正常展示。

这意味着：
- 必须有独立入口文件
- 必须使用稳定相对路径
- 不依赖系统运行时注入内容后才能成立

### 3.3 单课接入必须依赖规范，不依赖人工理解
系统是否接纳一节课，只判断它是否符合本规范，不以人工阅读课程文档或聊天上下文为依据。

### 3.4 原型优先
若单课内容实现与既定高优先级参考原型冲突，在不破坏本规范基本接入要求的前提下，以原型还原优先。

当前最高优先级单课原型为：

`docs/prototypes/teacher-pack-my-magical-partner-v1.html`

---

## 4. 交付单元定义

### 4.1 系统接入的最小单位是“单课包”
系统接入时，最小处理单位不是一句课程说明，也不是一个课程包总文档，而是：

**一节课对应的一套完整单课包。**

每个单课包必须独立包含：
- 单课入口文件
- 页面运行资源
- 附件中心资源
- 单课元信息文件

### 4.2 课程包与单课关系
一个课程包下可以包含多节课。
每一节课都必须是一个独立单课包。

系统层面关系为：
- 课程包：组织层
- 单课：接入层与访问层

---

## 5. 目录结构规范

### 5.1 推荐总目录结构
```text
/course-packages/
  {course-package-slug}/
    package.json
    lessons/
      lesson-01/
        lesson.json
        index.html
        assets/
        attachments/
          teacher-screen/
          student-ai-template/
          student-output-template/
          teacher-demo/
      lesson-02/
        lesson.json
        index.html
        assets/
        attachments/
          teacher-screen/
          student-ai-template/
          student-output-template/
          teacher-demo/
```

### 5.2 目录层级说明

#### `/course-packages/`
系统内容根目录。

#### `{course-package-slug}/`
某一个课程包的根目录。
命名必须稳定、可读、可用于路径，不得使用临时命名。

#### `package.json`
课程包级元信息文件。

#### `lessons/`
课次目录。

#### `lesson-01/`
单节课目录。命名采用固定编号形式，便于排序和访问管理。

#### `lesson.json`
单课元信息文件。

#### `index.html`
该课唯一入口文件。

#### `assets/`
该课页面运行所需静态资源目录。

#### `attachments/`
该课附件中心资源目录。

### 5.3 V1 是否强制整包上传
V1 不强制管理员按整包目录一次性导入。

但即使 V1 采用“手工维护元信息 + 按课次上传资源”的混合方式，课程设计侧最终交付物仍应尽量遵守本规范目录结构，以便：

- 降低上传出错率
- 保持课程设计与系统接入的一致性
- 为后续整包自动导入预留基础

---

## 6. 单课目录强制要求

每一节课要被视为“可上传”，至少必须包含以下内容：

### 6.1 必须存在的文件与目录
- `index.html`
- `lesson.json`
- `assets/`
- `attachments/`

其中：
- `assets/` 可以为空目录，但目录应存在
- `attachments/` 可以在个别资源未齐时临时为空，但目录应存在

### 6.2 单课入口文件要求
#### 文件名固定
单课入口文件必须固定命名为：

`index.html`

不得使用：
- `home.html`
- `main.html`
- `teacher-pack.html`
- 其他自定义入口名

#### 入口唯一
每节课只认一个正式入口文件，即 `index.html`。

### 6.3 资源路径要求
单课页面内所有资源引用应优先使用相对路径。

允许：
- `./assets/style.css`
- `./attachments/teacher-screen/index.html`

不建议：
- 依赖开发机本地绝对路径
- 依赖临时云盘地址
- 依赖不稳定外部资源地址

---

## 7. package.json 规范

### 7.1 作用
`package.json` 用于描述课程包级元信息，供系统录入或后续自动解析使用。

### 7.2 建议字段
```json
{
  "package_title": "我的神奇搭档课程包",
  "package_slug": "my-magical-partner",
  "age_range": "8-12",
  "level": "L1",
  "summary": "面向 8-12 岁学生的教师课包课程包。",
  "cover_image": "cover.jpg",
  "lessons": [
    {
      "lesson_no": 1,
      "lesson_dir": "lesson-01"
    }
  ]
}
```

### 7.3 字段说明
- `package_title`：课程包名称
- `package_slug`：课程包路径标识
- `age_range`：适用年龄段
- `level`：级别
- `summary`：课程包简介
- `cover_image`：课程包主图相对路径
- `lessons`：课次索引列表

---

## 8. lesson.json 规范

### 8.1 作用
`lesson.json` 是系统接入单课时最关键的结构化文件。
它用于说明该课次的最小元信息与附件资源信息。

### 8.2 建议字段
```json
{
  "lesson_no": 1,
  "lesson_title": "我的神奇搭档",
  "age_range": "8-12",
  "level": "L1",
  "duration_minutes": 45,
  "delivery_mode": "offline_small_group",
  "output_summary": "《我的神奇搭档介绍页》",
  "entry_file": "index.html",
  "attachments": [
    {
      "type": "teacher_screen",
      "title": "教师投屏页",
      "path": "attachments/teacher-screen/index.html"
    },
    {
      "type": "student_ai_input_template",
      "title": "学生 AI 输入模板单",
      "path": "attachments/student-ai-template/template.pdf"
    },
    {
      "type": "student_output_template",
      "title": "学生成果模板",
      "path": "attachments/student-output-template/template.pdf"
    },
    {
      "type": "teacher_demo_case",
      "title": "教师示范案例页",
      "path": "attachments/teacher-demo/index.html"
    }
  ]
}
```

### 8.3 字段说明

#### 必填字段
- `lesson_no`
- `lesson_title`
- `output_summary`
- `entry_file`

#### 建议必填字段
- `age_range`
- `level`
- `duration_minutes`
- `delivery_mode`
- `attachments`

#### 字段解释
- `lesson_no`：课次序号
- `lesson_title`：课次名称
- `age_range`：适用年龄段
- `level`：级别
- `duration_minutes`：课程时长
- `delivery_mode`：授课模式
- `output_summary`：本课成果描述
- `entry_file`：单课正式入口，V1 固定应为 `index.html`
- `attachments`：附件清单

---

## 9. 附件中心规范

### 9.1 V1 承载原则
附件中心在 V1 中是单课教师课包 HTML 的固定组成部分，由课包成品自身承载。

系统不负责动态渲染附件中心，但系统可在后台维护附件文件与路径绑定。

### 9.2 附件类型固定枚举
V1 固定支持以下附件类型：

- `teacher_screen`
- `student_ai_input_template`
- `student_output_template`
- `teacher_demo_case`

如无特殊批准，不应新增自由命名类型。

### 9.3 附件目录建议
```text
attachments/
  teacher-screen/
  student-ai-template/
  student-output-template/
  teacher-demo/
```

目录名允许与系统枚举不完全一致，但在 `lesson.json` 中必须明确映射到系统标准类型。

### 9.4 附件标题要求
附件标题应使用教师端可直接理解的中文标题，例如：
- 教师投屏页
- 学生 AI 输入模板单
- 学生成果模板
- 教师示范案例页

### 9.5 附件资源格式
附件可以是：
- HTML 页面
- PDF
- 图片
- 常规可下载文档

但必须满足：
- 路径明确
- 文件可访问
- 文件打开行为可预期

---

## 10. 页面内容结构要求

虽然单课教师课包的视觉表达可以不同，但 V1 中每节课最终交付内容必须固定包含以下模块：

- 本课核心信息
- 本课 AI 环节价值说明
- 课前备课提示单
- 课堂执行清单
- 学生卡点应对表
- 课后复盘记录区
- 附件中心

这 7 个模块必须出现在单课教师课包 HTML 中。

系统当前不强制这些模块必须采用统一 DOM 结构，但建议后续逐步形成统一模板规范。

---

## 11. 命名规范

### 11.1 路径命名
建议使用：
- 小写英文
- 中划线连接
- 稳定、不含空格

例如：
- `my-magical-partner`
- `lesson-01`
- `teacher-screen`

### 11.2 文件命名
建议资源文件命名清晰、稳定，不使用：
- `最终版.html`
- `最新最新版.pdf`
- `test2.png`

建议使用：
- `index.html`
- `template.pdf`
- `demo-case.html`

---

## 12. 管理员接入规则

在 V1 混合接入模式下，管理员接入一节课时，应遵循以下流程：

### 12.1 先建元信息
- 创建课程包
- 填写课程包基本信息
- 创建课次
- 填写课次名称、序号、本课成果等最小字段

### 12.2 再绑单课资源
- 上传单课 HTML 文件与 `assets/`
- 上传附件目录下资源
- 确认 `index.html` 为正式入口
- 确认附件路径可访问

### 12.3 最后验收
验收标准包括：
- 单课页面能打开
- 页面样式无明显丢失
- 附件中心可见
- 附件链接有效
- 路径无错链
- 页面不依赖开发环境特殊配置

---

## 13. 课程设计侧交付要求

课程设计工作流最终交付给系统时，不应只交自然语言课程方案，而应至少交付以下 3 类产物：

### 13.1 课程设计说明
用于讨论、审稿与内部确认。

### 13.2 单课教师课包成品
即：
- `index.html`
- `assets/`
- `attachments/`

### 13.3 单课接入元信息
即：
- `lesson.json`
- 如已整理课程包级信息，则同时提供 `package.json`

只有第 13.2 与 13.3 齐备时，系统接入效率才是可控的。

---

## 14. “可上传到系统”的判定标准

一节课被视为“可上传”，必须同时满足以下条件：

### 14.1 入口完整
存在且仅存在正式入口：
- `index.html`

### 14.2 元信息完整
存在：
- `lesson.json`

并至少包含：
- 课次序号
- 课次名称
- 本课成果
- 入口文件信息

### 14.3 目录完整
存在：
- `assets/`
- `attachments/`

### 14.4 路径有效
页面内资源路径和附件路径均可访问。

### 14.5 附件类型可识别
附件必须映射到系统定义的标准类型。

### 14.6 页面可独立运行
脱离后台动态拼装，也能单独打开和使用。

---

## 15. 当前不纳入 v1 强制要求的内容

以下内容可作为后续版本增强项，但在 v1 不作为强制接入门槛：

- 自动解析整包导入
- 模块级 DOM 校验
- 页面视觉模板统一
- 资源 hash 化发布
- 自动版本对比
- 自动附件中心生成
- 在线内容编辑与发布

---

## 16. 推荐的 v1 执行结论

为了保证课程设计窗口未来产出的内容可以直接进入系统，项目应明确要求：

**所有进入教师课包系统的单课内容，都必须以“单课成品包 + 元信息文件”的方式交付，并遵循本规范规定的目录结构、入口命名、附件类型与路径规则。**
