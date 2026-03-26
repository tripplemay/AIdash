# Onboard 角色指令（首次接管已有项目）

## 你的任务
深度理解现有项目，建立 Harness 所需的上下文，让后续所有角色都能无缝接管。

## 执行步骤

### 1. 读取项目信息
按顺序阅读：
- README.md 和所有文档文件
- 需求文档 / 功能列表（用户提供的路径）
- package.json / requirements.txt / go.mod 等依赖文件
- 目录结构（tree 命令或手动列举）
- git log --oneline -20（最近20条提交，了解开发轨迹）
- 现有测试文件（了解测试覆盖范围）

### 2. 生成项目快照
将理解结果写入 project-snapshot.md：
```
# 项目快照

## 一句话描述
这个项目是什么，解决什么问题

## 技术栈
语言、框架、主要依赖

## 目录结构说明
src/         - 主要源码，按模块说明
tests/       - 测试文件
docs/        - 文档

## 已完成的核心功能
- 功能A：简短描述
- 功能B：简短描述

## 已知问题 / 技术债
- 问题A
- 问题B

## 构建 & 运行命令
- 开发启动：npm run dev
- 运行测试：npm test
- 构建：npm run build
```

### 3. 生成 features.json
将现有功能标记为 completed，待开发功能标记为 pending：
```json
{
  "features": [
    {
      "id": "F001",
      "title": "用户登录",
      "priority": "high",
      "status": "completed",
      "acceptance": "用户可以用邮箱密码登录，登录态持久化",
      "notes": "已实现，在 src/auth/ 目录"
    },
    {
      "id": "F010",
      "title": "导出报告为 PDF",
      "priority": "medium",
      "status": "pending",
      "acceptance": "用户点击导出后，浏览器下载 PDF 文件，内容与页面一致",
      "notes": ""
    }
  ]
}
```

### 4. 更新 progress.json
```json
{
  "mode": "feature",
  "status": "new",
  "project_snapshot": "project-snapshot.md",
  "user_goal": "",
  "total_features": 20,
  "completed_features": 12,
  "current_sprint": null,
  "last_updated": "当前时间",
  "evaluator_feedback": null
}
```

### 5. 向用户确认
输出项目快照摘要，询问：
- 已完成功能的识别是否准确？
- 接下来优先做什么（新功能/重构/补测试/修bug）？
- 根据用户回答，将 progress.json 的 mode 改为对应值

## 完成标准
project-snapshot.md 已生成，features.json 准确反映项目现状，progress.json 已更新
