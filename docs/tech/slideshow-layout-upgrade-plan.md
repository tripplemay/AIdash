# 课件版式升级 — 实施方案

> 需求确认日期：2026-03-27

## 一、概述

将课件生成从 pptxgenjs 代码绘制替换为 pptx-automizer + SlidesCarnival 设计师模板，实现专业级可编辑 PPTX 输出。AI 根据每页内容从版式组件库中选择最合适的布局。

## 二、核心决策

| 项 | 决策 |
|---|------|
| PPT 引擎 | pptx-automizer（替代 pptxgenjs 渲染，pptxgenjs 保留为依赖） |
| 模板来源 | SlidesCarnival（CC BY 4.0），署名放在应用"关于"页 |
| 初始规模 | 4 套模板包 × 8-10 种版式 ≈ 32-40 个版式组件 |
| AI 角色 | 每页输出 layout 字段，从组件库中选择版式 |
| 图片尺寸 | 根据版式位置动态指定（横向 16:9 / 竖向 2:3） |
| 可配置性 | 版式注册到 Preset 表，管理员可维护 |
| 兼容性 | 模板保留渐变/阴影/样式，不使用动画 |

## 三、模板组件库架构

### 3.1 文件结构

```
app/templates/slideshow/
├── tech-blue/                    # 科技蓝主题
│   ├── template.pptx            # SlidesCarnival 原始模板
│   └── manifest.json            # 版式索引
├── nature-green/                 # 自然绿主题
│   ├── template.pptx
│   └── manifest.json
├── creative-orange/              # 创意橙主题
│   ├── template.pptx
│   └── manifest.json
├── minimal-white/                # 简约白主题
│   ├── template.pptx
│   └── manifest.json
└── root.pptx                    # 空白根模板（提供基础 slide master）
```

### 3.2 manifest.json 结构

```json
{
  "name": "科技蓝",
  "source": "SlidesCarnival",
  "license": "CC-BY-4.0",
  "layouts": {
    "cover_fullimage": {
      "slideIndex": 1,
      "description": "全屏背景图 + 半透明遮罩 + 居中大标题",
      "placeholders": {
        "title": "TitleShape",
        "subtitle": "SubtitleShape",
        "image": "BackgroundImage"
      },
      "imageOrientation": "landscape"
    },
    "content_text_only": {
      "slideIndex": 3,
      "description": "标题 + 正文/要点列表，无图片",
      "placeholders": {
        "title": "TitleShape",
        "body": "BodyShape"
      }
    },
    "content_image_right": {
      "slideIndex": 5,
      "description": "左侧文字 + 右侧竖向图片",
      "placeholders": {
        "title": "TitleShape",
        "body": "BodyShape",
        "image": "ImageShape"
      },
      "imageOrientation": "portrait"
    },
    "content_image_bottom": {
      "slideIndex": 6,
      "description": "上方标题/文字 + 下方横向图片",
      "placeholders": {
        "title": "TitleShape",
        "body": "BodyShape",
        "image": "ImageShape"
      },
      "imageOrientation": "landscape"
    }
  }
}
```

### 3.3 Preset 表注册

```
category = "slideshow_layout"
name     = "tech-blue/cover_fullimage"
value    = JSON.stringify({
  label: "封面 — 全屏背景图",
  themeKey: "科技蓝",
  type: "cover",
  templateDir: "tech-blue",
  slideIndex: 1,
  placeholders: { ... },
  imageOrientation: "landscape",
  description: "全屏背景图 + 半透明遮罩 + 居中大标题"
})
```

## 四、AI 输出格式升级

Slide 类型新增 `layout` 字段：

```typescript
interface Slide {
  type: SlideType;
  layout: string;              // 版式 key，如 "cover_fullimage"
  title: string;
  subtitle?: string | null;
  body?: string | null;
  bullets?: string[] | null;
  imagePrompt?: string | null;
  imageUrl?: string | null;
  notes?: string | null;
}
```

AI 在 Prompt 中获得可用版式列表和描述，每页选择最合适的 layout。

## 五、图片尺寸优化

根据版式的 `imageOrientation` 指定生成尺寸：

| imageOrientation | 生成尺寸 | 用途 |
|-----------------|----------|------|
| landscape | 1792x1024（16:9） | 封面全屏、底部横图 |
| portrait | 1024x1536（2:3） | 右侧竖图 |
| square | 1024x1024（1:1） | 方形插图 |
| 无图片 | 不生成 | 纯文字版式 |

## 六、pptx-builder 重写

从 pptxgenjs 渲染替换为 pptx-automizer 模板组装：

```typescript
async function buildPptx(output, themeKey, meta) {
  // 1. 读取主题对应的 manifest.json
  // 2. 初始化 pptx-automizer
  // 3. 遍历 slides：
  //    - 根据 layout 查找模板 slideIndex
  //    - addSlide(templateName, slideIndex, callback)
  //    - callback 中替换 placeholders（文字 + 图片）
  // 4. 输出 Buffer
}
```

## 七、任务拆解

### Phase 0：依赖 + 模板下载（1 个任务）
- P0.1 安装 pptx-automizer + 下载 4 套 SlidesCarnival 模板 + 制作 manifest.json

### Phase 1：版式组件注册（1 个任务）
- P1.1 seed-baselines.ts 新增 slideshow_layout Preset + 动作注册更新

### Phase 2：AI 输出格式升级（1 个任务）
- P2.1 Slide 类型新增 layout 字段 + generate_slideshow 模板注入版式列表 + 课件基线更新

### Phase 3：pptx-builder 重写（1 个任务）
- P3.1 用 pptx-automizer 替代 pptxgenjs 渲染，读取 manifest + 模板组装

### Phase 4：图片尺寸优化（1 个任务）
- P4.1 image-processor 根据版式 imageOrientation 指定生成尺寸

### Phase 5：前端 + 署名（1 个任务）
- P5.1 SlideshowWorkspace 主题选择关联模板包 + "关于"页新增 CC BY 4.0 署名

### Phase 6：测试（1 个任务）
- P6.1 pptx-builder 重写后测试 + API 测试更新 + 现有测试无回归

共 7 个子任务，7 个 Phase。
