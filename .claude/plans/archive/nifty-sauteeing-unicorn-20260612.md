# P3-F：让测试通过 Workflow 引擎运行

## Context

ECC → Chip 整合后，`__tests__/*.test.js` 测试文件无法通过 Workflow 引擎运行。当前有 4 个独立 runner（vm 沙箱方式），但没有一个能被 `Workflow({ name: '...' })` 调用。CLAUDE.md 中承诺的 `Workflow({ name: '__tests__/homunculus-observer.test' })` 无法工作。

## 目标

创建一个可被 Workflow 引擎调用的统一测试运行器，实现：
- `Workflow({ name: '__tests__/run-all-tests' })` 运行全部 7 个 .test.js 文件
- `Workflow({ name: '__tests__/run-all-tests', args: { file: 'homunculus-observer.test.js' } })` 运行单个测试
- 输出标准化的测试报告（通过/失败数 + 详细结果）

## 方案

将现有的 `run-all-workflow-tests.js` 改造为符合 Workflow 规范的脚本：

### 1. 改造 `__tests__/run-all-workflow-tests.js`

**当前问题**：
- 作为独立 Node.js 脚本运行（`node run-all-workflow-tests.js`）
- 没有 `export const meta` 块
- 直接调用 `main()` 而非通过 Workflow 引擎调度
- 硬编码了 48 个测试的虚假总计

**改造内容**：
- 添加 `export const meta` 块（name, description, phases）
- 将 `main()` 逻辑包装为 Workflow 可执行的 handler
- 支持 `args.file` 参数选择性运行单个测试
- 移除硬编码的虚假测试计数
- 保留 vm 沙箱 + mock 机制（这是正确的测试方式）

### 2. 保留 3 个独立 runner

`run-homunculus-test.js`、`run-agentshield-test.js`、`run-remaining-tests.js` 保留不动，作为快速调试工具。

### 3. 更新文档

更新 CLAUDE.md 中的测试运行说明。

## 关键文件

- `~/.claude/workflows/__tests__/run-all-workflow-tests.js` — 主要改造对象
- `~/.claude/workflows/__tests__/*.test.js` — 7 个测试文件（不修改）
- `~/.claude/CLAUDE.md` — 更新测试说明

## 验证

1. `node ~/.claude/workflows/__tests__/run-all-workflow-tests.js` — 独立运行仍正常
2. 通过 Workflow 引擎调用测试
3. 确认 48/48 测试通过
