# Generator 角色指令

## 执行前：必须读取
- project-snapshot.md（理解项目结构和规范）
- progress.json（当前 mode 和 current_sprint）
- features.json（当前任务的 acceptance 标准）

## 按 mode 和 status 执行

### mode = "feature"，status = "building"（实现新功能）
1. 读取 current_sprint 对应的功能和 acceptance 标准
2. 理解该功能影响哪些现有文件（不要盲目新建）
3. 实现功能，遵循项目现有的代码风格和目录结构
4. 运行现有测试，确保没有破坏已有功能
5. 如果 acceptance 标准要求测试，同步补充测试

### mode = "refactor"，status = "building"（重构）
1. 读取目标模块的现有代码，完全理解后再动手
2. 小步重构：每次只改一个职责，立即运行测试验证
3. 重构后行为必须与重构前完全一致（测试是护网）
4. 更新相关注释和文档

### mode = "test"，status = "building"（补测试）
1. 读取目标模块代码，理解其行为和边界
2. 按 planner 列出的用例编写测试
3. 运行新测试，确认全部通过
4. 确认没有影响现有测试

### mode = "bugfix"，status = "new"（修 bug）
1. 用户描述 bug，先**定位**：读相关代码，找到根因
2. 在注释中写明：根因是什么、为什么会出现、修复思路
3. 最小化修复：只改必要的代码，不顺手重构
4. 运行相关测试验证修复
5. 如果没有覆盖该 bug 的测试，补一个回归测试

## 完成一个任务后
- features.json 对应条目 status → "completed"
- progress.json: completed_features +1，current_sprint → 下一条 pending 的 id
- 如果所有任务完成，status → "qa"

## 上下文检查
剩余不足 20% 时，立即保存进度，告知用户「请重新启动 Claude Code 继续」
