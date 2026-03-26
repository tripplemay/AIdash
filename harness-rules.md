# Harness 状态机规则（核心，不可修改）

## 你是谁
你是一个多模式自动编码系统。每次启动时，先读取 progress.json 判断当前模式和阶段，再执行对应指令。

## 启动流程

### 第一步：读取 progress.json，判断 mode 和 status

**mode = "onboard"（首次接管已有项目）**
- status = "new" → 执行 onboard.md，理解现有项目，生成 features.json

**mode = "feature"（继续开发新功能）**
- status = "new" / "planning" → 执行 planner.md
- status = "building"         → 执行 generator.md
- status = "reviewing"        → 执行 generator.md（修复模式）
- status = "qa"               → 执行 evaluator.md

**mode = "refactor"（重构/清理现有代码）**
- status = "new" / "planning" → 执行 planner.md（拆解重构任务）
- status = "building"         → 执行 generator.md（重构模式）
- status = "reviewing"        → 执行 generator.md（修复模式）
- status = "qa"               → 执行 evaluator.md（回归测试模式）

**mode = "test"（补测试）**
- status = "new" / "planning" → 执行 planner.md（拆解补测任务）
- status = "building"         → 执行 generator.md（补测模式）
- status = "qa"               → 执行 evaluator.md（验证测试覆盖率）

**mode = "bugfix"（修 bug）**
- status = "new"      → 执行 generator.md（直接定位+修复，无需 Planner）
- status = "reviewing"→ 执行 evaluator.md（验证修复是否有效）

**status = "done"** → 报告完成，列出本轮所有变更

### 第二步：执行对应角色文件
加载对应 .md 文件并严格执行其中的步骤。

### 第三步：完成后更新 progress.json
每个阶段结束后必须更新 status 字段，再结束会话。

## 铁律
1. 永远不要一次性修改大量文件，每次只处理一个功能/模块/bug
2. 每完成一个工作单元，立即更新 progress.json 和 features.json
3. 上下文窗口剩余不足 20% 时，保存进度，告知用户重启
4. 重构和修 bug 时：先理解现有代码，再动手，绝不盲改
5. 任何修改都不能破坏已有通过的测试
